drop index if exists games_external_game_id_unique;
create unique index games_external_game_id_unique on games (external_game_id);
