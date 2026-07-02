CREATE TABLE public.project_template_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_template_presets TO authenticated;
GRANT ALL ON public.project_template_presets TO service_role;

ALTER TABLE public.project_template_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own template presets"
  ON public.project_template_presets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_project_template_presets_updated_at
  BEFORE UPDATE ON public.project_template_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();