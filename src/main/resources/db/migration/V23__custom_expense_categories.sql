ALTER TABLE expenses DROP CONSTRAINT IF EXISTS chk_expenses_category;
ALTER TABLE expense_policies DROP CONSTRAINT IF EXISTS chk_policies_category;

ALTER TABLE expenses ALTER COLUMN category TYPE VARCHAR(80);
ALTER TABLE expense_policies ALTER COLUMN category TYPE VARCHAR(80);
