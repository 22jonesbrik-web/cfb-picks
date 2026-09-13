-- ===== 001_initial.sql =====
create extension if not exists pgcrypto;
create type week_status as enum ('draft','open','closed','completed'); create type game_status as enum ('scheduled','live','final','cancelled'); create type pick_result as enum ('pending','win','loss','push');
create table users (id uuid primary key default gen_random_uuid(), display_name text not null unique, pin_hash text not null, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table weeks (id uuid primary key default gen_random_uuid(), season int not null, week_number int not null, name text not null, status week_status not null default 'draft', pick_lock_at timestamptz not null, created_at timestamptz not null default now(), unique(season,week_number));
create table games (id uuid primary key default gen_random_uuid(), week_id uuid not null references weeks(id) on delete cascade, external_game_id text, away_team text not null, away_team_abbreviation text not null, away_team_logo text, away_team_rank int, home_team text not null, home_team_abbreviation text not null, home_team_logo text, home_team_rank int, kickoff_at timestamptz not null, away_score int, home_score int, game_status game_status not null default 'scheduled', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table contest_games (id uuid primary key default gen_random_uuid(), week_id uuid not null references weeks(id) on delete cascade, game_id uuid not null references games(id) on delete cascade, spread_team text not null, spread_value numeric(5,2) not null, display_order int not null default 0, active boolean not null default true, created_at timestamptz not null default now(), unique(week_id,game_id));
create table picks (id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade, contest_game_id uuid not null references contest_games(id) on delete cascade, selected_team text not null, selected_spread numeric(5,2) not null, result pick_result not null default 'pending', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,contest_game_id));
create table admins (user_id uuid primary key references users(id) on delete cascade, created_at timestamptz not null default now());
create table admin_audit_log (id uuid primary key default gen_random_uuid(), admin_id uuid not null references users(id), action text not null, week_id uuid references weeks(id), before_value jsonb, after_value jsonb, created_at timestamptz not null default now());
alter table users enable row level security; alter table weeks enable row level security; alter table games enable row level security; alter table contest_games enable row level security; alter table picks enable row level security; alter table admins enable row level security;
create policy "active players can read roster" on users for select using (active=true); create policy "players read weeks" on weeks for select using (true); create policy "players read games" on games for select using (true); create policy "players read contest games" on contest_games for select using (active=true);
revoke all on picks from anon, authenticated;

create index games_week_kickoff_idx on games (week_id, kickoff_at);
create unique index games_external_game_id_unique on games (external_game_id) where external_game_id is not null;
create index contest_games_week_order_idx on contest_games (week_id, display_order);
create index picks_contest_game_idx on picks (contest_game_id);
create index picks_user_idx on picks (user_id);

create or replace function set_updated_at() returns trigger
language plpgsql security invoker as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

create trigger users_updated_at before update on users
for each row execute function set_updated_at();
create trigger games_updated_at before update on games
for each row execute function set_updated_at();
create trigger picks_updated_at before update on picks
for each row execute function set_updated_at();

-- Pick reads and writes stay behind server routes. Those routes must validate
-- pick_lock_at and the game's effective deadline before using the service role.

-- ===== 002_contests.sql =====
create table contests (id uuid primary key default gen_random_uuid(), name text not null unique, slug text not null unique, active boolean not null default true, created_at timestamptz not null default now());
create table contest_members (contest_id uuid not null references contests(id) on delete cascade, user_id uuid not null references users(id) on delete cascade, joined_at timestamptz not null default now(), primary key(contest_id,user_id));
alter table contests enable row level security; alter table contest_members enable row level security;
create policy "active contests are readable" on contests for select using (active=true);
revoke all on contest_members from anon, authenticated;
insert into contests (name,slug) values ('CFB Pickem','cfb-pickem') on conflict (slug) do nothing;

-- ===== 003_roles_weights.sql =====
create type user_role as enum ('owner','admin','player');
alter table users add column if not exists email text;
alter table users add column if not exists password_hash text;
alter table users add column if not exists role user_role not null default 'player';
alter table users alter column pin_hash drop not null;
create unique index if not exists users_email_unique on users (lower(email)) where email is not null;
alter table weeks add column if not exists slate_lock_at timestamptz;
update weeks set slate_lock_at = pick_lock_at where slate_lock_at is null;
alter table weeks alter column slate_lock_at set not null;
alter table picks add column if not exists confidence_points int;
drop index if exists picks_user_confidence_unique;

create or replace function contest_game_limit() returns trigger
language plpgsql security definer as $$
begin
  if (select count(*) from contest_games where week_id = new.week_id and active = true and id <> new.id) >= 16 then
    raise exception 'A weekly contest may contain at most 16 active games';
  end if;
  return new;
end;
$$;
create trigger contest_game_limit_trigger before insert or update on contest_games
for each row when (new.active = true) execute function contest_game_limit();

create or replace function validate_confidence_points() returns trigger
language plpgsql security definer as $$
declare selected_count int;
begin
  if new.confidence_points is null then return new; end if;
  if new.confidence_points < 1 or new.confidence_points > 10 then raise exception 'Confidence points must be between 1 and 10'; end if;
  select count(*) into selected_count from picks p join contest_games cg on cg.id = p.contest_game_id where p.user_id = new.user_id and cg.week_id = (select week_id from contest_games where id = new.contest_game_id) and p.id <> coalesce(new.id, gen_random_uuid()) and p.confidence_points is not null;
  if selected_count >= 10 then raise exception 'A player may weight at most 10 picks'; end if;
  if exists (select 1 from picks p join contest_games cg on cg.id = p.contest_game_id where p.user_id = new.user_id and cg.week_id = (select week_id from contest_games where id = new.contest_game_id) and p.confidence_points = new.confidence_points and p.id <> new.id) then raise exception 'Confidence points must be unique within a week'; end if;
  return new;
end;
$$;
create trigger confidence_points_validation before insert or update on picks
for each row execute function validate_confidence_points();

-- ===== 004_historical_standings.sql =====
create table season_history (id uuid primary key default gen_random_uuid(), season int not null, display_name text not null, user_id uuid references users(id) on delete set null, wins int not null default 0, losses int not null default 0, pushes int not null default 0, points int not null default 0, tie_diff int, through_week int not null default 0, source text not null default 'commissioner import', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(season,display_name));
alter table season_history enable row level security;
create policy "season history is readable" on season_history for select using (true);
create index season_history_season_idx on season_history(season,points desc);
create trigger season_history_updated_at before update on season_history for each row execute function set_updated_at();
insert into season_history (season,display_name,wins,losses,points,tie_diff,through_week) values
(2026,'Nate-290',14,6,75,2,2),
(2026,'longrangeangeing44',11,9,66,8,2),
(2026,'Tannerbeck14',10,10,64,7,2),
(2026,'Kaderade5',11,9,62,8,2),
(2026,'kellyturley',12,8,60,15,2),
(2026,'Schwartz_B',10,10,59,4,2),
(2026,'WTURLEY',11,9,58,2,2),
(2026,'kbake13',10,10,55,19,2),
(2026,'DUCE2244',10,10,54,7,2),
(2026,'coopballer2',8,12,53,4,2),
(2026,'BLEEBECK',9,11,51,7,2),
(2026,'Bridger-Jones',9,11,48,1,2),
(2026,'jedforest',9,11,45,4,2),
(2026,'blairfrei3',8,12,45,7,2),
(2026,'Uruguay-No-Mas',8,12,41,6,2),
(2026,'Tanner-Hansen',6,14,37,54,2),
(2026,'jthatch21',7,3,32,12,2),
(2026,'Landonbeck',5,15,19,64,2)
on conflict (season,display_name) do update set wins=excluded.wins,losses=excluded.losses,points=excluded.points,tie_diff=excluded.tie_diff,through_week=excluded.through_week;

-- ===== 005_points_tiebreakers.sql =====
alter table weeks add column if not exists tie_breaker_game_id uuid references games(id) on delete set null;
alter table picks add column if not exists points int not null default 0;
create table week_submissions (id uuid primary key default gen_random_uuid(), week_id uuid not null references weeks(id) on delete cascade, user_id uuid not null references users(id) on delete cascade, tie_breaker_total int not null check (tie_breaker_total >= 0), tie_difference int, submitted_at timestamptz not null default now(), unique(week_id,user_id));
alter table week_submissions enable row level security;
revoke all on week_submissions from anon, authenticated;
create index week_submissions_week_idx on week_submissions(week_id);

-- ===== 006_weekly_finishes.sql =====
alter table season_history add column if not exists first_place_count int not null default 0;
alter table season_history add column if not exists second_place_count int not null default 0;
alter table season_history add column if not exists third_place_count int not null default 0;
update season_history set first_place_count=case when display_name in ('coopballer2','Tannerbeck14') then 1 else 0 end, second_place_count=case when display_name in ('kellyturley','longrangeangeing44') then 1 else 0 end, third_place_count=case when display_name in ('BLEEBECK','Nate-290') then 1 else 0 end where season=2026;

-- ===== 007_prize_money.sql =====
alter table season_history add column if not exists money_earned numeric(10,2) not null default 0;
create table weekly_awards (id uuid primary key default gen_random_uuid(), week_id uuid not null references weeks(id) on delete cascade, user_id uuid not null references users(id) on delete cascade, place int not null check (place between 1 and 3), amount numeric(10,2) not null, created_at timestamptz not null default now(), unique(week_id,user_id), unique(week_id,place));
alter table weekly_awards enable row level security;
revoke all on weekly_awards from anon, authenticated;
update season_history set money_earned=case display_name when 'coopballer2' then 115 when 'kellyturley' then 70 when 'BLEEBECK' then 35 when 'Tannerbeck14' then 115 when 'longrangeangeing44' then 70 when 'Nate-290' then 35 else 0 end where season=2026;

-- ===== 008_sportsbook_spreads.sql =====
alter table games add column if not exists sportsbook_spread_team text;
alter table games add column if not exists sportsbook_spread_value numeric(5,2);

-- ===== 009_fix_game_upsert.sql =====
drop index if exists games_external_game_id_unique;
create unique index games_external_game_id_unique on games (external_game_id);
