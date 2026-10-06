ALTER TABLE readings ADD COLUMN analysis TEXT;
CREATE TABLE analysis_jobs (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), article_id TEXT NOT NULL REFERENCES articles(id),
 access_type TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('processing','completed','failed')),
 passage_index INTEGER NOT NULL DEFAULT 0, day TEXT NOT NULL, created_at INTEGER NOT NULL, result TEXT, UNIQUE(user_id,id)
);
CREATE INDEX analysis_day ON analysis_jobs(day,user_id);
CREATE UNIQUE INDEX one_trial_analysis ON analysis_jobs(user_id) WHERE access_type='trial' AND status IN ('processing','completed');
