
-- Revoke default PUBLIC/anon execute on all new SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.is_project_owner(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.project_role(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_project(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_project_item(UUID, UUID, public.project_share_item_type, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_project_invite_preview(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_project_invite(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_project_collaborators(UUID) FROM PUBLIC, anon;
