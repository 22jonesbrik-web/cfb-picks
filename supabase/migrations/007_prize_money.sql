alter table season_history add column if not exists money_earned numeric(10,2) not null default 0;
create table weekly_awards (id uuid primary key default gen_random_uuid(), week_id uuid not null references weeks(id) on delete cascade, user_id uuid not null references users(id) on delete cascade, place int not null check (place between 1 and 3), amount numeric(10,2) not null, created_at timestamptz not null default now(), unique(week_id,user_id), unique(week_id,place));
alter table weekly_awards enable row level security;
revoke all on weekly_awards from anon, authenticated;
update season_history set money_earned=case display_name when 'coopballer2' then 115 when 'kellyturley' then 70 when 'BLEEBECK' then 35 when 'Tannerbeck14' then 115 when 'longrangeangeing44' then 70 when 'Nate-290' then 35 else 0 end where season=2026;
