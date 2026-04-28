-- JSONB requires explicit cast with Hibernate 6; using TEXT is simpler
ALTER TABLE expenses ALTER COLUMN ocr_data TYPE TEXT USING ocr_data::text;
