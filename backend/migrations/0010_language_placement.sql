CREATE TABLE placement_tests (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), access_type TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('questions','ready','processing','completed','failed')),
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, answers TEXT, quiz TEXT,
 transcript TEXT, result TEXT, audio_seconds INTEGER NOT NULL DEFAULT 0, attempts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX placement_user ON placement_tests(user_id,created_at DESC);
CREATE UNIQUE INDEX placement_in_progress ON placement_tests(user_id) WHERE status IN ('questions','ready','processing');
