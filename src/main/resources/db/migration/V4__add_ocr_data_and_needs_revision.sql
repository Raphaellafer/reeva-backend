-- Add NEEDS_REVISION status to expenses and history check constraints
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS chk_expenses_status;
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_status_check;
ALTER TABLE expenses ADD CONSTRAINT chk_expenses_status
    CHECK (status IN ('DRAFT','SUBMITTED','AI_APPROVED','PENDING_REVIEW',
                      'MANAGER_APPROVED','MANAGER_REJECTED','FINANCE_APPROVED',
                      'FINANCE_REJECTED','PAID','CANCELLED','NEEDS_REVISION'));

ALTER TABLE expense_status_history DROP CONSTRAINT IF EXISTS chk_history_to_status;
ALTER TABLE expense_status_history DROP CONSTRAINT IF EXISTS expense_status_history_to_status_check;
ALTER TABLE expense_status_history ADD CONSTRAINT chk_history_to_status
    CHECK (to_status IN ('DRAFT','SUBMITTED','AI_APPROVED','PENDING_REVIEW',
                         'MANAGER_APPROVED','MANAGER_REJECTED','FINANCE_APPROVED',
                         'FINANCE_REJECTED','PAID','CANCELLED','NEEDS_REVISION'));

-- OCR extracted data stored as JSON
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS ocr_data JSONB;
