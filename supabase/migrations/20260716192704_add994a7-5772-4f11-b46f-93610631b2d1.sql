GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kanban_board_items TO authenticated;
GRANT ALL ON public.kanban_board_items TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kanban_boards TO authenticated;
GRANT ALL ON public.kanban_boards TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kanban_columns TO authenticated;
GRANT ALL ON public.kanban_columns TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_collaborators TO authenticated;
GRANT ALL ON public.project_collaborators TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_invites TO authenticated;
GRANT ALL ON public.project_invites TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_shared_items TO authenticated;
GRANT ALL ON public.project_shared_items TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_tasks TO authenticated;
GRANT ALL ON public.project_tasks TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_template_presets TO authenticated;
GRANT ALL ON public.project_template_presets TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_templates TO authenticated;
GRANT ALL ON public.project_templates TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sprint_preferences TO authenticated;
GRANT ALL ON public.sprint_preferences TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sprint_uploads TO authenticated;
GRANT ALL ON public.sprint_uploads TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sprints TO authenticated;
GRANT ALL ON public.sprints TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;