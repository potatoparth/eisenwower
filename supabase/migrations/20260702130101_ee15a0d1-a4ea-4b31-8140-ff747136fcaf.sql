DROP POLICY IF EXISTS boards_own_all ON public.kanban_boards;
CREATE POLICY boards_own_all ON public.kanban_boards FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS board_items_own_all ON public.kanban_board_items;
CREATE POLICY board_items_own_all ON public.kanban_board_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own template presets" ON public.project_template_presets;
CREATE POLICY "Users manage own template presets" ON public.project_template_presets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);