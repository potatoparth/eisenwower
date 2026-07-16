
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.tasks SET created_by = user_id WHERE created_by IS NULL;
UPDATE public.tasks SET updated_by = user_id WHERE updated_by IS NULL;
UPDATE public.notes SET created_by = user_id WHERE created_by IS NULL;
UPDATE public.notes SET updated_by = user_id WHERE updated_by IS NULL;

CREATE OR REPLACE FUNCTION public.set_authorship()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN NEW.created_by := COALESCE(auth.uid(), NEW.user_id); END IF;
    NEW.updated_by := COALESCE(auth.uid(), NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by, NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_task_authorship ON public.tasks;
CREATE TRIGGER set_task_authorship
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_authorship();

DROP TRIGGER IF EXISTS set_note_authorship ON public.notes;
CREATE TRIGGER set_note_authorship
  BEFORE INSERT OR UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.set_authorship();

-- Assignee picker: any collaborator (or owner) who can view the project may list its members.
CREATE OR REPLACE FUNCTION public.list_project_assignees(_project_id uuid)
RETURNS TABLE(user_id uuid, display_name text, email text, role text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, private
AS $$
  WITH allowed AS (
    SELECT 1 WHERE private.project_role(auth.uid(), _project_id) IS NOT NULL
  ),
  members AS (
    SELECT pt.user_id, 'owner'::text AS role
      FROM public.project_templates pt
      WHERE pt.id = _project_id AND EXISTS (SELECT 1 FROM allowed)
    UNION
    SELECT pc.user_id, pc.role::text
      FROM public.project_collaborators pc
      WHERE pc.project_id = _project_id AND EXISTS (SELECT 1 FROM allowed)
  )
  SELECT m.user_id,
         COALESCE(pr.display_name, split_part(pr.email, '@', 1), 'User'),
         pr.email,
         m.role
  FROM members m
  LEFT JOIN public.profiles pr ON pr.user_id = m.user_id
  ORDER BY (m.role = 'owner') DESC, COALESCE(pr.display_name, pr.email) ASC;
$$;

GRANT EXECUTE ON FUNCTION public.list_project_assignees(uuid) TO authenticated;
