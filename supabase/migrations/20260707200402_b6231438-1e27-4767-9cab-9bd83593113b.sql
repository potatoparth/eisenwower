
REVOKE EXECUTE ON FUNCTION public.project_descendants(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.project_ancestors(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.project_root(uuid) FROM PUBLIC, anon;
