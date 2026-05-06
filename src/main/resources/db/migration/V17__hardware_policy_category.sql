ALTER TABLE expenses DROP CONSTRAINT IF EXISTS chk_expenses_category;
ALTER TABLE expenses ADD CONSTRAINT chk_expenses_category
    CHECK (category IN ('FOOD','TRANSPORT','LODGING','PURCHASE','HARDWARE'));

ALTER TABLE expense_policies DROP CONSTRAINT IF EXISTS chk_policies_category;
ALTER TABLE expense_policies ADD CONSTRAINT chk_policies_category
    CHECK (category IN ('FOOD','TRANSPORT','LODGING','PURCHASE','HARDWARE'));
