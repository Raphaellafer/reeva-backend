ALTER TABLE expense_attachments ADD COLUMN IF NOT EXISTS file_sha256 VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_expense_attachments_file_sha256
    ON expense_attachments(file_sha256)
    WHERE file_sha256 IS NOT NULL;

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS chk_expenses_ai_decision;
ALTER TABLE expenses ADD CONSTRAINT chk_expenses_ai_decision
    CHECK (ai_decision IS NULL OR ai_decision IN (
        'AUTO_APPROVED',
        'READY_FOR_MANAGER',
        'NEEDS_EMPLOYEE_CORRECTION',
        'REJECTED_BY_POLICY',
        'PENDING_MANUAL_REVIEW',
        'DUPLICATE_REJECTED'
    ));
