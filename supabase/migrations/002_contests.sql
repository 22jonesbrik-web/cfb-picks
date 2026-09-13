create table contests (id uuid primary key default gen_random_uuid(), name text not null unique, slug text not null unique, active boolean not null default true, created_at timestamptz not null default now());
create table contest_members (contest_id uuid not null references contests(id) on delete cascade, user_id uuid not null references users(id) on delete cascade, joined_at timestamptz not null default now(), primary key(contest_id,user_id));
alter table contests enable row level security; alter table contest_members enable row level security;
create policy "active contests are readable" on contests for select using (active=true);
revoke all on contest_members from anon, authenticated;
insert into contests (name,slug) values ('CFB Pickem','cfb-pickem') on conflict (slug) do nothing;
