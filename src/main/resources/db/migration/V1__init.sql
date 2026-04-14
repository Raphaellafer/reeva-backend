-- ============================================================
-- REEVA - Schema inicial
-- Flyway migration: V1__init.sql
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM (
    'EMPLOYEE',
    'MANAGER',
    'FINANCE',
    'ADMIN'
);

CREATE TYPE expense_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'AI_APPROVED',
    'PENDING_REVIEW',
    'MANAGER_APPROVED',
    'MANAGER_REJECTED',
    'FINANCE_APPROVED',
    'FINANCE_REJECTED',
    'PAID',
    'CANCELLED'
);

CREATE TYPE ai_alert_level AS ENUM (
    'NONE',
    'MEDIUM',
    'HIGH'
);

CREATE TYPE expense_category AS ENUM (
    'FOOD',
    'TRANSPORT',
    'LODGING',
    'PURCHASE'
);

CREATE TYPE attachment_type AS ENUM (
    'RECEIPT_IMAGE',
    'RECEIPT_PDF',
    'INVOICE',
    'OTHER'
);

CREATE TYPE payment_method AS ENUM (
    'CASH',
    'CREDIT_CARD',
    'DEBIT_CARD',
    'PIX',
    'CORPORATE_CARD',
    'OTHER'
);

-- ============================================================
-- COMPANIES (multi-tenant)
-- ============================================================

CREATE TABLE companies (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255)    NOT NULL,
    cnpj        VARCHAR(18)     UNIQUE,
    email       VARCHAR(255)    NOT NULL UNIQUE,
    logo_url    TEXT,
    plan        VARCHAR(50)     NOT NULL DEFAULT 'FREE',
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DEPARTMENTS
-- ============================================================

CREATE TABLE departments (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID            NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(255)    NOT NULL,
    cost_center VARCHAR(100),
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, name)
);

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    department_id   UUID        REFERENCES departments(id) ON DELETE SET NULL,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT        NOT NULL,
    role            user_role   NOT NULL DEFAULT 'EMPLOYEE',
    manager_id      UUID        REFERENCES users(id) ON DELETE SET NULL,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EXPENSE POLICIES
-- ============================================================

CREATE TABLE expense_policies (
    id               UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id       UUID             NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category         expense_category NOT NULL,
    max_amount       NUMERIC(12, 2)   NOT NULL,
    daily_limit      NUMERIC(12, 2),
    monthly_limit    NUMERIC(12, 2),
    requires_receipt BOOLEAN          NOT NULL DEFAULT TRUE,
    description      TEXT,
    is_active        BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, category)
);

-- ============================================================
-- EXPENSES
-- ============================================================

CREATE TABLE expenses (
    id                  UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID             NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id             UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id       UUID             REFERENCES departments(id) ON DELETE SET NULL,

    title               VARCHAR(255)     NOT NULL,
    description         TEXT,
    category            expense_category NOT NULL,
    amount              NUMERIC(12, 2)   NOT NULL CHECK (amount > 0),
    currency            CHAR(3)          NOT NULL DEFAULT 'BRL',
    payment_method      payment_method   NOT NULL DEFAULT 'OTHER',
    expense_date        DATE             NOT NULL,

    status              expense_status   NOT NULL DEFAULT 'DRAFT',

    ai_score            SMALLINT         CHECK (ai_score BETWEEN 0 AND 100),
    ai_alert_level      ai_alert_level   NOT NULL DEFAULT 'NONE',
    ai_analysis         TEXT,
    ai_checked_at       TIMESTAMPTZ,

    manager_id          UUID             REFERENCES users(id) ON DELETE SET NULL,
    manager_reviewed_at TIMESTAMPTZ,
    manager_notes       TEXT,

    finance_id          UUID             REFERENCES users(id) ON DELETE SET NULL,
    finance_reviewed_at TIMESTAMPTZ,
    finance_notes       TEXT,

    paid_at             TIMESTAMPTZ,
    payment_reference   VARCHAR(255),

    is_deleted          BOOLEAN          NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EXPENSE ATTACHMENTS
-- ============================================================

CREATE TABLE expense_attachments (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id      UUID            NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    uploaded_by     UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name       VARCHAR(255)    NOT NULL,
    file_url        TEXT            NOT NULL,
    file_size_kb    INTEGER,
    mime_type       VARCHAR(100),
    attachment_type attachment_type NOT NULL DEFAULT 'RECEIPT_IMAGE',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EXPENSE STATUS HISTORY
-- ============================================================

CREATE TABLE expense_status_history (
    id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id  UUID           NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    changed_by  UUID           REFERENCES users(id) ON DELETE SET NULL,
    from_status expense_status,
    to_status   expense_status NOT NULL,
    ai_score    SMALLINT,
    notes       TEXT,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EXPENSE COMMENTS
-- ============================================================

CREATE TABLE expense_comments (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id  UUID        NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT        NOT NULL,
    is_internal BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID        REFERENCES companies(id) ON DELETE SET NULL,
    user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id   UUID,
    metadata    JSONB,
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REFRESH TOKENS
-- ============================================================

CREATE TABLE refresh_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT        NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_expenses_company        ON expenses(company_id);
CREATE INDEX idx_expenses_user           ON expenses(user_id);
CREATE INDEX idx_expenses_status         ON expenses(status);
CREATE INDEX idx_expenses_ai_alert       ON expenses(ai_alert_level);
CREATE INDEX idx_expenses_date           ON expenses(expense_date);
CREATE INDEX idx_expenses_company_status ON expenses(company_id, status);
CREATE INDEX idx_expenses_pending_manager ON expenses(manager_id, status) WHERE status = 'PENDING_REVIEW';

CREATE INDEX idx_status_history_expense  ON expense_status_history(expense_id);
CREATE INDEX idx_status_history_created  ON expense_status_history(created_at);

CREATE INDEX idx_comments_expense        ON expense_comments(expense_id);
CREATE INDEX idx_attachments_expense     ON expense_attachments(expense_id);

CREATE INDEX idx_audit_company           ON audit_logs(company_id);
CREATE INDEX idx_audit_user              ON audit_logs(user_id);
CREATE INDEX idx_audit_entity            ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created           ON audit_logs(created_at);

CREATE INDEX idx_users_company           ON users(company_id);
CREATE INDEX idx_users_department        ON users(department_id);
CREATE INDEX idx_users_manager           ON users(manager_id);

CREATE INDEX idx_departments_company     ON departments(company_id);
CREATE INDEX idx_refresh_tokens_user     ON refresh_tokens(user_id);

-- ============================================================
-- TRIGGERS: updated_at automático
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated_at
    BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_departments_updated_at
    BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_expenses_updated_at
    BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_comments_updated_at
    BEFORE UPDATE ON expense_comments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_policies_updated_at
    BEFORE UPDATE ON expense_policies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
