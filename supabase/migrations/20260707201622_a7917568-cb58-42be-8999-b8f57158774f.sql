
ALTER TABLE public.project_collaborators
  ADD COLUMN IF NOT EXISTS can_create_subprojects boolean NOT NULL DEFAULT true;

ALTER TABLE public.project_invites
  ADD COLUMN IF NOT EXISTS can_create_subprojects boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION private.can_add_subproject(_user_id uuid, _parent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
  SELECT
    private.is_project_owner(_user_id, _parent_id)
    OR EXISTS (
      SELECT 1
      FROM public.project_collaborators pc
      WHERE pc.project_id = public.project_root(_parent_id)
        AND pc.user_id = _user_id
        AND pc.role = 'editor'
        AND pc.can_create_subprojects = true
    )
$function$;

DROP POLICY IF EXISTS "Users manage own project templates" ON public.project_templates;
DROP POLICY IF EXISTS "Collaborators view shared project" ON public.project_templates;

CREATE POLICY "View accessible project subtree"
  ON public.project_templates
  FOR SELECT
  TO authenticated
  USING (public.project_role(auth.uid(), id) IS NOT NULL);

CREATE POLICY "Create own or permitted subprojects"
  ON public.project_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      parent_id IS NULL
      OR private.can_add_subproject(auth.uid(), parent_id)
    )
  );

CREATE POLICY "Update accessible projects"
  ON public.project_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR private.is_project_owner(auth.uid(), id))
  WITH CHECK (auth.uid() = user_id OR private.is_project_owner(auth.uid(), id));

CREATE POLICY "Delete accessible projects"
  ON public.project_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR private.is_project_owner(auth.uid(), id));

DROP FUNCTION IF EXISTS public.list_project_collaborators(uuid);
CREATE OR REPLACE FUNCTION public.list_project_collaborators(_project_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, role text, scope text, can_create_subprojects boolean, display_name text, email text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT pc.id, pc.user_id, pc.role::text, pc.scope::text, pc.can_create_subprojects,
         COALESCE(pr.display_name, split_part(pr.email, '@', 1)),
         pr.email,
         pc.created_at
  FROM public.project_collaborators pc
  LEFT JOIN public.profiles pr ON pr.user_id = pc.user_id
  WHERE pc.project_id = _project_id
    AND public.is_project_owner(auth.uid(), _project_id)
  ORDER BY pc.created_at ASC
$function$;

CREATE OR REPLACE FUNCTION public.accept_project_invite(_token text)
 RETURNS TABLE(project_id uuid, role text, scope text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  INSERT INTO public.project_collaborators (project_id, user_id, role, scope, invited_by, can_create_subprojects)
  VALUES (inv.project_id, uid, inv.role, inv.scope, inv.created_by, COALESCE(inv.can_create_subprojects, true))
  ON CONFLICT (project_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        scope = EXCLUDED.scope,
        can_create_subprojects = EXCLUDED.can_create_subprojects;

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
$function$;
