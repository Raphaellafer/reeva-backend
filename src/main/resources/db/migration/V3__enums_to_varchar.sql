-- ============================================================
-- Converte colunas de enum nativo PG para VARCHAR + CHECK
-- Motivo: Hibernate 6 não faz cast automático para tipos enum
-- nativos do PostgreSQL ao salvar via JDBC
-- ============================================================

-- users.role
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20) USING role::text;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'EMPLOYEE';
ALTER TABLE users ADD CONSTRAINT chk_users_role
    CHECK (role IN ('EMPLOYEE','MANAGER','FINANCE','ADMIN'));

-- expenses.status
ALTER TABLE expenses ALTER COLUMN status TYPE VARCHAR(20) USING status::text;
ALTER TABLE expenses ALTER COLUMN status SET DEFAULT 'DRAFT';
ALTER TABLE expenses ADD CONSTRAINT chk_expenses_status
    CHECK (status IN ('DRAFT','SUBMITTED','AI_APPROVED','PENDING_REVIEW',
                      'MANAGER_APPROVED','MANAGER_REJECTED','FINANCE_APPROVED',
                      'FINANCE_REJECTED','PAID','CANCELLED'));

-- expenses.ai_alert_level
ALTER TABLE expenses ALTER COLUMN ai_alert_level TYPE VARCHAR(10) USING ai_alert_level::text;
ALTER TABLE expenses ALTER COLUMN ai_alert_level SET DEFAULT 'NONE';
ALTER TABLE expenses ADD CONSTRAINT chk_expenses_ai_alert
    CHECK (ai_alert_level IN ('NONE','MEDIUM','HIGH'));

-- expenses.category
ALTER TABLE expenses ALTER COLUMN category TYPE VARCHAR(20) USING category::text;
ALTER TABLE expenses ADD CONSTRAINT chk_expenses_category
    CHECK (category IN ('FOOD','TRANSPORT','LODGING','PURCHASE'));

-- expenses.payment_method
ALTER TABLE expenses ALTER COLUMN payment_method TYPE VARCHAR(20) USING payment_method::text;
ALTER TABLE expenses ALTER COLUMN payment_method SET DEFAULT 'OTHER';
ALTER TABLE expenses ADD CONSTRAINT chk_expenses_payment_method
    CHECK (payment_method IN ('CASH','CREDIT_CARD','DEBIT_CARD','PIX','CORPORATE_CARD','OTHER'));

-- expense_attachments.attachment_type
ALTER TABLE expense_attachments ALTER COLUMN attachment_type TYPE VARCHAR(20) USING attachment_type::text;
ALTER TABLE expense_attachments ALTER COLUMN attachment_type SET DEFAULT 'RECEIPT_IMAGE';
ALTER TABLE expense_attachments ADD CONSTRAINT chk_attachments_type
    CHECK (attachment_type IN ('RECEIPT_IMAGE','RECEIPT_PDF','INVOICE','OTHER'));

-- expense_status_history.from_status
ALTER TABLE expense_status_history ALTER COLUMN from_status TYPE VARCHAR(20) USING from_status::text;

-- expense_status_history.to_status
ALTER TABLE expense_status_history ALTER COLUMN to_status TYPE VARCHAR(20) USING to_status::text;
ALTER TABLE expense_status_history ADD CONSTRAINT chk_history_to_status
    CHECK (to_status IN ('DRAFT','SUBMITTED','AI_APPROVED','PENDING_REVIEW',
                         'MANAGER_APPROVED','MANAGER_REJECTED','FINANCE_APPROVED',
                         'FINANCE_REJECTED','PAID','CANCELLED'));

-- expense_policies.category
ALTER TABLE expense_policies ALTER COLUMN category TYPE VARCHAR(20) USING category::text;
ALTER TABLE expense_policies ADD CONSTRAINT chk_policies_category
    CHECK (category IN ('FOOD','TRANSPORT','LODGING','PURCHASE'));

-- audit_logs.ip_address: inet -> VARCHAR (Hibernate não suporta inet nativamente)
ALTER TABLE audit_logs ALTER COLUMN ip_address TYPE VARCHAR(45) USING ip_address::text;

-- Drop native enum types (já não são usados)
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS expense_status;
DROP TYPE IF EXISTS ai_alert_level;
DROP TYPE IF EXISTS expense_category;
DROP TYPE IF EXISTS attachment_type;
DROP TYPE IF EXISTS payment_method;
