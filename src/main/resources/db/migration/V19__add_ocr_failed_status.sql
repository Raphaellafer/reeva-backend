-- Add OCR_FAILED status to support async queue dead-letter processing
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS chk_expenses_status;
ALTER TABLE expenses ADD CONSTRAINT chk_expenses_status
    CHECK (status IN ('DRAFT','SUBMITTED','AI_APPROVED','PENDING_REVIEW',
                      'MANAGER_APPROVED','MANAGER_REJECTED','FINANCE_APPROVED',
                      'FINANCE_REJECTED','PAID','CANCELLED','NEEDS_REVISION','OCR_FAILED'));

ALTER TABLE expense_status_history DROP CONSTRAINT IF EXISTS chk_history_to_status;
ALTER TABLE expense_status_history ADD CONSTRAINT chk_history_to_status
    CHECK (to_status IN ('DRAFT','SUBMITTED','AI_APPROVED','PENDING_REVIEW',
                         'MANAGER_APPROVED','MANAGER_REJECTED','FINANCE_APPROVED',
                         'FINANCE_REJECTED','PAID','CANCELLED','NEEDS_REVISION','OCR_FAILED'));
