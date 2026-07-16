CREATE OR REPLACE FUNCTION public.list_project_assignees(_project_id uuid)
RETURNS TABLE(user_id uuid, display_name text, email text, role text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
  WITH root_project AS (
    SELECT public.project_root(_project_id) AS id
  ),
  allowed AS (
    SELECT 1
    FROM root_project rp
    WHERE rp.id IS NOT NULL
      AND private.project_role(auth.uid(), rp.id) IS NOT NULL
  ),
  members AS (
    SELECT pt.user_id, 'owner'::text AS role
      FROM public.project_templates pt
      JOIN root_project rp ON rp.id = pt.id
      WHERE EXISTS (SELECT 1 FROM allowed)
    UNION
    SELECT pc.user_id, pc.role::text
      FROM public.project_collaborators pc
      JOIN root_project rp ON rp.id = pc.project_id
      WHERE EXISTS (SELECT 1 FROM allowed)
  )
  SELECT m.user_id,
         COALESCE(pr.display_name, split_part(pr.email, '@', 1), 'User') AS display_name,
         pr.email,
         m.role
  FROM members m
  LEFT JOIN public.profiles pr ON pr.user_id = m.user_id
  ORDER BY (m.role = 'owner') DESC, COALESCE(pr.display_name, pr.email) ASC;
$$;

REVOKE EXECUTE ON FUNCTION public.list_project_assignees(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_project_assignees(uuid) TO authenticated, service_role;