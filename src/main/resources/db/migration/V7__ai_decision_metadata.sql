ALTER TABLE expenses ADD COLUMN IF NOT EXISTS ai_decision VARCHAR(40);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS ai_decision_reason TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS policy_compliant BOOLEAN;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS policy_violation_reason TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS sefaz_status VARCHAR(30);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS sefaz_validation_message TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS auto_approval_eligible BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS manual_review_reason TEXT;

ALTER TABLE expenses ADD CONSTRAINT chk_expenses_ai_decision
    CHECK (ai_decision IS NULL OR ai_decision IN (
        'AUTO_APPROVED',
        'READY_FOR_MANAGER',
        'NEEDS_EMPLOYEE_CORRECTION',
        'REJECTED_BY_POLICY',
        'PENDING_MANUAL_REVIEW'
    ));

ALTER TABLE expenses ADD CONSTRAINT chk_expenses_sefaz_status
    CHECK (sefaz_status IS NULL OR sefaz_status IN (
        'NOT_APPLICABLE',
        'PENDING',
        'VALID',
        'INVALID',
        'UNAVAILABLE'
    ));

