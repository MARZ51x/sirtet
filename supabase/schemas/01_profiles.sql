create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  username            text not null,
  username_changed_at timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint profiles_username_format
    check (username ~ '^[A-Za-z0-9_]{3,20}$')
);

-- Case-insensitive uniqueness ("Marz" == "marz"); also backs the username
-- lookups in login and availability checks.
create unique index profiles_username_lower_key
  on public.profiles (lower(username));

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- Explicit privileges (the diff tool normalizes grants, so declare them):
-- clients only ever read profiles; all writes go through the service role.
grant select on public.profiles to anon, authenticated;
grant all on public.profiles to service_role;

-- Usernames are public (leaderboards). No email or PII lives here — ever.
create policy "profiles are publicly readable"
  on public.profiles for select
  to anon, authenticated
  using (true);

-- No INSERT policy (rows created by the security-definer signup trigger).
-- No UPDATE policy (username changes go through the server route, which
-- enforces the cooldown + reserved list).
-- No DELETE policy (rows die via ON DELETE CASCADE from auth.users).
