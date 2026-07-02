-- Leaderboard RPCs. SECURITY INVOKER: they respect the public-read RLS on
-- scores/profiles and are callable with the publishable key. Window functions
-- ("best score per user + dense rank") can't be expressed in PostgREST query
-- syntax, hence functions.

create or replace function public.get_leaderboard(
  p_mode   text,
  p_window text default 'all',   -- 'all' | 'daily' | 'weekly'
  p_limit  int  default 50,
  p_offset int  default 0
)
returns table (
  rank bigint, user_id uuid, username text,
  score int, lines int, level int, duration_ms int, achieved_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with best as (
    select distinct on (s.user_id) s.*
    from public.scores s
    where s.mode = p_mode
      and s.created_at >= case p_window
            when 'daily'  then now() - interval '1 day'
            when 'weekly' then now() - interval '7 days'
            else '-infinity'::timestamptz
          end
    order by s.user_id,
             case when p_mode = 'sprint' then s.duration_ms end asc,
             case when p_mode <> 'sprint' then s.score end desc,
             s.created_at asc
  )
  select rank() over (order by
             case when p_mode = 'sprint' then b.duration_ms end asc,
             case when p_mode <> 'sprint' then b.score end desc,
             b.created_at asc) as rank,
         b.user_id, p.username, b.score, b.lines, b.level, b.duration_ms,
         b.created_at as achieved_at
  from best b
  join public.profiles p on p.id = b.user_id
  order by rank
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0)
$$;

create or replace function public.get_my_rank(
  p_mode   text,
  p_window text default 'all'
)
returns table (
  rank bigint, total_players bigint,
  score int, lines int, level int, duration_ms int, achieved_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with best as (
    select distinct on (s.user_id) s.*
    from public.scores s
    where s.mode = p_mode
      and s.created_at >= case p_window
            when 'daily'  then now() - interval '1 day'
            when 'weekly' then now() - interval '7 days'
            else '-infinity'::timestamptz
          end
    order by s.user_id,
             case when p_mode = 'sprint' then s.duration_ms end asc,
             case when p_mode <> 'sprint' then s.score end desc,
             s.created_at asc
  ),
  ranked as (
    select rank() over (order by
             case when p_mode = 'sprint' then best.duration_ms end asc,
             case when p_mode <> 'sprint' then best.score end desc,
             best.created_at asc) as rank,
           count(*) over () as total_players,
           best.*
    from best
  )
  select r.rank, r.total_players, r.score, r.lines, r.level, r.duration_ms,
         r.created_at as achieved_at
  from ranked r
  where r.user_id = (select auth.uid())
$$;
