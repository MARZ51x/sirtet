-- One row per user; `data` mirrors the client's whole Settings object
-- (theme, custom colors, background, audio/effects sliders, key bindings).
-- Shape is validated by Zod at the boundary; the DB only guards the type.
-- Merge rule lives client-side: newest-wins whole-object via data.meta.updatedAt.
create table public.user_settings (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb
               check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

-- Settings are non-abusable: clients read/write their own row directly.
-- ((select auth.uid())) lets Postgres cache the value per statement.
create policy "read own settings"
  on public.user_settings for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "insert own settings"
  on public.user_settings for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "update own settings"
  on public.user_settings for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- No DELETE policy (cascade only).
