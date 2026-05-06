-- Demo CFO user for the executive dashboard.
-- Password: reeva123
INSERT INTO users (id, company_id, department_id, name, email, password_hash, role)
VALUES (
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000010',
    'Carla CFO',
    'cfo@reeva.com.br',
    crypt('reeva123', gen_salt('bf', 10)),
    'FINANCE'
) ON CONFLICT (email) DO NOTHING;
