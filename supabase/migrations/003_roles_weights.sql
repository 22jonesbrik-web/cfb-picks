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
