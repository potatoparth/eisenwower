
-- Uploads table
CREATE TABLE public.sprint_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size BIGINT NOT NULL CHECK (size >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sprint_uploads TO authenticated;
GRANT ALL ON public.sprint_uploads TO service_role;

ALTER TABLE public.sprint_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sprint uploads"
  ON public.sprint_uploads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX sprint_uploads_user_idx ON public.sprint_uploads(user_id, created_at DESC);

-- Enforce 3 files / 50 MB per user
CREATE OR REPLACE FUNCTION public.enforce_sprint_upload_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt INTEGER;
  total_size BIGINT;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(size), 0)
    INTO cnt, total_size
    FROM public.sprint_uploads
    WHERE user_id = NEW.user_id;
  IF cnt >= 3 THEN
    RAISE EXCEPTION 'Upload limit reached: max 3 files per user';
  END IF;
  IF total_size + NEW.size > 50 * 1024 * 1024 THEN
    RAISE EXCEPTION 'Storage limit reached: max 50MB per user';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sprint_uploads_enforce_limits
  BEFORE INSERT ON public.sprint_uploads
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sprint_upload_limits();

-- Preferences table
CREATE TABLE public.sprint_preferences (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_upload_id UUID REFERENCES public.sprint_uploads(id) ON DELETE SET NULL,
  youtube_url TEXT,
  spotify_url TEXT,
  background_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sprint_preferences TO authenticated;
GRANT ALL ON public.sprint_preferences TO service_role;

ALTER TABLE public.sprint_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sprint preferences"
  ON public.sprint_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER sprint_preferences_updated_at
  BEFORE UPDATE ON public.sprint_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies: user's own folder inside sprint-backgrounds bucket
CREATE POLICY "Users read own sprint background files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'sprint-backgrounds'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users upload own sprint background files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'sprint-backgrounds'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own sprint background files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'sprint-backgrounds'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own sprint background files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'sprint-backgrounds'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
