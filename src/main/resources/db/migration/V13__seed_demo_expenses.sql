-- ============================================================
-- REEVA - Dados de demonstração: despesas ricas para análise de IA
-- Flyway migration: V13__seed_demo_expenses.sql
-- ATENÇÃO: não usar em produção
-- ============================================================

-- Faturamento do Projeto Demo (base para análise de custo x receita pela IA)
UPDATE projects
SET revenue = 85000.00
WHERE id = '00000000-0000-0000-0000-000000000100';

-- Usuários adicionais para variedade nos dados
INSERT INTO users (id, company_id, department_id, name, email, password_hash, role, manager_id)
VALUES
    ('00000000-0000-0000-0000-000000000022',
     '00000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000011',
     'Carlos Vendas', 'carlos@reeva.com.br',
     crypt('reeva123', gen_salt('bf', 10)), 'EMPLOYEE',
     '00000000-0000-0000-0000-000000000020'),
    ('00000000-0000-0000-0000-000000000023',
     '00000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000010',
     'Diana Engenharia', 'diana@reeva.com.br',
     crypt('reeva123', gen_salt('bf', 10)), 'EMPLOYEE',
     '00000000-0000-0000-0000-000000000020')
ON CONFLICT (email) DO NOTHING;

INSERT INTO project_members (project_id, user_id, assigned_by)
VALUES
    ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000020'),
    ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000020')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- ============================================================
-- DESPESAS PAGAS — dentro da política, aprovadas e quitadas
-- ============================================================
INSERT INTO expenses (
    id, company_id, user_id, department_id, project_id,
    title, description, category, amount, currency, payment_method, expense_date,
    status, ai_score, ai_alert_level, ai_analysis, ai_checked_at,
    manager_id, manager_reviewed_at, manager_notes,
    paid_at, is_deleted
) VALUES

-- Almoço com cliente (FOOD R$89,50 — limite R$150)
('00000000-0000-0000-0002-000000000001',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000021',
 '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100',
 'Almoço com cliente — alinhamento de escopo',
 'Reunião com cliente para definição do módulo de relatórios',
 'FOOD', 89.50, 'BRL', 'CORPORATE_CARD', '2026-02-10',
 'PAID', 85, 'NONE',
 'Despesa dentro da política de alimentação. Reunião registrada na agenda.',
 '2026-02-10 14:30:00+00',
 '00000000-0000-0000-0000-000000000020', '2026-02-12 09:00:00+00', NULL,
 '2026-02-19 00:00:00+00', FALSE),

-- Uber reunião cliente (TRANSPORT R$45 — limite R$300)
('00000000-0000-0000-0002-000000000002',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000021',
 '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100',
 'Uber — deslocamento à sede do cliente',
 'Deslocamento para reunião técnica presencial',
 'TRANSPORT', 45.00, 'BRL', 'CREDIT_CARD', '2026-02-10',
 'PAID', 90, 'NONE',
 'Deslocamento necessário para reunião presencial. Valor dentro da política.',
 '2026-02-10 10:15:00+00',
 '00000000-0000-0000-0000-000000000020', '2026-02-12 09:05:00+00', NULL,
 '2026-02-19 00:00:00+00', FALSE),

-- Passagem aérea workshop (TRANSPORT R$287 — limite R$300)
('00000000-0000-0000-0002-000000000003',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000021',
 '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100',
 'Passagem aérea SP→RJ — workshop de integração',
 'Viagem para workshop com equipe do cliente no Rio de Janeiro',
 'TRANSPORT', 287.00, 'BRL', 'CORPORATE_CARD', '2026-02-18',
 'PAID', 82, 'NONE',
 'Passagem aérea para evento presencial aprovado pela gestão. Dentro do limite de transporte.',
 '2026-02-18 08:00:00+00',
 '00000000-0000-0000-0000-000000000020', '2026-02-20 10:00:00+00', NULL,
 '2026-02-27 00:00:00+00', FALSE),

-- Jantar de equipe fim de sprint (FOOD R$142 — limite R$150, próximo ao limite)
('00000000-0000-0000-0002-000000000004',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000021',
 '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100',
 'Jantar de equipe — encerramento do sprint 3',
 'Confraternização da equipe ao encerrar sprint dentro do prazo',
 'FOOD', 142.00, 'BRL', 'CORPORATE_CARD', '2026-02-28',
 'PAID', 75, 'MEDIUM',
 'Despesa coletiva de alimentação. Valor próximo ao limite individual mas justificado para evento de equipe com 4 pessoas.',
 '2026-02-28 22:00:00+00',
 '00000000-0000-0000-0000-000000000020', '2026-03-02 09:00:00+00', NULL,
 '2026-03-09 00:00:00+00', FALSE),

-- Café para apresentação executiva (FOOD R$38,50)
('00000000-0000-0000-0002-000000000005',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000021',
 '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100',
 'Café e snacks — apresentação de resultados Q1',
 'Itens de hospitalidade para executivos do cliente durante apresentação trimestral',
 'FOOD', 38.50, 'BRL', 'CREDIT_CARD', '2026-03-05',
 'PAID', 92, 'NONE',
 'Despesa de hospitalidade para reunião executiva. Valor muito abaixo do limite.',
 '2026-03-05 16:00:00+00',
 '00000000-0000-0000-0000-000000000020', '2026-03-07 09:00:00+00', NULL,
 '2026-03-14 00:00:00+00', FALSE),

-- Material de escritório (PURCHASE R$156 — limite R$500)
('00000000-0000-0000-0002-000000000006',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000021',
 '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100',
 'Material de escritório — reposição sala de reuniões',
 'Papel, canetas, post-its e marcadores para sala de reuniões',
 'PURCHASE', 156.00, 'BRL', 'CREDIT_CARD', '2026-03-08',
 'PAID', 78, 'NONE',
 'Compra de consumíveis de escritório. Valor bem dentro da política.',
 '2026-03-08 15:00:00+00',
 '00000000-0000-0000-0000-000000000020', '2026-03-10 09:00:00+00', NULL,
 '2026-03-17 00:00:00+00', FALSE),

-- Recarga transporte Diana (TRANSPORT R$90)
('00000000-0000-0000-0002-000000000007',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000023',
 '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100',
 'Recarga cartão transporte — março',
 'Recarga mensal do cartão de transporte para deslocamentos de trabalho',
 'TRANSPORT', 90.00, 'BRL', 'PIX', '2026-03-01',
 'PAID', 95, 'NONE',
 'Recarga de transporte público. Valor compatível com deslocamentos mensais.',
 '2026-03-01 12:00:00+00',
 '00000000-0000-0000-0000-000000000020', '2026-03-03 09:00:00+00', NULL,
 '2026-03-10 00:00:00+00', FALSE),

-- Lanche reunião de arquitetura (FOOD R$65)
('00000000-0000-0000-0002-000000000008',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000023',
 '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100',
 'Lanche — reunião técnica de arquitetura (5h)',
 'Reunião de 5h para definição da arquitetura do módulo de integração',
 'FOOD', 65.00, 'BRL', 'CREDIT_CARD', '2026-03-12',
 'PAID', 91, 'NONE',
 'Refeição durante reunião técnica extensa. Completamente dentro da política.',
 '2026-03-12 17:00:00+00',
 '00000000-0000-0000-0000-000000000020', '2026-03-14 09:00:00+00', NULL,
 '2026-03-21 00:00:00+00', FALSE),

-- Licença JetBrains (PURCHASE R$289)
('00000000-0000-0000-0002-000000000009',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000023',
 '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100',
 'Licença IntelliJ IDEA — renovação anual',
 'Renovação da licença da IDE principal para desenvolvimento Java',
 'PURCHASE', 289.00, 'BRL', 'CORPORATE_CARD', '2026-03-15',
 'PAID', 86, 'NONE',
 'Ferramenta essencial para desenvolvimento. Dentro da política de compras.',
 '2026-03-15 11:00:00+00',
 '00000000-0000-0000-0000-000000000020', '2026-03-17 09:00:00+00', NULL,
 '2026-03-24 00:00:00+00', FALSE),

-- Hospedagem workshop Carlos (LODGING R$380)
('00000000-0000-0000-0002-000000000010',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000022',
 '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000100',
 'Hospedagem — workshop comercial em SP',
 'Hotel por 1 noite no workshop de estratégia comercial em São Paulo',
 'LODGING', 380.00, 'BRL', 'CORPORATE_CARD', '2026-03-20',
 'PAID', 80, 'NONE',
 'Hospedagem para evento corporativo aprovado. Dentro da política.',
 '2026-03-20 22:00:00+00',
 '00000000-0000-0000-0000-000000000020', '2026-03-22 09:00:00+00', NULL,
 '2026-03-29 00:00:00+00', FALSE),

-- ============================================================
-- APROVADAS PELO GESTOR — aguardando pagamento
-- ============================================================

-- Almoço comercial Carlos (FOOD R$128)
('00000000-0000-0000-0002-000000000011',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000022',
 '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000100',
 'Almoço comercial — prospecção de novo cliente',
 'Almoço de negócios com potencial cliente do setor financeiro',
 'FOOD', 128.00, 'BRL', 'CORPORATE_CARD', '2026-04-03',
 'MANAGER_APPROVED', 89, 'NONE',
 'Despesa de representação comercial. Dentro do limite de alimentação.',
 '2026-04-03 15:00:00+00',
 '00000000-0000-0000-0000-000000000020', '2026-04-05 09:00:00+00', NULL,
 NULL, FALSE),

-- Táxi aeroporto Carlos (TRANSPORT R$78)
('00000000-0000-0000-0002-000000000012',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000022',
 '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000100',
 'Corrida app — Aeroporto Guarulhos (viagem a BH)',
 'Transporte até o aeroporto para viagem de negócios a Belo Horizonte',
 'TRANSPORT', 78.00, 'BRL', 'CREDIT_CARD', '2026-04-05',
 'MANAGER_APPROVED', 93, 'NONE',
 'Deslocamento para viagem de negócios. Dentro da política.',
 '2026-04-05 08:00:00+00',
 '00000000-0000-0000-0000-000000000020', '2026-04-07 09:00:00+00', NULL,
 NULL, FALSE),

-- Hospedagem BH Carlos (LODGING R$520)
('00000000-0000-0000-0002-000000000013',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000022',
 '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000100',
 'Hospedagem BH — visita técnica e comercial ao cliente',
 'Hotel por 1 noite para visita presencial ao cliente em Belo Horizonte',
 'LODGING', 520.00, 'BRL', 'CORPORATE_CARD', '2026-04-06',
 'MANAGER_APPROVED', 82, 'NONE',
 'Hospedagem necessária para visita presencial. Valor adequado e dentro da política.',
 '2026-04-06 22:00:00+00',
 '00000000-0000-0000-0000-000000000020', '2026-04-08 09:00:00+00', NULL,
 NULL, FALSE),

-- Impressão materiais entrega (PURCHASE R$95)
('00000000-0000-0000-0002-000000000014',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000023',
 '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100',
 'Impressão de materiais — entrega formal do projeto',
 'Relatórios técnicos e manuais impressos para entrega ao cliente',
 'PURCHASE', 95.00, 'BRL', 'CREDIT_CARD', '2026-04-10',
 'MANAGER_APPROVED', 87, 'NONE',
 'Material necessário para entrega formal. Dentro da política.',
 '2026-04-10 14:00:00+00',
 '00000000-0000-0000-0000-000000000020', '2026-04-12 09:00:00+00', NULL,
 NULL, FALSE),

-- ============================================================
-- REJEITADAS PELO GESTOR — desnecessárias / acima da política
-- ============================================================

-- Jantar Fasano — FOOD R$480 (limite R$150) — 3.2x acima
('00000000-0000-0000-0002-000000000015',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000021',
 '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100',
 'Jantar executivo com cliente — Restaurante Fasano',
 'Jantar com diretores do cliente em restaurante de alto padrão',
 'FOOD', 480.00, 'BRL', 'CORPORATE_CARD', '2026-03-18',
 'MANAGER_REJECTED', 18, 'HIGH',
 'Valor 3.2x acima do limite de alimentação (R$150). Restaurante classificado como premium. Não há justificativa de negócio para gasto desta magnitude no escopo atual do projeto.',
 '2026-03-18 23:00:00+00',
 '00000000-0000-0000-0000-000000000020', '2026-03-20 10:00:00+00',
 'Valor muito acima da política de alimentação. Restaurante premium não justificado para esta etapa do projeto. Solicitar reembolso apenas até o limite de R$150.',
 NULL, FALSE),

-- Hotel Grand Hyatt — LODGING R$1200 (limite R$800) — reunião de 3h
('00000000-0000-0000-0002-000000000016',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000022',
 '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000100',
 'Hotel Grand Hyatt SP — reunião que durou 3h',
 'Hospedagem no Grand Hyatt para reunião com duração de apenas 3 horas',
 'LODGING', 1200.00, 'BRL', 'CORPORATE_CARD', '2026-03-25',
 'MANAGER_REJECTED', 12, 'HIGH',
 'Valor 50% acima do limite de hospedagem (R$800). Hotel 5 estrelas incompatível com a política corporativa. A reunião teve duração de apenas 3h, sem necessidade de pernoite confirmada.',
 '2026-03-25 23:00:00+00',
 '00000000-0000-0000-0000-000000000020', '2026-03-27 09:00:00+00',
 'Hospedagem em hotel 5 estrelas sem justificativa. Reunião de 3h não requer pernoite. Despesa não reembolsável conforme política vigente.',
 NULL, FALSE),

-- Presentes corporativos — PURCHASE R$320 (fora da política)
('00000000-0000-0000-0002-000000000017',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000022',
 '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000100',
 'Kit de presentes corporativos para executivos do cliente',
 'Vinhos, chocolates e brindes para diretores do cliente',
 'PURCHASE', 320.00, 'BRL', 'CORPORATE_CARD', '2026-04-08',
 'MANAGER_REJECTED', 35, 'MEDIUM',
 'Despesa de presente não está prevista na política de compras. Categoria discricionária. Não existe verba aprovada para brindes corporativos neste projeto.',
 '2026-04-08 16:00:00+00',
 '00000000-0000-0000-0000-000000000020', '2026-04-10 09:00:00+00',
 'Compra de presentes não está coberta pela política de reembolso. Não há verba de brindes aprovada para este projeto.',
 NULL, FALSE),

-- ============================================================
-- NEEDS_REVISION — suspeitas, aguardando esclarecimento
-- ============================================================

-- Triplo gasto em alimentação no mesmo dia (R$148 — 1 de 3)
('00000000-0000-0000-0002-000000000018',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000021',
 '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100',
 'Almoço equipe — reunião de planning (despesa 1 de 3 no dia)',
 'Almoço durante reunião de planning do sprint',
 'FOOD', 148.00, 'BRL', 'CORPORATE_CARD', '2026-04-01',
 'NEEDS_REVISION', 38, 'MEDIUM',
 'Detectadas 3 despesas de alimentação registradas no mesmo dia pelo mesmo usuário. Total do dia ultrapassa 2.5x o limite diário esperado. Solicitada revisão para confirmar se todas as refeições têm justificativa distinta.',
 '2026-04-01 22:00:00+00',
 NULL, NULL, NULL,
 NULL, FALSE),

-- Transporte executivo premium — TRANSPORT R$580 (limite R$300)
('00000000-0000-0000-0002-000000000019',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000021',
 '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100',
 'Transporte executivo premium — motorista particular',
 'Serviço de motorista particular para deslocamentos durante o dia',
 'TRANSPORT', 580.00, 'BRL', 'CORPORATE_CARD', '2026-04-14',
 'NEEDS_REVISION', 22, 'HIGH',
 'Valor 93% acima do limite de transporte (R$300). Modalidade "motorista particular" não está nas categorias aprovadas pela política. Justificativa necessária antes do reembolso.',
 '2026-04-14 22:00:00+00',
 NULL, NULL, NULL,
 NULL, FALSE),

-- Monitor home office — PURCHASE R$890 (limite R$500)
('00000000-0000-0000-0002-000000000020',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000023',
 '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100',
 'Monitor ultrawide 34" — home office',
 'Compra de monitor para trabalho remoto',
 'PURCHASE', 890.00, 'BRL', 'CREDIT_CARD', '2026-04-16',
 'NEEDS_REVISION', 20, 'HIGH',
 'Valor 78% acima do limite de compras (R$500). Equipamento de home office não consta na política de reembolso padrão. Necessária aprovação prévia da gestão para aquisições acima do limite.',
 '2026-04-16 17:00:00+00',
 NULL, NULL, NULL,
 NULL, FALSE),

-- ============================================================
-- PENDING_REVIEW — submetidas, aguardando gestor
-- ============================================================

-- Lanche horas extras (FOOD R$112)
('00000000-0000-0000-0002-000000000021',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000023',
 '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100',
 'Lanche equipe — horas extras no deadline de entrega',
 'Lanches durante trabalho após expediente para cumprimento do prazo',
 'FOOD', 112.00, 'BRL', 'CREDIT_CARD', '2026-04-22',
 'PENDING_REVIEW', 79, 'NONE',
 'Despesa de alimentação durante hora extra. Dentro da política.',
 '2026-04-22 23:00:00+00',
 NULL, NULL, NULL,
 NULL, FALSE),

-- Táxi homologação (TRANSPORT R$55)
('00000000-0000-0000-0002-000000000022',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000023',
 '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100',
 'Táxi — reunião de homologação na prefeitura',
 'Deslocamento para reunião com órgão municipal para homologação do sistema',
 'TRANSPORT', 55.00, 'BRL', 'CASH', '2026-04-25',
 'PENDING_REVIEW', 91, 'NONE',
 'Deslocamento para reunião governamental. Dentro da política.',
 '2026-04-25 15:00:00+00',
 NULL, NULL, NULL,
 NULL, FALSE),

-- Postman Team (PURCHASE R$199)
('00000000-0000-0000-0002-000000000023',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000023',
 '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100',
 'Assinatura Postman Team — 3 meses',
 'Ferramenta de testes de API para a equipe de desenvolvimento',
 'PURCHASE', 199.00, 'BRL', 'CORPORATE_CARD', '2026-04-28',
 'PENDING_REVIEW', 84, 'NONE',
 'Ferramenta de desenvolvimento essencial para equipe. Dentro da política.',
 '2026-04-28 14:00:00+00',
 NULL, NULL, NULL,
 NULL, FALSE),

-- ============================================================
-- SUBMITTED — recentes, aguardando processamento pela IA
-- ============================================================

-- Almoço com CEO visitante (FOOD R$135)
('00000000-0000-0000-0002-000000000024',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000021',
 '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100',
 'Almoço com CEO parceiro — visita ao Brasil',
 'Almoço de boas-vindas para CEO de empresa parceira em visita',
 'FOOD', 135.00, 'BRL', 'CORPORATE_CARD', '2026-05-02',
 'SUBMITTED', NULL, 'NONE', NULL, NULL,
 NULL, NULL, NULL,
 NULL, FALSE),

-- Uber conferência tech (TRANSPORT R$42)
('00000000-0000-0000-0002-000000000025',
 '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000021',
 '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100',
 'Uber — conferência de tecnologia (atualização técnica)',
 'Transporte para evento de tecnologia para atualização da equipe',
 'TRANSPORT', 42.00, 'BRL', 'CREDIT_CARD', '2026-05-03',
 'SUBMITTED', NULL, 'NONE', NULL, NULL,
 NULL, NULL, NULL,
 NULL, FALSE);

-- ============================================================
-- COMENTÁRIOS DO GESTOR nas despesas rejeitadas
-- ============================================================
INSERT INTO expense_comments (id, expense_id, user_id, content, is_internal)
VALUES
    ('00000000-0000-0000-0004-000000000001',
     '00000000-0000-0000-0002-000000000015',
     '00000000-0000-0000-0000-000000000020',
     'Valor muito acima da política (limite R$150). Por favor, solicite reembolso apenas do valor máximo permitido ou justifique o gasto excepcional com aprovação prévia da diretoria.',
     FALSE),
    ('00000000-0000-0000-0004-000000000002',
     '00000000-0000-0000-0002-000000000016',
     '00000000-0000-0000-0000-000000000020',
     'Hotel 5 estrelas não está dentro da política corporativa de hospedagem. Além disso, a reunião de 3h não justificaria pernoite. Despesa não reembolsável.',
     FALSE),
    ('00000000-0000-0000-0004-000000000003',
     '00000000-0000-0000-0002-000000000017',
     '00000000-0000-0000-0000-000000000020',
     'Presentes não estão cobertos pela política de reembolso. Se houver necessidade de brindes, isso precisa ser aprovado previamente com verba específica.',
     FALSE),
    ('00000000-0000-0000-0004-000000000004',
     '00000000-0000-0000-0002-000000000019',
     '00000000-0000-0000-0000-000000000020',
     'Motorista particular não está listado como modalidade de transporte na política. Por favor, apresente justificativa ou substitua por transporte por aplicativo dentro do limite.',
     TRUE);
