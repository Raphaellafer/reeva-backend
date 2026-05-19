-- Reset demo reimbursement data and leave the company ready for a fresh project.
-- The new project intentionally has no members assigned yet.

DELETE FROM expense_comments
WHERE expense_id IN (
    SELECT id FROM expenses
    WHERE company_id = '00000000-0000-0000-0000-000000000001'
);

DELETE FROM expense_status_history
WHERE expense_id IN (
    SELECT id FROM expenses
    WHERE company_id = '00000000-0000-0000-0000-000000000001'
);

DELETE FROM expense_attachments
WHERE expense_id IN (
    SELECT id FROM expenses
    WHERE company_id = '00000000-0000-0000-0000-000000000001'
);

DELETE FROM cash_transactions
WHERE company_id = '00000000-0000-0000-0000-000000000001';

DELETE FROM project_financial_entries
WHERE company_id = '00000000-0000-0000-0000-000000000001';

DELETE FROM expenses
WHERE company_id = '00000000-0000-0000-0000-000000000001';

DELETE FROM project_members
WHERE project_id IN (
    SELECT id FROM projects
    WHERE company_id = '00000000-0000-0000-0000-000000000001'
);

UPDATE bank_accounts
SET project_id = NULL,
    opening_balance = 200000.00,
    current_balance = 200000.00,
    opening_balance_date = '2026-01-01'
WHERE company_id = '00000000-0000-0000-0000-000000000001';

DELETE FROM projects
WHERE company_id = '00000000-0000-0000-0000-000000000001';

INSERT INTO projects (
    id, company_id, name, code, description, revenue, is_active, created_by
) VALUES (
    '00000000-0000-0000-0000-000000000200',
    '00000000-0000-0000-0000-000000000001',
    'Projeto Viagem da Reeva',
    'VIAGEM-REEVA',
    'Projeto de viagem da Reeva, criado sem funcionarios vinculados.',
    100000.00,
    TRUE,
    '00000000-0000-0000-0000-000000000020'
);
