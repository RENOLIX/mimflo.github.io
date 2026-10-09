CREATE TABLE IF NOT EXISTS paid_article_access (
 user_id TEXT PRIMARY KEY REFERENCES users(id),
 article_id TEXT NOT NULL REFERENCES articles(id),
 selected_at INTEGER NOT NULL,
 next_at INTEGER NOT NULL CHECK(next_at=selected_at+86400000)
);
CREATE TABLE IF NOT EXISTS paid_article_history (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 article_id TEXT NOT NULL REFERENCES articles(id),
 selected_at INTEGER NOT NULL,
 next_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS paid_article_history_user ON paid_article_history(user_id,selected_at);
-- Existing paid content becomes common to all three packs. Trial links are untouched.
INSERT OR IGNORE INTO article_packs(article_id,pack)
SELECT DISTINCT article_id,'sprint' FROM article_packs WHERE pack IN ('sprint','intensif','performance');
INSERT OR IGNORE INTO article_packs(article_id,pack)
SELECT DISTINCT article_id,'intensif' FROM article_packs WHERE pack IN ('sprint','intensif','performance');
INSERT OR IGNORE INTO article_packs(article_id,pack)
SELECT DISTINCT article_id,'performance' FROM article_packs WHERE pack IN ('sprint','intensif','performance');
