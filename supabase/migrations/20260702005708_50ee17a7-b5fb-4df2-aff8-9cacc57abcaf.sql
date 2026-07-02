CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE OR REPLACE FUNCTION private.is_project_owner(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_templates
    WHERE id = _project_id
      AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION private.project_role(_user_id uuid, _project_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.project_templates
      WHERE id = _project_id
        AND user_id = _user_id
    ) THEN 'owner'
    ELSE (
      SELECT role::text
      FROM public.project_collaborators
      WHERE project_id = _project_id
        AND user_id = _user_id
      LIMIT 1
    )
  END
$$;

CREATE OR REPLACE FUNCTION private.can_edit_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
  SELECT private.project_role(_user_id, _project_id) IN ('owner', 'editor')
$$;

CREATE OR REPLACE FUNCTION private.can_view_project_item(_user_id uuid, _project_id uuid, _item_type public.project_share_item_type, _item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
  SELECT
    private.is_project_owner(_user_id, _project_id)
    OR EXISTS (
      SELECT 1
      FROM public.project_collaborators pc
      WHERE pc.project_id = _project_id
        AND pc.user_id = _user_id
        AND (
          pc.scope = 'all'
          OR EXISTS (
            SELECT 1
            FROM public.project_shared_items si
            WHERE si.project_id = _project_id
              AND si.collaborator_user_id = _user_id
              AND si.item_type = _item_type
              AND si.item_id = _item_id
          )
        )
    )
$$;

GRANT EXECUTE ON FUNCTION private.is_project_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.project_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_edit_project(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_project_item(uuid, uuid, public.project_share_item_type, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_project_owner(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private.project_role(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private.can_edit_project(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private.can_view_project_item(uuid, uuid, public.project_share_item_type, uuid) TO service_role;

DROP POLICY IF EXISTS "Collaborators view shared project" ON public.project_templates;
CREATE POLICY "Collaborators view shared project"
ON public.project_templates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.project_collaborators pc
    WHERE pc.project_id = project_templates.id
      AND pc.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owner manages collaborators" ON public.project_collaborators;
CREATE POLICY "Owner manages collaborators"
ON public.project_collaborators
FOR ALL
TO authenticated
USING (private.is_project_owner(auth.uid(), project_id))
WITH CHECK (private.is_project_owner(auth.uid(), project_id));

DROP POLICY IF EXISTS "Owner manages shared items" ON public.project_shared_items;
CREATE POLICY "Owner manages shared items"
ON public.project_shared_items
FOR ALL
TO authenticated
USING (private.is_project_owner(auth.uid(), project_id))
WITH CHECK (private.is_project_owner(auth.uid(), project_id));

DROP POLICY IF EXISTS "Owner manages invites" ON public.project_invites;
CREATE POLICY "Owner manages invites"
ON public.project_invites
FOR ALL
TO authenticated
USING (private.is_project_owner(auth.uid(), project_id))
WITH CHECK (private.is_project_owner(auth.uid(), project_id));

DROP POLICY IF EXISTS "Collaborators view project_tasks" ON public.project_tasks;
CREATE POLICY "Collaborators view project_tasks"
ON public.project_tasks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.project_collaborators pc
    WHERE pc.project_id = project_tasks.project_id
      AND pc.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Editors delete project_tasks" ON public.project_tasks;
CREATE POLICY "Editors delete project_tasks"
ON public.project_tasks
FOR DELETE
TO authenticated
USING (private.can_edit_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Editors insert project_tasks" ON public.project_tasks;
CREATE POLICY "Editors insert project_tasks"
ON public.project_tasks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND private.can_edit_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Editors update project_tasks" ON public.project_tasks;
CREATE POLICY "Editors update project_tasks"
ON public.project_tasks
FOR UPDATE
TO authenticated
USING (private.can_edit_project(auth.uid(), project_id))
WITH CHECK (private.can_edit_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Collaborators view shared tasks" ON public.tasks;
CREATE POLICY "Collaborators view shared tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (project_id IS NOT NULL AND private.can_view_project_item(auth.uid(), project_id, 'task'::public.project_share_item_type, id));

DROP POLICY IF EXISTS "Editors delete shared tasks" ON public.tasks;
CREATE POLICY "Editors delete shared tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (project_id IS NOT NULL AND private.can_view_project_item(auth.uid(), project_id, 'task'::public.project_share_item_type, id) AND private.can_edit_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Editors insert tasks in shared project" ON public.tasks;
CREATE POLICY "Editors insert tasks in shared project"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND project_id IS NOT NULL AND private.can_edit_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Editors update shared tasks" ON public.tasks;
CREATE POLICY "Editors update shared tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (project_id IS NOT NULL AND private.can_view_project_item(auth.uid(), project_id, 'task'::public.project_share_item_type, id) AND private.can_edit_project(auth.uid(), project_id))
WITH CHECK (project_id IS NOT NULL AND private.can_edit_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Collaborators view shared notes" ON public.notes;
CREATE POLICY "Collaborators view shared notes"
ON public.notes
FOR SELECT
TO authenticated
USING (project_id IS NOT NULL AND private.can_view_project_item(auth.uid(), project_id, 'note'::public.project_share_item_type, id));

DROP POLICY IF EXISTS "Editors delete shared notes" ON public.notes;
CREATE POLICY "Editors delete shared notes"
ON public.notes
FOR DELETE
TO authenticated
USING (project_id IS NOT NULL AND private.can_view_project_item(auth.uid(), project_id, 'note'::public.project_share_item_type, id) AND private.can_edit_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Editors insert notes in shared project" ON public.notes;
CREATE POLICY "Editors insert notes in shared project"
ON public.notes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND project_id IS NOT NULL AND private.can_edit_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Editors update shared notes" ON public.notes;
CREATE POLICY "Editors update shared notes"
ON public.notes
FOR UPDATE
TO authenticated
USING (project_id IS NOT NULL AND private.can_view_project_item(auth.uid(), project_id, 'note'::public.project_share_item_type, id) AND private.can_edit_project(auth.uid(), project_id))
WITH CHECK (project_id IS NOT NULL AND private.can_edit_project(auth.uid(), project_id));

REVOKE EXECUTE ON FUNCTION public.is_project_owner(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.project_role(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.can_edit_project(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.can_view_project_item(uuid, uuid, public.project_share_item_type, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_project_owner(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.project_role(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_edit_project(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_view_project_item(uuid, uuid, public.project_share_item_type, uuid) FROM PUBLIC;

REVOKE ALL ON public.tasks FROM anon;
REVOKE ALL ON public.notes FROM anon;
REVOKE ALL ON public.project_tasks FROM anon;
REVOKE ALL ON public.project_templates FROM anon;
REVOKE ALL ON public.project_collaborators FROM anon;
REVOKE ALL ON public.project_shared_items FROM anon;
REVOKE ALL ON public.project_invites FROM anon;