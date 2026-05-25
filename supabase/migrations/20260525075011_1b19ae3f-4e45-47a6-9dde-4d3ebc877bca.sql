ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS project_id uuid;
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);