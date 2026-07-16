
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
  ));

CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT user_id, display_name, avatar_url, badge_color, badge_gradient, created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;
