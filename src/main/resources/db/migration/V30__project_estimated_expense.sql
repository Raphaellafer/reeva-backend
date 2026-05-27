ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS estimated_expense NUMERIC(14, 2);

UPDATE projects
SET estimated_expense = revenue * 0.05
WHERE estimated_expense IS NULL
  AND revenue IS NOT NULL;
