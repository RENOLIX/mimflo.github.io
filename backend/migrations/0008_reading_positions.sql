-- Each recording keeps its own identity and position in the complete article.
ALTER TABLE readings ADD COLUMN reading_start_word INTEGER;
ALTER TABLE readings ADD COLUMN reading_end_word INTEGER;
ALTER TABLE readings ADD COLUMN reading_next_word INTEGER;
