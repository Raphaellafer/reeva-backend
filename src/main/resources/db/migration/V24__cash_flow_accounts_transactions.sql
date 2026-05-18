CREATE TABLE IF NOT EXISTS bank_accounts (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id           UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id           UUID REFERENCES projects(id) ON DELETE SET NULL,
    bank_name            VARCHAR(120) NOT NULL,
    account_name         VARCHAR(120) NOT NULL,
    agency               VARCHAR(20),
    account_number       VARCHAR(40),
    opening_balance      NUMERIC(14, 2) NOT NULL,
    current_balance      NUMERIC(14, 2) NOT NULL,
    opening_balance_date DATE NOT NULL,
    active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_company
    ON bank_accounts(company_id);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_project
    ON bank_accounts(project_id);

CREATE TRIGGER trg_bank_accounts_updated_at
    BEFORE UPDATE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS cash_transactions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id         UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    bank_account_id    UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    project_id         UUID REFERENCES projects(id) ON DELETE SET NULL,
    expense_id         UUID UNIQUE REFERENCES expenses(id) ON DELETE SET NULL,
    transaction_date   DATE NOT NULL,
    description        TEXT NOT NULL,
    type               VARCHAR(20) NOT NULL,
    category           VARCHAR(40) NOT NULL,
    amount             NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    balance_after      NUMERIC(14, 2) NOT NULL,
    source             VARCHAR(40) NOT NULL,
    external_reference VARCHAR(255),
    created_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_cash_transactions_type
        CHECK (type IN ('INFLOW', 'OUTFLOW')),
    CONSTRAINT chk_cash_transactions_category
        CHECK (category IN ('REVENUE', 'SUPPLIER', 'REIMBURSEMENT', 'SOFTWARE', 'TAX', 'PAYROLL', 'ADJUSTMENT', 'OTHER')),
    CONSTRAINT chk_cash_transactions_source
        CHECK (source IN ('MANUAL', 'IMPORT', 'REIMBURSEMENT_PAYMENT', 'DEMO_SEED'))
);

CREATE INDEX IF NOT EXISTS idx_cash_transactions_company_date
    ON cash_transactions(company_id, transaction_date);

CREATE INDEX IF NOT EXISTS idx_cash_transactions_account_date
    ON cash_transactions(bank_account_id, transaction_date);

CREATE INDEX IF NOT EXISTS idx_cash_transactions_project_date
    ON cash_transactions(project_id, transaction_date);

INSERT INTO bank_accounts (
    id, company_id, bank_name, account_name, agency, account_number,
    opening_balance, current_balance, opening_balance_date
) VALUES (
    '00000000-0000-0000-0024-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Banco Demo',
    'Conta Operacional Reeva',
    '0001',
    '12345-6',
    250000.00,
    250000.00,
    '2026-01-01'
) ON CONFLICT (id) DO NOTHING;
