CREATE TABLE IF NOT EXISTS projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    code        VARCHAR(80),
    description TEXT,
    revenue     NUMERIC(14, 2),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS project_members (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

INSERT INTO projects (id, company_id, name, code, description, created_by)
VALUES (
    '00000000-0000-0000-0000-000000000100',
    '00000000-0000-0000-0000-000000000001',
    'Projeto Demo',
    'DEMO',
    'Projeto padrao para despesas existentes.',
    '00000000-0000-0000-0000-000000000020'
) ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO project_members (project_id, user_id, assigned_by)
SELECT
    '00000000-0000-0000-0000-000000000100',
    u.id,
    '00000000-0000-0000-0000-000000000020'
FROM users u
WHERE u.company_id = '00000000-0000-0000-0000-000000000001'
  AND u.role = 'EMPLOYEE'
ON CONFLICT (project_id, user_id) DO NOTHING;

UPDATE expenses
SET project_id = '00000000-0000-0000-0000-000000000100'
WHERE project_id IS NULL
  AND company_id = '00000000-0000-0000-0000-000000000001';

ALTER TABLE expenses ALTER COLUMN project_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project ON expenses(project_id);

CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
