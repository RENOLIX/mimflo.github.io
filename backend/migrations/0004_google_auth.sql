ALTER TABLE users ADD COLUMN google_sub TEXT;
CREATE UNIQUE INDEX users_google_identity ON users(google_sub) WHERE google_sub IS NOT NULL;
CREATE TABLE google_challenges (
 id TEXT PRIMARY KEY,
 nonce TEXT NOT NULL,
 proof_hash TEXT NOT NULL,
 mode TEXT NOT NULL CHECK(mode IN ('login','register')),
 level TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);
