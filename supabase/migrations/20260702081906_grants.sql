-- Explicit table privileges (the initial pg-delta diff normalized away the
-- platform's default grants, leaving clients without SELECT and the service
-- role without INSERT).
-- NOTE: the generated diff also contained "DROP TRIGGER on_auth_user_created
-- ON auth.users" — removed by hand: that trigger lives outside the declarative
-- schema's scope (see the auth_user_trigger manual migration) and the diff
-- tool cannot know about it. Documented exception, same class as the manual
-- migrations.
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.profiles TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.profiles TO service_role;
GRANT SELECT ON public.scores TO anon;
GRANT SELECT ON public.scores TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.scores TO service_role;
GRANT INSERT, SELECT, UPDATE ON public.user_settings TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.user_settings TO service_role;
