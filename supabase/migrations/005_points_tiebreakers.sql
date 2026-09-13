alter table weeks add column if not exists tie_breaker_game_id uuid references games(id) on delete set null;
alter table picks add column if not exists points int not null default 0;
create table week_submissions (id uuid primary key default gen_random_uuid(), week_id uuid not null references weeks(id) on delete cascade, user_id uuid not null references users(id) on delete cascade, tie_breaker_total int not null check (tie_breaker_total >= 0), tie_difference int, submitted_at timestamptz not null default now(), unique(week_id,user_id));
alter table week_submissions enable row level security;
revoke all on week_submissions from anon, authenticated;
create index week_submissions_week_idx on week_submissions(week_id);
