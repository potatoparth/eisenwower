GRANT EXECUTE ON FUNCTION public.is_project_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.project_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_project(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_project_item(uuid, uuid, public.project_share_item_type, uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_project_owner(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.project_role(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_edit_project(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_view_project_item(uuid, uuid, public.project_share_item_type, uuid) TO service_role;