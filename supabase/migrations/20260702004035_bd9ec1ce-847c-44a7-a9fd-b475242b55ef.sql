
-- Enums
CREATE TYPE public.project_share_role AS ENUM ('editor', 'viewer');
CREATE TYPE public.project_share_scope AS ENUM ('all', 'selected');
CREATE TYPE public.project_share_item_type AS ENUM ('task', 'note');

-- Collaborators
CREATE TABLE public.project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.project_share_role NOT NULL DEFAULT 'editor',
  scope public.project_share_scope NOT NULL DEFAULT 'all',
  invited_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
CREATE INDEX idx_project_collaborators_user ON public.project_collaborators(user_id);
CREATE INDEX idx_project_collaborators_project ON public.project_collaborators(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_collaborators TO authenticated;
GRANT ALL ON public.project_collaborators TO service_role;
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_collaborators REPLICA IDENTITY FULL;

-- Shared item selections (only used when scope='selected')
CREATE TABLE public.project_shared_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  collaborator_user_id UUID NOT NULL,
  item_type public.project_share_item_type NOT NULL,
  item_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, collaborator_user_id, item_type, item_id)
);
CREATE INDEX idx_shared_items_lookup ON public.project_shared_items(collaborator_user_id, project_id, item_type, item_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_shared_items TO authenticated;
GRANT ALL ON public.project_shared_items TO service_role;
ALTER TABLE public.project_shared_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_shared_items REPLICA IDENTITY FULL;

-- Invite links
CREATE TABLE public.project_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  role public.project_share_role NOT NULL,
  scope public.project_share_scope NOT NULL,
  item_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  revoked_at TIMESTAMPTZ,
  accepted_by UUID,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_invites_project ON public.project_invites(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_invites TO authenticated;
GRANT ALL ON public.project_invites TO service_role;
ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_project_owner(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.project_templates WHERE id = _project_id AND user_id = _user_id) $$;

CREATE OR REPLACE FUNCTION public.project_role(_user_id UUID, _project_id UUID)
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.project_templates WHERE id = _project_id AND user_id = _user_id) THEN 'owner'
    ELSE (SELECT role::text FROM public.project_collaborators WHERE project_id = _project_id AND user_id = _user_id LIMIT 1)
  END
$$;

CREATE OR REPLACE FUNCTION public.can_edit_project(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.project_role(_user_id, _project_id) IN ('owner', 'editor') $$;

CREATE OR REPLACE FUNCTION public.can_view_project_item(_user_id UUID, _project_id UUID, _item_type public.project_share_item_type, _item_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_project_owner(_user_id, _project_id)
    OR EXISTS (
      SELECT 1 FROM public.project_collaborators pc
      WHERE pc.project_id = _project_id AND pc.user_id = _user_id
        AND (pc.scope = 'all' OR EXISTS (
          SELECT 1 FROM public.project_shared_items si
          WHERE si.project_id = _project_id
            AND si.collaborator_user_id = _user_id
            AND si.item_type = _item_type
            AND si.item_id = _item_id
        ))
    )
$$;

-- Extend RLS on existing tables (owner policy already exists)

-- project_templates
CREATE POLICY "Collaborators view shared project" ON public.project_templates
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = id AND pc.user_id = auth.uid()));

-- project_tasks (scaffolding tasks – always shared with any collaborator on the project)
CREATE POLICY "Collaborators view project_tasks" ON public.project_tasks
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_tasks.project_id AND pc.user_id = auth.uid()));
CREATE POLICY "Editors insert project_tasks" ON public.project_tasks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_edit_project(auth.uid(), project_id));
CREATE POLICY "Editors update project_tasks" ON public.project_tasks
  FOR UPDATE TO authenticated
  USING (public.can_edit_project(auth.uid(), project_id))
  WITH CHECK (public.can_edit_project(auth.uid(), project_id));
CREATE POLICY "Editors delete project_tasks" ON public.project_tasks
  FOR DELETE TO authenticated
  USING (public.can_edit_project(auth.uid(), project_id));

-- tasks (matrix tasks tied to project)
CREATE POLICY "Collaborators view shared tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (project_id IS NOT NULL AND public.can_view_project_item(auth.uid(), project_id, 'task', id));
CREATE POLICY "Editors insert tasks in shared project" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND project_id IS NOT NULL AND public.can_edit_project(auth.uid(), project_id));
CREATE POLICY "Editors update shared tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (project_id IS NOT NULL AND public.can_view_project_item(auth.uid(), project_id, 'task', id) AND public.can_edit_project(auth.uid(), project_id))
  WITH CHECK (project_id IS NOT NULL AND public.can_edit_project(auth.uid(), project_id));
CREATE POLICY "Editors delete shared tasks" ON public.tasks
  FOR DELETE TO authenticated
  USING (project_id IS NOT NULL AND public.can_view_project_item(auth.uid(), project_id, 'task', id) AND public.can_edit_project(auth.uid(), project_id));

-- notes
CREATE POLICY "Collaborators view shared notes" ON public.notes
  FOR SELECT TO authenticated
  USING (project_id IS NOT NULL AND public.can_view_project_item(auth.uid(), project_id, 'note', id));
CREATE POLICY "Editors insert notes in shared project" ON public.notes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND project_id IS NOT NULL AND public.can_edit_project(auth.uid(), project_id));
CREATE POLICY "Editors update shared notes" ON public.notes
  FOR UPDATE TO authenticated
  USING (project_id IS NOT NULL AND public.can_view_project_item(auth.uid(), project_id, 'note', id) AND public.can_edit_project(auth.uid(), project_id))
  WITH CHECK (project_id IS NOT NULL AND public.can_edit_project(auth.uid(), project_id));
CREATE POLICY "Editors delete shared notes" ON public.notes
  FOR DELETE TO authenticated
  USING (project_id IS NOT NULL AND public.can_view_project_item(auth.uid(), project_id, 'note', id) AND public.can_edit_project(auth.uid(), project_id));

-- project_collaborators policies
CREATE POLICY "Owner manages collaborators" ON public.project_collaborators
  FOR ALL TO authenticated
  USING (public.is_project_owner(auth.uid(), project_id))
  WITH CHECK (public.is_project_owner(auth.uid(), project_id));
CREATE POLICY "Collaborator sees own row" ON public.project_collaborators
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- project_shared_items policies
CREATE POLICY "Owner manages shared items" ON public.project_shared_items
  FOR ALL TO authenticated
  USING (public.is_project_owner(auth.uid(), project_id))
  WITH CHECK (public.is_project_owner(auth.uid(), project_id));
CREATE POLICY "Collaborator sees own shared items" ON public.project_shared_items
  FOR SELECT TO authenticated
  USING (auth.uid() = collaborator_user_id);

-- project_invites policies (owner-only; recipients use RPCs)
CREATE POLICY "Owner manages invites" ON public.project_invites
  FOR ALL TO authenticated
  USING (public.is_project_owner(auth.uid(), project_id))
  WITH CHECK (public.is_project_owner(auth.uid(), project_id));

-- Invite preview + accept RPCs
CREATE OR REPLACE FUNCTION public.get_project_invite_preview(_token TEXT)
RETURNS TABLE (project_id UUID, project_name TEXT, role TEXT, scope TEXT, inviter_name TEXT, expires_at TIMESTAMPTZ, revoked BOOLEAN, already_owner BOOLEAN, already_member BOOLEAN)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    inv.project_id,
    pt.name,
    inv.role::text,
    inv.scope::text,
    COALESCE(pr.display_name, pr.email, 'Someone'),
    inv.expires_at,
    (inv.revoked_at IS NOT NULL OR inv.expires_at < now()),
    (pt.user_id = auth.uid()),
    EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = inv.project_id AND pc.user_id = auth.uid())
  FROM public.project_invites inv
  JOIN public.project_templates pt ON pt.id = inv.project_id
  LEFT JOIN public.profiles pr ON pr.user_id = inv.created_by
  WHERE inv.token = _token
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_project_invite_preview(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_project_invite(_token TEXT)
RETURNS TABLE (project_id UUID, role TEXT, scope TEXT)
LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv public.project_invites;
  uid UUID := auth.uid();
  raw JSONB;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'must be signed in'; END IF;
  SELECT * INTO inv FROM public.project_invites WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invite not found'; END IF;
  IF inv.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'invite revoked'; END IF;
  IF inv.expires_at < now() THEN RAISE EXCEPTION 'invite expired'; END IF;
  IF EXISTS (SELECT 1 FROM public.project_templates WHERE id = inv.project_id AND user_id = uid) THEN
    RAISE EXCEPTION 'you already own this project';
  END IF;

  INSERT INTO public.project_collaborators (project_id, user_id, role, scope, invited_by)
  VALUES (inv.project_id, uid, inv.role, inv.scope, inv.created_by)
  ON CONFLICT (project_id, user_id) DO UPDATE
    SET role = EXCLUDED.role, scope = EXCLUDED.scope;

  IF inv.scope = 'selected' THEN
    DELETE FROM public.project_shared_items WHERE project_id = inv.project_id AND collaborator_user_id = uid;
    FOR raw IN SELECT * FROM jsonb_array_elements(inv.item_ids) LOOP
      INSERT INTO public.project_shared_items (project_id, collaborator_user_id, item_type, item_id)
      VALUES (
        inv.project_id, uid,
        (raw->>'type')::public.project_share_item_type,
        (raw->>'id')::UUID
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  IF inv.accepted_by IS NULL THEN
    UPDATE public.project_invites SET accepted_by = uid, accepted_at = now() WHERE id = inv.id;
  END IF;

  RETURN QUERY SELECT inv.project_id, inv.role::text, inv.scope::text;
END;
$$;
GRANT EXECUTE ON FUNCTION public.accept_project_invite(TEXT) TO authenticated;

-- Collaborator listing RPC (owner-only) so we can join profiles for display
CREATE OR REPLACE FUNCTION public.list_project_collaborators(_project_id UUID)
RETURNS TABLE (id UUID, user_id UUID, role TEXT, scope TEXT, display_name TEXT, email TEXT, created_at TIMESTAMPTZ)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pc.id, pc.user_id, pc.role::text, pc.scope::text,
         COALESCE(pr.display_name, split_part(pr.email, '@', 1)),
         pr.email,
         pc.created_at
  FROM public.project_collaborators pc
  LEFT JOIN public.profiles pr ON pr.user_id = pc.user_id
  WHERE pc.project_id = _project_id
    AND public.is_project_owner(auth.uid(), _project_id)
  ORDER BY pc.created_at ASC
$$;
GRANT EXECUTE ON FUNCTION public.list_project_collaborators(UUID) TO authenticated;

-- Realtime publication additions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'project_collaborators') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_collaborators;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'project_shared_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_shared_items;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tasks') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
END $$;

-- Ensure REPLICA IDENTITY FULL for tables that will emit UPDATEs collaborators need to react to
ALTER TABLE public.notes REPLICA IDENTITY FULL;
ALTER TABLE public.project_templates REPLICA IDENTITY FULL;
ALTER TABLE public.project_tasks REPLICA IDENTITY FULL;
