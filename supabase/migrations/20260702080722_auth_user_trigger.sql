-- MANUAL migration (documented exception to "never hand-write"):
-- the trigger lives on auth.users, outside the diffed public schema,
-- so `supabase db diff` cannot capture it. Written once, never edited.

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
