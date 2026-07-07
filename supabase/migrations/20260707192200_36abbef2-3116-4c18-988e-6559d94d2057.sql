
-- =========================================================================
-- 1. Schema: parent_id + sort_order on project_templates
-- =========================================================================
ALTER TABLE public.project_templates
  ADD COLUMN IF NOT EXISTS parent_id UUID NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_project_templates_parent_id ON public.project_templates(parent_id);

-- =========================================================================
-- 2. Tree helper functions
-- =========================================================================
CREATE OR REPLACE FUNCTION public.project_root(_node UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH RECURSIVE up AS (
    SELECT id, parent_id FROM public.project_templates WHERE id = _node
    UNION ALL
    SELECT p.id, p.parent_id FROM public.project_templates p
    JOIN up ON up.parent_id = p.id
  )
  SELECT id FROM up WHERE parent_id IS NULL LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.project_descendants(_root UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH RECURSIVE down AS (
    SELECT id FROM public.project_templates WHERE id = _root
    UNION ALL
    SELECT p.id FROM public.project_templates p
    JOIN down ON p.parent_id = down.id
  )
  SELECT id FROM down
$$;

CREATE OR REPLACE FUNCTION public.project_ancestors(_node UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH RECURSIVE up AS (
    SELECT id, parent_id FROM public.project_templates WHERE id = _node
    UNION ALL
    SELECT p.id, p.parent_id FROM public.project_templates p
    JOIN up ON up.parent_id = p.id
  )
  SELECT id FROM up
$$;

-- =========================================================================
-- 3. Cycle prevention trigger
-- =========================================================================
CREATE OR REPLACE FUNCTION public.prevent_project_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'Project cannot be its own parent';
  END IF;
  -- Walk up from the proposed parent; if we hit NEW.id, it's a cycle.
  IF EXISTS (
    WITH RECURSIVE up AS (
      SELECT id, parent_id FROM public.project_templates WHERE id = NEW.parent_id
      UNION ALL
      SELECT p.id, p.parent_id FROM public.project_templates p
      JOIN up ON up.parent_id = p.id
    )
    SELECT 1 FROM up WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Project hierarchy cycle detected';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_templates_prevent_cycle ON public.project_templates;
CREATE TRIGGER project_templates_prevent_cycle
  BEFORE INSERT OR UPDATE OF parent_id ON public.project_templates
  FOR EACH ROW EXECUTE FUNCTION public.prevent_project_cycle();

-- =========================================================================
-- 4. Root-aware ownership / view / edit checks (private + public schemas)
-- =========================================================================
CREATE OR REPLACE FUNCTION private.is_project_owner(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_templates
    WHERE id = public.project_root(_project_id)
      AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_project_owner(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT private.is_project_owner(_user_id, _project_id)
$$;

CREATE OR REPLACE FUNCTION private.project_role(_user_id UUID, _project_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.project_templates
      WHERE id = public.project_root(_project_id) AND user_id = _user_id
    ) THEN 'owner'
    ELSE (
      SELECT role::text FROM public.project_collaborators
      WHERE project_id = public.project_root(_project_id) AND user_id = _user_id LIMIT 1
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.project_role(_user_id UUID, _project_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
  SELECT private.project_role(_user_id, _project_id)
$$;

CREATE OR REPLACE FUNCTION private.can_edit_project(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
  SELECT private.project_role(_user_id, _project_id) IN ('owner', 'editor')
$$;

CREATE OR REPLACE FUNCTION public.can_edit_project(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
  SELECT private.can_edit_project(_user_id, _project_id)
$$;

CREATE OR REPLACE FUNCTION private.can_view_project_item(_user_id UUID, _project_id UUID, _item_type project_share_item_type, _item_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
  SELECT
    private.is_project_owner(_user_id, _project_id)
    OR EXISTS (
      SELECT 1 FROM public.project_collaborators pc
      WHERE pc.project_id = public.project_root(_project_id)
        AND pc.user_id = _user_id
        AND (
          pc.scope = 'all'
          OR EXISTS (
            SELECT 1 FROM public.project_shared_items si
            WHERE si.project_id = public.project_root(_project_id)
              AND si.collaborator_user_id = _user_id
              AND si.item_type = _item_type
              AND si.item_id = _item_id
          )
        )
    )
$$;

CREATE OR REPLACE FUNCTION public.can_view_project_item(_user_id UUID, _project_id UUID, _item_type project_share_item_type, _item_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
  SELECT private.can_view_project_item(_user_id, _project_id, _item_type, _item_id)
$$;

-- =========================================================================
-- 5. Backfill: categories -> subprojects
-- =========================================================================
DO $$
DECLARE
  r RECORD;
  new_id UUID;
BEGIN
  -- Tasks with project + non-default category -> subproject under that project
  FOR r IN
    SELECT DISTINCT project_id, user_id, category
    FROM public.tasks
    WHERE project_id IS NOT NULL
      AND category IS NOT NULL
      AND category <> ''
      AND category <> 'General'
  LOOP
    SELECT id INTO new_id FROM public.project_templates
      WHERE parent_id = r.project_id AND lower(name) = lower(r.category) LIMIT 1;
    IF new_id IS NULL THEN
      INSERT INTO public.project_templates (user_id, parent_id, name)
        VALUES (r.user_id, r.project_id, r.category)
        RETURNING id INTO new_id;
    END IF;
    UPDATE public.tasks SET project_id = new_id
      WHERE project_id = r.project_id AND category = r.category AND user_id = r.user_id;
  END LOOP;

  -- Tasks with no project + non-default category -> new top-level project per (user, category)
  FOR r IN
    SELECT DISTINCT user_id, category
    FROM public.tasks
    WHERE project_id IS NULL
      AND category IS NOT NULL
      AND category <> ''
      AND category <> 'General'
  LOOP
    SELECT id INTO new_id FROM public.project_templates
      WHERE user_id = r.user_id AND parent_id IS NULL AND lower(name) = lower(r.category) LIMIT 1;
    IF new_id IS NULL THEN
      INSERT INTO public.project_templates (user_id, parent_id, name)
        VALUES (r.user_id, NULL, r.category)
        RETURNING id INTO new_id;
    END IF;
    UPDATE public.tasks SET project_id = new_id
      WHERE project_id IS NULL AND category = r.category AND user_id = r.user_id;
  END LOOP;

  -- Notes with project + non-default category
  FOR r IN
    SELECT DISTINCT project_id, user_id, category
    FROM public.notes
    WHERE project_id IS NOT NULL
      AND category IS NOT NULL
      AND category <> ''
      AND category <> 'General'
  LOOP
    SELECT id INTO new_id FROM public.project_templates
      WHERE parent_id = r.project_id AND lower(name) = lower(r.category) LIMIT 1;
    IF new_id IS NULL THEN
      INSERT INTO public.project_templates (user_id, parent_id, name)
        VALUES (r.user_id, r.project_id, r.category)
        RETURNING id INTO new_id;
    END IF;
    UPDATE public.notes SET project_id = new_id
      WHERE project_id = r.project_id AND category = r.category AND user_id = r.user_id;
  END LOOP;

  -- Notes with no project + non-default category
  FOR r IN
    SELECT DISTINCT user_id, category
    FROM public.notes
    WHERE project_id IS NULL
      AND category IS NOT NULL
      AND category <> ''
      AND category <> 'General'
  LOOP
    SELECT id INTO new_id FROM public.project_templates
      WHERE user_id = r.user_id AND parent_id IS NULL AND lower(name) = lower(r.category) LIMIT 1;
    IF new_id IS NULL THEN
      INSERT INTO public.project_templates (user_id, parent_id, name)
        VALUES (r.user_id, NULL, r.category)
        RETURNING id INTO new_id;
    END IF;
    UPDATE public.notes SET project_id = new_id
      WHERE project_id IS NULL AND category = r.category AND user_id = r.user_id;
  END LOOP;
END $$;

-- =========================================================================
-- 6. Drop category columns
-- =========================================================================
ALTER TABLE public.tasks DROP COLUMN IF EXISTS category;
ALTER TABLE public.notes DROP COLUMN IF EXISTS category;

-- =========================================================================
-- 7. Add ON DELETE SET NULL FK for tasks.project_id and notes.project_id
--    (so deleting a project doesn't delete tasks/notes)
-- =========================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_project_id_fkey'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES public.project_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notes_project_id_fkey'
  ) THEN
    ALTER TABLE public.notes
      ADD CONSTRAINT notes_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES public.project_templates(id) ON DELETE SET NULL;
  END IF;
END $$;
