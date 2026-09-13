-- Development-only seed template. Generate real hashes with lib/auth/session.ts; never use these names/PINs in production.
insert into users (display_name, pin_hash) values
  ('Bridger', 'REPLACE_WITH_SCRYPT_HASH'), ('Luke', 'REPLACE_WITH_SCRYPT_HASH'),
  ('Jackson', 'REPLACE_WITH_SCRYPT_HASH'), ('Travis', 'REPLACE_WITH_SCRYPT_HASH'),
  ('Player 5', 'REPLACE_WITH_SCRYPT_HASH'), ('Player 6', 'REPLACE_WITH_SCRYPT_HASH');
