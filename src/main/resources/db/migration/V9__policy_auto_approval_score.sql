ALTER TABLE expense_policies
    ADD COLUMN IF NOT EXISTS auto_approval_min_score SMALLINT NOT NULL DEFAULT 90;

ALTER TABLE expense_policies
    ADD CONSTRAINT chk_policies_auto_approval_min_score
    CHECK (auto_approval_min_score BETWEEN 0 AND 100);
