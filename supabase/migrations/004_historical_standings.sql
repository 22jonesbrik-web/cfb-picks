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
