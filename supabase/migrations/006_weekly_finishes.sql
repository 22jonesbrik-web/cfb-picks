alter table season_history add column if not exists first_place_count int not null default 0;
alter table season_history add column if not exists second_place_count int not null default 0;
alter table season_history add column if not exists third_place_count int not null default 0;
update season_history set first_place_count=case when display_name in ('coopballer2','Tannerbeck14') then 1 else 0 end, second_place_count=case when display_name in ('kellyturley','longrangeangeing44') then 1 else 0 end, third_place_count=case when display_name in ('BLEEBECK','Nate-290') then 1 else 0 end where season=2026;
