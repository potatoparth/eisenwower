
CREATE TABLE public.sprints (
  id UUID NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration INTEGER NOT NULL,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_time BIGINT NOT NULL,
  pause_offset BIGINT NOT NULL DEFAULT 0,
  paused_at BIGINT,
  completed_at BIGINT,
  ended_early BOOLEAN,
  actual_minutes INTEGER,
  no_timer BOOLEAN NOT NULL DEFAULT false,
  atmosphere TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sprints TO authenticated;
GRANT ALL ON public.sprints TO service_role;

ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sprints"
  ON public.sprints
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX sprints_user_created_idx ON public.sprints(user_id, created_at DESC);
CREATE UNIQUE INDEX sprints_one_active_per_user
  ON public.sprints(user_id) WHERE is_active = true;

CREATE TRIGGER sprints_updated_at
  BEFORE UPDATE ON public.sprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
