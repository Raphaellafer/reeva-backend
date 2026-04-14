-- ============================================================
-- REEVA - Dados de exemplo para desenvolvimento
-- Flyway migration: V2__seed_demo.sql
-- ATENÇÃO: não usar em produção
-- ============================================================

INSERT INTO companies (id, name, cnpj, email, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Reeva Demo', '00.000.000/0001-00', 'demo@reeva.com.br', 'PRO');

INSERT INTO departments (id, company_id, name, cost_center)
VALUES
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Engenharia', 'CC-001'),
    ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Comercial',  'CC-002'),
    ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Financeiro', 'CC-003');

INSERT INTO expense_policies (company_id, category, max_amount, requires_receipt)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'FOOD',      150.00, TRUE),
    ('00000000-0000-0000-0000-000000000001', 'TRANSPORT', 300.00, TRUE),
    ('00000000-0000-0000-0000-000000000001', 'LODGING',   800.00, TRUE),
    ('00000000-0000-0000-0000-000000000001', 'PURCHASE',  500.00, TRUE);
