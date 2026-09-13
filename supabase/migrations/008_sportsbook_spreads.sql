alter table games add column if not exists sportsbook_spread_team text;
alter table games add column if not exists sportsbook_spread_value numeric(5,2);
