ALTER TABLE placement_tests ADD COLUMN article_id TEXT;
ALTER TABLE placement_tests ADD COLUMN topic TEXT;
CREATE INDEX placement_article ON placement_tests(user_id,article_id,created_at DESC);
