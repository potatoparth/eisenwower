CREATE OR REPLACE FUNCTION private.project_role(_user_id uuid, _project_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
  WITH RECURSIVE up AS (
    SELECT pt.id, pt.parent_id, 0 AS depth
    FROM public.project_templates pt
    WHERE pt.id = _project_id
    UNION ALL
    SELECT parent.id, parent.parent_id, up.depth + 1
    FROM public.project_templates parent
    JOIN up ON up.parent_id = parent.id
  ),
  root_project AS (
    SELECT id
    FROM up
    ORDER BY depth DESC
    LIMIT 1
  ),
  nearest_collaboration AS (
    SELECT pc.role::text AS role
    FROM public.project_collaborators pc
    JOIN up ON up.id = pc.project_id
    WHERE pc.user_id = _user_id
    ORDER BY up.depth ASC
    LIMIT 1
  )
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.project_templates pt
      JOIN root_project rp ON rp.id = pt.id
      WHERE pt.user_id = _user_id
    ) THEN 'owner'
    ELSE (SELECT role FROM nearest_collaboration)
  END
$function$;

CREATE OR REPLACE FUNCTION public.project_role(_user_id uuid, _project_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
  SELECT private.project_role(_user_id, _project_id)
$function$;

CREATE OR REPLACE FUNCTION private.can_edit_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
  SELECT private.project_role(_user_id, _project_id) IN ('owner', 'editor')
$function$;

CREATE OR REPLACE FUNCTION public.can_edit_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
  SELECT private.can_edit_project(_user_id, _project_id)
$function$;

CREATE OR REPLACE FUNCTION private.can_view_project_item(_user_id uuid, _project_id uuid, _item_type public.project_share_item_type, _item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
  WITH RECURSIVE up AS (
    SELECT pt.id, pt.parent_id, 0 AS depth
    FROM public.project_templates pt
    WHERE pt.id = _project_id
    UNION ALL
    SELECT parent.id, parent.parent_id, up.depth + 1
    FROM public.project_templates parent
    JOIN up ON up.parent_id = parent.id
  )
  SELECT
    private.is_project_owner(_user_id, _project_id)
    OR EXISTS (
      SELECT 1
      FROM public.project_collaborators pc
      JOIN up ON up.id = pc.project_id
      WHERE pc.user_id = _user_id
        AND (
          pc.scope = 'all'
          OR EXISTS (
            SELECT 1
            FROM public.project_shared_items si
            WHERE si.project_id = pc.project_id
              AND si.collaborator_user_id = _user_id
              AND si.item_type = _item_type
              AND si.item_id = _item_id
          )
        )
    )
$function$;

CREATE OR REPLACE FUNCTION public.can_view_project_item(_user_id uuid, _project_id uuid, _item_type public.project_share_item_type, _item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
  SELECT private.can_view_project_item(_user_id, _project_id, _item_type, _item_id)
$function$;

CREATE OR REPLACE FUNCTION private.can_add_subproject(_user_id uuid, _parent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
  WITH RECURSIVE up AS (
    SELECT pt.id, pt.parent_id, 0 AS depth
    FROM public.project_templates pt
    WHERE pt.id = _parent_id
    UNION ALL
    SELECT parent.id, parent.parent_id, up.depth + 1
    FROM public.project_templates parent
    JOIN up ON up.parent_id = parent.id
  )
  SELECT
    private.is_project_owner(_user_id, _parent_id)
    OR EXISTS (
      SELECT 1
      FROM public.project_collaborators pc
      JOIN up ON up.id = pc.project_id
      WHERE pc.user_id = _user_id
        AND pc.role = 'editor'
        AND pc.can_create_subprojects = true
    )
$function$;

CREATE OR REPLACE FUNCTION public.list_project_assignees(_project_id uuid)
RETURNS TABLE(user_id uuid, display_name text, email text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
  WITH RECURSIVE up AS (
    SELECT pt.id, pt.parent_id, 0 AS depth
    FROM public.project_templates pt
    WHERE pt.id = _project_id
    UNION ALL
    SELECT parent.id, parent.parent_id, up.depth + 1
    FROM public.project_templates parent
    JOIN up ON up.parent_id = parent.id
  ),
  root_project AS (
    SELECT id
    FROM up
    ORDER BY depth DESC
    LIMIT 1
  ),
  allowed AS (
    SELECT 1
    WHERE private.project_role(auth.uid(), _project_id) IS NOT NULL
  ),
  owner_member AS (
    SELECT pt.user_id, 'owner'::text AS role, -1 AS priority
    FROM public.project_templates pt
    JOIN root_project rp ON rp.id = pt.id
    WHERE EXISTS (SELECT 1 FROM allowed)
  ),
  collaborator_members AS (
    SELECT DISTINCT ON (pc.user_id)
      pc.user_id,
      pc.role::text AS role,
      up.depth AS priority
    FROM public.project_collaborators pc
    JOIN up ON up.id = pc.project_id
    WHERE EXISTS (SELECT 1 FROM allowed)
    ORDER BY pc.user_id, up.depth ASC
  ),
  members AS (
    SELECT * FROM owner_member
    UNION ALL
    SELECT * FROM collaborator_members
  )
  SELECT m.user_id,
         COALESCE(pr.display_name, split_part(pr.email, '@', 1), 'User') AS display_name,
         pr.email,
         m.role
  FROM members m
  LEFT JOIN public.profiles pr ON pr.user_id = m.user_id
  ORDER BY (m.role = 'owner') DESC, COALESCE(pr.display_name, pr.email) ASC;
$function$;

DROP POLICY IF EXISTS "Collaborators view project_tasks" ON public.project_tasks;
CREATE POLICY "Collaborators view project_tasks"
  ON public.project_tasks
  FOR SELECT
  TO authenticated
  USING (private.project_role(auth.uid(), project_id) IS NOT NULL);

GRANT EXECUTE ON FUNCTION public.project_role(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_edit_project(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_project_item(uuid, uuid, public.project_share_item_type, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_project_assignees(uuid) TO authenticated, service_role;