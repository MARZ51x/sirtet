SET check_function_bodies = false;
CREATE FUNCTION public.get_leaderboard(p_mode text, p_window text DEFAULT 'all'::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(rank bigint, user_id uuid, username text, score integer, lines integer, level integer, duration_ms integer, achieved_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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
$function$;
CREATE FUNCTION public.get_my_rank(p_mode text, p_window text DEFAULT 'all'::text)
 RETURNS TABLE(rank bigint, total_players bigint, score integer, lines integer, level integer, duration_ms integer, achieved_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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
$function$;
CREATE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;
CREATE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;
CREATE TABLE public.profiles (id uuid NOT NULL, username text NOT NULL, username_changed_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_format CHECK (username ~ '^[A-Za-z0-9_]{3,20}$'::text);
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.profiles TO anon;
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.profiles TO authenticated;
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.profiles TO service_role;
CREATE UNIQUE INDEX profiles_username_lower_key ON public.profiles (lower(username));
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "profiles are publicly readable" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE TABLE public.scores (id bigint GENERATED ALWAYS AS IDENTITY NOT NULL, user_id uuid NOT NULL, mode text NOT NULL, score integer NOT NULL, lines integer NOT NULL, level integer NOT NULL, duration_ms integer NOT NULL, session_id uuid NOT NULL, client_version text, created_at timestamp with time zone DEFAULT now() NOT NULL);
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ADD CONSTRAINT scores_client_version_check CHECK (client_version IS NULL OR char_length(client_version) <= 20);
ALTER TABLE public.scores ADD CONSTRAINT scores_duration_ms_check CHECK (duration_ms >= 0 AND duration_ms <= 21600000);
ALTER TABLE public.scores ADD CONSTRAINT scores_level_check CHECK (level >= 1 AND level <= 30);
ALTER TABLE public.scores ADD CONSTRAINT scores_lines_check CHECK (lines >= 0 AND lines <= 10000);
ALTER TABLE public.scores ADD CONSTRAINT scores_mode_check CHECK (mode = ANY (ARRAY['marathon'::text, 'sprint'::text, 'ultra'::text]));
ALTER TABLE public.scores ADD CONSTRAINT scores_pkey PRIMARY KEY (id);
ALTER TABLE public.scores ADD CONSTRAINT scores_score_check CHECK (score >= 0 AND score <= 9999999);
ALTER TABLE public.scores ADD CONSTRAINT scores_session_id_key UNIQUE (session_id);
ALTER TABLE public.scores ADD CONSTRAINT scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.scores TO anon;
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.scores TO authenticated;
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.scores TO service_role;
CREATE INDEX scores_user_created_idx ON public.scores (user_id, created_at DESC);
CREATE INDEX scores_sprint_duration_idx ON public.scores (mode, duration_ms, created_at) WHERE mode = 'sprint'::text;
CREATE INDEX scores_mode_score_idx ON public.scores (mode, score DESC, created_at);
CREATE INDEX scores_user_mode_score_idx ON public.scores (user_id, mode, score DESC);
CREATE INDEX scores_mode_created_idx ON public.scores (mode, created_at DESC);
CREATE POLICY "scores are publicly readable" ON public.scores FOR SELECT TO anon, authenticated USING (true);
CREATE TABLE public.user_settings (user_id uuid NOT NULL, data jsonb DEFAULT '{}'::jsonb NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_data_check CHECK (jsonb_typeof(data) = 'object'::text);
ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_pkey PRIMARY KEY (user_id);
ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.user_settings TO anon;
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.user_settings TO authenticated;
GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.user_settings TO service_role;
CREATE TRIGGER user_settings_set_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "insert own settings" ON public.user_settings FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "read own settings" ON public.user_settings FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "update own settings" ON public.user_settings FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
