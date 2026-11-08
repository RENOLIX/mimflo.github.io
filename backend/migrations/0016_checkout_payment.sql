-- Keep the server-selected hosted payment with its order, including retries.
ALTER TABLE requests ADD COLUMN payment TEXT NOT NULL DEFAULT '{}';
