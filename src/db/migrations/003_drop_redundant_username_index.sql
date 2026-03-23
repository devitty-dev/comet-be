-- Drop the redundant case-sensitive non-unique index on username
-- Replaced by idx_users_username_lower (case-insensitive unique) added in migration 002
DROP INDEX IF EXISTS idx_users_username;
