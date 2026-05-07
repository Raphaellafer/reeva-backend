ALTER TABLE expenses DROP CONSTRAINT IF EXISTS chk_expenses_ai_decision;

ALTER TABLE expenses ADD CONSTRAINT chk_expenses_ai_decision
    CHECK (ai_decision IS NULL OR ai_decision IN (
        'AUTO_APPROVED',
        'READY_FOR_MANAGER',
        'NEEDS_EMPLOYEE_CORRECTION',
        'REJECTED_BY_POLICY',
        'REJECTED_BY_FISCAL_VALIDATION',
        'PENDING_MANUAL_REVIEW',
        'DUPLICATE_REJECTED'
    ));
