
DROP POLICY IF EXISTS "Collaborators view shared project" ON public.project_templates;
CREATE POLICY "Collaborators view shared project" ON public.project_templates
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.project_collaborators pc WHERE pc.project_id = project_templates.id AND pc.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users manage own sprints" ON public.sprints;
CREATE POLICY "Users manage own sprints" ON public.sprints
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own sprint preferences" ON public.sprint_preferences;
CREATE POLICY "Users manage own sprint preferences" ON public.sprint_preferences
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own sprint uploads" ON public.sprint_uploads;
CREATE POLICY "Users manage own sprint uploads" ON public.sprint_uploads
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
