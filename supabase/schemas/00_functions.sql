-- Shared trigger functions.

-- Generic updated_at maintenance.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Auto-create a profile + settings row when an auth user is created.
-- SECURITY DEFINER: runs as owner because the signing-up user has no session
-- yet. The trigger itself lives on auth.users and is created in a MANUAL
-- migration (db diff only tracks the public schema).
-- Runs in the same transaction as the auth.users insert, so a duplicate
-- username aborts signup at the DB level — the unique index is the final
-- authority; the API pre-check exists only for UX.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username',
             'player_' || left(replace(new.id::text, '-', ''), 8))
  );
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;
