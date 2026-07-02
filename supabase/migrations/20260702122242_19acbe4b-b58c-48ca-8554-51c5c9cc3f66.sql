
-- Multi-board Kanban support.
-- Default board is derived client-side from task state, so we only persist custom boards.

-- 1) Boards
CREATE TABLE public.kanban_boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kanban_boards TO authenticated;
GRANT ALL ON public.kanban_boards TO service_role;
ALTER TABLE public.kanban_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boards_own_all" ON public.kanban_boards FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_kanban_boards_updated_at
  BEFORE UPDATE ON public.kanban_boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Reset kanban_columns to be scoped by board_id (the old flat per-user
-- Default board is replaced by the derived Default board — drop legacy rows).
DELETE FROM public.kanban_columns;
ALTER TABLE public.kanban_columns
  ADD COLUMN board_id UUID NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE;
-- Old uniqueness was (user_id, column_key); switch to (board_id, column_key).
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.kanban_columns'::regclass AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.kanban_columns DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
ALTER TABLE public.kanban_columns
  ADD CONSTRAINT kanban_columns_board_key_unique UNIQUE (board_id, column_key);

-- 3) Task placement per custom board (many-to-many so a task can live on
-- multiple boards). Default board is derived so it doesn't need rows here.
CREATE TABLE public.kanban_board_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  board_id UUID NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  column_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (board_id, task_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kanban_board_items TO authenticated;
GRANT ALL ON public.kanban_board_items TO service_role;
ALTER TABLE public.kanban_board_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "board_items_own_all" ON public.kanban_board_items FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX kanban_board_items_board_idx ON public.kanban_board_items(board_id);
CREATE INDEX kanban_board_items_task_idx ON public.kanban_board_items(task_id);

-- 4) Realtime so Matrix <-> Kanban stay in sync everywhere.
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.kanban_boards REPLICA IDENTITY FULL;
ALTER TABLE public.kanban_columns REPLICA IDENTITY FULL;
ALTER TABLE public.kanban_board_items REPLICA IDENTITY FULL;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_boards; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_columns; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_board_items; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
