create table public.scores (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  mode           text not null check (mode in ('marathon', 'sprint', 'ultra')),
  score          integer not null check (score between 0 and 9999999),
  lines          integer not null check (lines between 0 and 10000),
  level          integer not null check (level between 1 and 30),
  duration_ms    integer not null check (duration_ms between 0 and 21600000),
  session_id     uuid not null,
  client_version text check (client_version is null or char_length(client_version) <= 20),
  created_at     timestamptz not null default now(),
  -- anti-replay: one score per signed game-session token
  constraint scores_session_id_key unique (session_id)
);

-- leaderboard: all-time top-N for marathon/ultra
create index scores_mode_score_idx
  on public.scores (mode, score desc, created_at asc);

-- leaderboard: sprint ranks by fastest time
create index scores_sprint_duration_idx
  on public.scores (mode, duration_ms asc, created_at asc)
  where mode = 'sprint';

-- daily/weekly windows
create index scores_mode_created_idx
  on public.scores (mode, created_at desc);

-- personal bests + profile pages; also covers the user_id FK for cascades
create index scores_user_mode_score_idx
  on public.scores (user_id, mode, score desc);

-- server-side rate limiting ("submissions in the last N minutes")
create index scores_user_created_idx
  on public.scores (user_id, created_at desc);

alter table public.scores enable row level security;

-- Explicit privileges: clients read only; the service role owns all writes
-- (there is deliberately NO client insert path at either layer).
grant select on public.scores to anon, authenticated;
grant all on public.scores to service_role;

create policy "scores are publicly readable"
  on public.scores for select
  to anon, authenticated
  using (true);

-- No INSERT policy — this is the anti-cheat linchpin. A direct supabase-js
-- insert from the browser fails RLS; the only write path is POST /api/scores
-- using the secret key after validation.
-- No UPDATE/DELETE policies (scores are immutable; deletion only via cascade).
