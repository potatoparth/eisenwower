ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS tasks_archived_at_idx ON public.tasks(archived_at) WHERE archived_at IS NOT NULL;