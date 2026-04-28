ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_amount_check;

ALTER TABLE expenses ALTER COLUMN amount DROP NOT NULL;

ALTER TABLE expenses ADD CONSTRAINT expenses_amount_check
    CHECK (amount IS NULL OR amount > 0);
