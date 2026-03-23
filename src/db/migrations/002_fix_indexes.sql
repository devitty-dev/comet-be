-- Drop useless token_hash index (tokens are looked up by id, not hash)
DROP INDEX IF EXISTS idx_refresh_tokens_token_hash;

-- Add case-insensitive unique index for usernames
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username));
