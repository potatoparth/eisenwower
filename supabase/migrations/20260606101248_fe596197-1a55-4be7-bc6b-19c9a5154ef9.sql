ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurrence text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS recurrence_days integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recurrence_time text NOT NULL DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS is_recurring_instance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_template_id uuid;

CREATE INDEX IF NOT EXISTS idx_tasks_recurring_template_id ON public.tasks(recurring_template_id);