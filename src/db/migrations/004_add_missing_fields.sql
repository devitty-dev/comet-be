-- Add fields required by the Flutter frontend

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash           VARCHAR(255),
    ADD COLUMN IF NOT EXISTS phone                   VARCHAR(30),
    ADD COLUMN IF NOT EXISTS gender                  VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    ADD COLUMN IF NOT EXISTS country                 VARCHAR(100),
    ADD COLUMN IF NOT EXISTS terms_accepted_at       TIMESTAMP,
    ADD COLUMN IF NOT EXISTS planet_style_id         SMALLINT DEFAULT 1 CHECK (planet_style_id BETWEEN 1 AND 7),
    ADD COLUMN IF NOT EXISTS comets_count            INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS gifts_count             INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS messages_sent_count     INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS messages_received_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_online               BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS last_seen_at            TIMESTAMP,
    ADD COLUMN IF NOT EXISTS xp_to_next_level        INTEGER DEFAULT 100;

-- Indexes for discovery queries
CREATE INDEX IF NOT EXISTS idx_users_is_online       ON users(is_online);
CREATE INDEX IF NOT EXISTS idx_users_planet_style_id ON users(planet_style_id);
CREATE INDEX IF NOT EXISTS idx_users_last_seen_at    ON users(last_seen_at DESC NULLS LAST);
