ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_fingerprint VARCHAR(128);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS duplicate_of_expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_receipt_fingerprint
    ON expenses(company_id, receipt_fingerprint)
    WHERE receipt_fingerprint IS NOT NULL AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_expenses_duplicate_of
    ON expenses(duplicate_of_expense_id)
    WHERE duplicate_of_expense_id IS NOT NULL;
