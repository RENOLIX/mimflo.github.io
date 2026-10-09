ALTER TABLE placement_tests ADD COLUMN audio_hash TEXT;
ALTER TABLE placement_tests ADD COLUMN error_stage TEXT;
ALTER TABLE placement_tests ADD COLUMN error_code TEXT;
ALTER TABLE placement_tests ADD COLUMN budget_day INTEGER NOT NULL DEFAULT 0;
ALTER TABLE placement_tests ADD COLUMN day_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE placement_tests ADD COLUMN day_audio_seconds INTEGER NOT NULL DEFAULT 0;
UPDATE placement_tests SET budget_day=CAST(updated_at/86400000 AS INTEGER)*86400000,day_attempts=attempts,day_audio_seconds=audio_seconds;
