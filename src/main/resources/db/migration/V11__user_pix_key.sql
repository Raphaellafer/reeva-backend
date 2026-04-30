ALTER TABLE users ADD COLUMN IF NOT EXISTS pix_key VARCHAR(255);

UPDATE users
SET pix_key = email
WHERE pix_key IS NULL;
