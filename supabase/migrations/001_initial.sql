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
