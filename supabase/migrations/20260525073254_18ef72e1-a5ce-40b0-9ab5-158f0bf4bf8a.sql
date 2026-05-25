
-- Profiles: add INSERT and DELETE policies scoped to the owner
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Realtime: restrict channel subscriptions to the authenticated user's own topic.
-- Convention: clients must subscribe to a channel named after their auth.uid().
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can only access their own channel"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()::text) = realtime.topic()
  );
