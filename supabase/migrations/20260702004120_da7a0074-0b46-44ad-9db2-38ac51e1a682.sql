
-- Internal RLS helpers: only the DB should invoke them (they run inside policies as SECURITY DEFINER)
REVOKE EXECUTE ON FUNCTION public.is_project_owner(UUID, UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.project_role(UUID, UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.can_edit_project(UUID, UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.can_view_project_item(UUID, UUID, public.project_share_item_type, UUID) FROM authenticated;
