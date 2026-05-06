CREATE TABLE IF NOT EXISTS project_financial_entries (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type              VARCHAR(30) NOT NULL,
    category          VARCHAR(60) NOT NULL,
    description       TEXT,
    amount            NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    currency          CHAR(3) NOT NULL DEFAULT 'BRL',
    entry_date        DATE NOT NULL,
    source            VARCHAR(40) NOT NULL DEFAULT 'AI_GENERATED_DEMO',
    ai_model          VARCHAR(100),
    ai_prompt_summary TEXT,
    created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_project_financial_entries_type
        CHECK (type IN ('REVENUE', 'GENERAL_EXPENSE')),
    CONSTRAINT chk_project_financial_entries_source
        CHECK (source IN ('AI_GENERATED_DEMO', 'MANUAL', 'IMPORT'))
);

CREATE INDEX IF NOT EXISTS idx_project_financial_entries_company
    ON project_financial_entries(company_id);

CREATE INDEX IF NOT EXISTS idx_project_financial_entries_project_date
    ON project_financial_entries(project_id, entry_date);

CREATE INDEX IF NOT EXISTS idx_project_financial_entries_type
    ON project_financial_entries(type);

CREATE TRIGGER trg_project_financial_entries_updated_at
    BEFORE UPDATE ON project_financial_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO project_financial_entries (
    id, company_id, project_id, type, category, description, amount, currency,
    entry_date, source, ai_model, ai_prompt_summary
) VALUES
    ('00000000-0000-0000-0014-000000000001',
     '00000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000100',
     'REVENUE', 'SERVICE_CONTRACT',
     'Receita demo de contrato mensal do Projeto Demo',
     28000.00, 'BRL', '2026-02-28', 'AI_GENERATED_DEMO',
     'seed-demo', 'Seed demo para performance financeira por projeto'),
    ('00000000-0000-0000-0014-000000000002',
     '00000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000100',
     'REVENUE', 'SERVICE_CONTRACT',
     'Receita demo de expansao do Projeto Demo',
     31000.00, 'BRL', '2026-03-31', 'AI_GENERATED_DEMO',
     'seed-demo', 'Seed demo para performance financeira por projeto'),
    ('00000000-0000-0000-0014-000000000003',
     '00000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000100',
     'REVENUE', 'SERVICE_CONTRACT',
     'Receita demo de renovacao do Projeto Demo',
     26000.00, 'BRL', '2026-04-30', 'AI_GENERATED_DEMO',
     'seed-demo', 'Seed demo para performance financeira por projeto'),
    ('00000000-0000-0000-0014-000000000004',
     '00000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000100',
     'GENERAL_EXPENSE', 'SOFTWARE',
     'Ferramentas demo usadas pela equipe do projeto',
     2200.00, 'BRL', '2026-02-05', 'AI_GENERATED_DEMO',
     'seed-demo', 'Seed demo para performance financeira por projeto'),
    ('00000000-0000-0000-0014-000000000005',
     '00000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000100',
     'GENERAL_EXPENSE', 'SUPPLIER',
     'Fornecedor demo de apoio operacional',
     3800.00, 'BRL', '2026-03-12', 'AI_GENERATED_DEMO',
     'seed-demo', 'Seed demo para performance financeira por projeto'),
    ('00000000-0000-0000-0014-000000000006',
     '00000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000100',
     'GENERAL_EXPENSE', 'MARKETING',
     'Acao demo de relacionamento vinculada ao projeto',
     4500.00, 'BRL', '2026-04-15', 'AI_GENERATED_DEMO',
     'seed-demo', 'Seed demo para performance financeira por projeto')
ON CONFLICT (id) DO NOTHING;
