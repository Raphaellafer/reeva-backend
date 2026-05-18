ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS payment_frequency VARCHAR(20) NOT NULL DEFAULT 'WEEKLY',
    ADD COLUMN IF NOT EXISTS payment_weekday INTEGER,
    ADD COLUMN IF NOT EXISTS payment_day_of_month INTEGER;

UPDATE companies
SET payment_weekday = 4
WHERE payment_frequency = 'WEEKLY'
  AND payment_weekday IS NULL;

ALTER TABLE companies DROP CONSTRAINT IF EXISTS chk_companies_payment_frequency;
ALTER TABLE companies ADD CONSTRAINT chk_companies_payment_frequency
    CHECK (payment_frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'MANUAL'));

ALTER TABLE companies DROP CONSTRAINT IF EXISTS chk_companies_payment_weekday;
ALTER TABLE companies ADD CONSTRAINT chk_companies_payment_weekday
    CHECK (payment_weekday IS NULL OR payment_weekday BETWEEN 1 AND 7);

ALTER TABLE companies DROP CONSTRAINT IF EXISTS chk_companies_payment_day_of_month;
ALTER TABLE companies ADD CONSTRAINT chk_companies_payment_day_of_month
    CHECK (payment_day_of_month IS NULL OR payment_day_of_month BETWEEN 1 AND 31);
