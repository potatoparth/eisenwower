DROP FUNCTION IF EXISTS public.accept_project_invite(text);

CREATE OR REPLACE FUNCTION public.accept_project_invite(_token text)
 RETURNS TABLE(out_project_id uuid, out_role text, out_scope text)
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
  IF EXISTS (SELECT 1 FROM public.project_templates pt WHERE pt.id = inv.project_id AND pt.user_id = uid) THEN
    RAISE EXCEPTION 'you already own this project';
  END IF;

  INSERT INTO public.project_collaborators (project_id, user_id, role, scope, invited_by, can_create_subprojects)
  VALUES (inv.project_id, uid, inv.role, inv.scope, inv.created_by, COALESCE(inv.can_create_subprojects, true))
  ON CONFLICT (project_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        scope = EXCLUDED.scope,
        can_create_subprojects = EXCLUDED.can_create_subprojects;

  IF inv.scope = 'selected' THEN
    DELETE FROM public.project_shared_items psi
      WHERE psi.project_id = inv.project_id AND psi.collaborator_user_id = uid;
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
    UPDATE public.project_invites pi SET accepted_by = uid, accepted_at = now() WHERE pi.id = inv.id;
  END IF;

  out_project_id := inv.project_id;
  out_role := inv.role::text;
  out_scope := inv.scope::text;
  RETURN NEXT;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.accept_project_invite(text) TO authenticated;