-- ============================================================
-- REEVA - Usuários de teste para desenvolvimento
-- Senha de todos: reeva123
-- ============================================================

-- Gestor
INSERT INTO users (id, company_id, department_id, name, email, password_hash, role)
VALUES (
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000010',
    'Ana Gestora',
    'gestor@reeva.com.br',
    crypt('reeva123', gen_salt('bf', 10)),
    'MANAGER'
) ON CONFLICT (email) DO NOTHING;

-- Funcionário (reporta para a gestora)
INSERT INTO users (id, company_id, department_id, name, email, password_hash, role, manager_id)
VALUES (
    '00000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000010',
    'Bruno Funcionario',
    'funcionario@reeva.com.br',
    crypt('reeva123', gen_salt('bf', 10)),
    'EMPLOYEE',
    '00000000-0000-0000-0000-000000000020'
) ON CONFLICT (email) DO NOTHING;
