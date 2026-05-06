# Reeva: Como o Produto Esta Funcionando Hoje

Este documento explica o estado atual do projeto para apresentar ao time: perfis de usuario, telas, fluxos, dados reais vs mockados, e o papel dos arquivos SQL de migration.

## Resumo Executivo

A Reeva hoje esta organizada em tres experiencias:

- Funcionario: envia notas, acompanha historico e ve detalhes do proprio reembolso.
- Gestor: aprova, rejeita, pede revisao, gerencia politicas, projetos e pagamentos aprovados.
- CFO: ve uma camada executiva. Parte ainda usa mock, mas a tela de Performance por Projeto ja usa dados reais calculados no backend.

O core que comecou a ser implementado para CFO e:

```text
Projeto = centro da analise
Receita demo = contexto financeiro
Despesas gerais demo = custo operacional
Reembolsos = custo controlavel real da Reeva
IA = mecanismo para economia, perdas evitaveis e recomendacao
```

## Logins Demo

Todos usam a senha:

```text
reeva123
```

### Funcionario

```text
funcionario@reeva.com.br
```

Role no backend:

```text
EMPLOYEE
```

Rota inicial:

```text
/funcionario
```

### Gestor

```text
gestor@reeva.com.br
```

Role no backend:

```text
MANAGER
```

Rota inicial:

```text
/gerente
```

### CFO

```text
cfo@reeva.com.br
```

Role no backend:

```text
FINANCE
```

Rota inicial:

```text
/cfo
```

Observacao importante:

`gestor@reeva.com.br` nao e CFO. Ele e gestor. Por isso ele nao ve o menu "ROI Corporativo".

## Como o Login Decide a Tela

O backend retorna uma role:

```text
EMPLOYEE
MANAGER
FINANCE
ADMIN
```

O frontend transforma isso em uma role de tela:

```text
EMPLOYEE -> FUNCIONARIO
MANAGER  -> GERENTE
FINANCE  -> CFO
ADMIN    -> CFO
```

Depois salva essa role no `localStorage` e redireciona:

```text
FUNCIONARIO -> /funcionario
GERENTE     -> /gerente
CFO         -> /cfo
```

Arquivos envolvidos:

- `frontend/src/pages/Login.tsx`
- `frontend/src/types/index.ts`
- `frontend/src/hooks/useAuth.ts`
- `frontend/src/router/index.tsx`

## Telas do Funcionario

As telas de funcionario usam layout mobile.

Menu inferior:

```text
Home
Enviar
Historico
Perfil
```

### `/funcionario` - Home

Arquivo:

```text
frontend/src/pages/funcionario/F01Home.tsx
```

Mostra:

- nome do funcionario;
- total aprovado;
- quantidade de notas aprovadas, pendentes e rejeitadas;
- notas recentes.

Dados:

Usa dados reais do backend via:

```http
GET /api/v1/expenses/my
```

### `/funcionario/enviar` - Enviar Nota Fiscal

Arquivo:

```text
frontend/src/pages/funcionario/F02EnviarNF.tsx
```

Permite:

- tirar foto ou escolher imagem da nota;
- selecionar projeto;
- selecionar categoria;
- informar valor estimado;
- enviar para aprovacao.

Fluxo backend:

```http
POST /api/v1/expenses
POST /api/v1/expenses/{id}/submit
```

O backend salva a nota e chama o OCR/IA para processar.

### `/funcionario/historico` - Historico

Arquivo:

```text
frontend/src/pages/funcionario/F03Historico.tsx
```

Mostra:

- lista de notas do funcionario;
- filtros por status;
- agrupamento por mes.

Dados:

Usa `GET /api/v1/expenses/my`.

### `/funcionario/nota/:id` - Detalhe da Nota

Arquivo:

```text
frontend/src/pages/funcionario/F04Detalhe.tsx
```

Mostra:

- dados da nota;
- valor;
- projeto;
- categoria;
- status;
- analise IA;
- historico/timeline;
- anexo.

Dados:

Usa:

```http
GET /api/v1/expenses/{id}
GET /api/v1/expenses/attachments/{attachmentId}
```

### `/funcionario/perfil` - Perfil

Arquivo:

```text
frontend/src/pages/funcionario/F05Perfil.tsx
```

Mostra estatisticas basicas do funcionario com base nas notas.

## Telas do Gestor

As telas de gestor usam layout desktop com sidebar.

Menu:

```text
Dashboard
Aprovacoes
Aprovados
Projetos
Politicas
Alertas IA
Todas as notas
```

### `/gerente` - Dashboard da Equipe

Arquivo:

```text
frontend/src/pages/gerente/G01Dashboard.tsx
```

Mostra:

- pendentes;
- aprovadas;
- autoaprovadas;
- violacoes;
- notas reais da equipe.

Dados:

```http
GET /api/v1/manager/dashboard
GET /api/v1/manager/expenses
```

### `/gerente/aprovacoes` - Fila de Aprovacao

Arquivo:

```text
frontend/src/pages/gerente/G02Aprovacoes.tsx
```

Mostra notas aguardando decisao.

Acoes:

```http
POST /api/v1/manager/expenses/{id}/approve
POST /api/v1/manager/expenses/{id}/reject
POST /api/v1/manager/expenses/{id}/request-revision
```

### `/gerente/pagamentos` - Aprovados para Financeiro

Arquivo:

```text
frontend/src/pages/gerente/G08Pagamentos.tsx
```

Mostra reembolsos aprovados prontos para pagamento.

Dados:

```http
GET /api/v1/manager/payments/approved
```

### `/gerente/projetos` - Projetos

Arquivo:

```text
frontend/src/pages/gerente/G07Projetos.tsx
```

Permite listar, criar e editar projetos.

Dados:

```http
GET /api/v1/manager/projects
POST /api/v1/manager/projects
PUT /api/v1/manager/projects/{id}
```

### `/gerente/politicas` - Politicas

Arquivo:

```text
frontend/src/pages/gerente/G06Politicas.tsx
```

Permite listar e salvar limites de politica por categoria.

Dados:

```http
GET /api/v1/manager/policies
PUT /api/v1/manager/policies
```

### `/gerente/alertas`, `/gerente/notas`, `/gerente/funcionario/:id`

Essas telas existem para a experiencia do gestor, mas parte delas ainda pode conter mock ou dados parcialmente conectados. O dashboard, fila, projetos, politicas e pagamentos ja estao mais ligados ao backend real.

## Telas do CFO

As telas de CFO usam layout desktop.

Menu:

```text
Dashboard
ROI Corporativo
Compliance
Todas as notas
Configuracoes
```

### `/cfo` - Dashboard Executivo

Arquivo:

```text
frontend/src/pages/cfo/C01Dashboard.tsx
```

Estado atual:

Ainda usa dados mockados em boa parte.

Mostra:

- total reembolsado;
- economia pela IA;
- ROI medio;
- compliance geral;
- reembolso por departamento;
- gerentes;
- alertas criticos.

Uso hoje:

Serve como tela visual/pitch, mas ainda nao e a fonte principal real do CFO.

### `/cfo/roi` - Performance por Projeto

Arquivo:

```text
frontend/src/pages/cfo/C02ROI.tsx
```

Estado atual:

Esta e a principal tela CFO real neste momento.

Apesar do menu ainda chamar "ROI Corporativo", a tela abre como:

```text
Performance por projeto
```

Ela consome dados reais do backend:

```http
GET /api/v1/cfo/projects/performance
```

Mostra:

- receita demo;
- lucro;
- margem;
- ROI;
- economia IA;
- perdas evitaveis;
- ROI por projeto;
- tabela de projetos;
- tendencia mensal;
- painel de controle Reeva;
- perdas evitaveis por projeto.

Exemplo atual do Projeto Demo:

```text
Receita: R$ 85.000,00
Custo total: R$ 13.602,30
Lucro: R$ 71.397,70
Margem: 84%
ROI: 5,2489
Perdas evitaveis: R$ 3.095,00
Economia IA: R$ 3.221,00
Tendencia: 6 meses
```

### `/cfo/compliance`

Arquivo:

```text
frontend/src/pages/cfo/C03Compliance.tsx
```

Estado atual:

Tela de compliance financeiro. Ainda pode conter dados mockados ou parcialmente conectados.

### `/cfo/notas`

Arquivo:

```text
frontend/src/pages/cfo/C04Notas.tsx
```

Estado atual:

Ainda usa mock em boa parte.

### `/cfo/configuracoes`

Arquivo:

```text
frontend/src/pages/cfo/C05Config.tsx
```

Estado atual:

Tela visual de configuracoes gerais. Ainda nao e a tela administrativa definitiva.

## O Que Esta Real vs Mockado

### Real/conectado ao backend

- login;
- funcionario home/historico/detalhe/envio;
- gestor dashboard;
- gestor aprovacoes;
- gestor politicas;
- gestor projetos;
- gestor pagamentos aprovados;
- CFO Performance por Projeto em `/cfo/roi`;
- tabela `project_financial_entries`;
- calculo backend de receita, custo, lucro, margem, ROI, perdas evitaveis e economia IA.

### Ainda mockado/parcial

- dashboard executivo principal do CFO (`/cfo`);
- compliance CFO;
- todas as notas CFO;
- configuracoes CFO;
- recomendacoes inteligentes completas;
- botao de gerar dados demo por IA;
- integracao real com ERP/CRM.

## Como o Backend Guarda os Dados

### `expenses`

Tabela principal de notas/reembolsos.

Guarda:

- usuario;
- empresa;
- projeto;
- categoria;
- valor;
- data;
- status;
- score IA;
- decisao IA;
- motivo de violacao;
- aprovacao gestor/financeiro;
- dados OCR;
- anexos relacionados.

Essa tabela representa o core operacional da Reeva: reembolso.

### `projects`

Tabela de projetos.

O projeto e o centro da analise CFO.

Hoje cada nota precisa estar ligada a um projeto. Isso permite calcular reembolso por projeto e depois comparar com receita/custo demo.

### `project_financial_entries`

Nova tabela criada para a camada CFO.

Guarda entradas financeiras por projeto:

- receita demo;
- despesas gerais demo;
- fonte do dado;
- data da entrada.

Ela existe para nao misturar receita/despesas gerais com `expenses`, porque `expenses` e reembolso de funcionario.

## O Que Os Arquivos SQL Fazem

O projeto usa Flyway. Flyway executa arquivos SQL em ordem de versao:

```text
V1__...
V2__...
V3__...
...
V15__...
```

Cada arquivo e uma migration: uma mudanca versionada no banco.

Quando o backend sobe, o Flyway verifica a tabela:

```text
flyway_schema_history
```

Se existe uma migration nova que ainda nao rodou, ele executa automaticamente.

Isso e importante porque garante que todo ambiente tenha a mesma estrutura:

- sua maquina local;
- maquina de outro dev;
- staging;
- producao/nuvem.

## Explicando Migrations Importantes

### `V1__init.sql`

Cria a estrutura inicial:

- companies;
- departments;
- users;
- expense_policies;
- expenses;
- expense_attachments;
- expense_status_history;
- expense_comments;
- audit_logs;
- refresh_tokens;
- indices;
- triggers de `updated_at`.

E a base do banco.

### `V5__dev_test_users.sql`

Cria usuarios demo iniciais:

```text
gestor@reeva.com.br       MANAGER
funcionario@reeva.com.br  EMPLOYEE
```

Senha dos dois:

```text
reeva123
```

Por isso esses usuarios aparecem localmente sem precisar criar pelo app.

### `V10__projects.sql`

Cria projetos.

Faz:

- cria tabela `projects`;
- cria tabela `project_members`;
- adiciona `project_id` em `expenses`;
- cria `Projeto Demo`;
- vincula funcionarios demo ao projeto;
- atualiza despesas antigas para apontarem para o `Projeto Demo`;
- torna `project_id` obrigatorio em `expenses`.

Por que isso importa:

Sem projeto, nao conseguimos calcular performance por projeto para o CFO.

### `V13__seed_demo_expenses.sql`

Cria uma base rica de despesas demo.

Faz:

- ajusta constraint de status para aceitar `NEEDS_REVISION`;
- atualiza receita agregada antiga do `Projeto Demo`;
- cria usuarios adicionais;
- vincula usuarios ao projeto;
- insere varias despesas com diferentes status:
  - pagas;
  - aprovadas;
  - rejeitadas;
  - pendentes;
  - em revisao.

Por que isso existe:

Para a demo ter notas suficientes para dashboard, gestor e CFO mostrarem comportamento realista.

Observacao:

O proprio arquivo avisa que e dado de demonstracao, nao deve ser usado como seed de producao real.

### `V14__project_financial_entries.sql`

Cria a base financeira persistente por projeto.

Faz:

- cria tabela `project_financial_entries`;
- define `type`:
  - `REVENUE`;
  - `GENERAL_EXPENSE`;
- define `source`:
  - `AI_GENERATED_DEMO`;
  - `MANUAL`;
  - `IMPORT`;
- cria indices;
- cria trigger de `updated_at`;
- insere receitas demo;
- insere despesas gerais demo.

Por que isso foi criado:

Antes, a receita estava em um campo agregado de `projects.revenue`. Isso nao permite tendencia mensal nem entradas por data.

Agora a Reeva consegue calcular:

```text
receita por periodo
despesas gerais por periodo
reembolsos por periodo
custo total
lucro
margem
ROI
```

### `V15__seed_demo_cfo_user.sql`

Cria o usuario CFO demo:

```text
cfo@reeva.com.br
reeva123
```

Role:

```text
FINANCE
```

SQL:

```sql
INSERT INTO users (...)
VALUES (..., 'cfo@reeva.com.br', ..., 'FINANCE')
ON CONFLICT (email) DO NOTHING;
```

O que significa `ON CONFLICT (email) DO NOTHING`:

Se o usuario ja existir, o banco nao cria duplicado e nao quebra a migration.

## Por Que Precisa Ser Criado Localmente

Em desenvolvimento local, cada pessoa pode ter um banco Postgres proprio no Docker.

Quando alguem roda o projeto pela primeira vez, esse banco esta vazio. Sem migrations/seed:

- nao teria usuario para logar;
- nao teria empresa demo;
- nao teria projeto demo;
- nao teria notas demo;
- nao teria CFO demo;
- a tela CFO nao teria dados para mostrar.

Por isso criamos usuarios e dados demo via migration.

Isso garante:

```text
git clone
docker compose up
mvn spring-boot:run
```

E o ambiente ja nasce com uma demo funcional.

## Isso Vai Para a Nuvem?

As migrations vao junto com o backend.

Quando subir para a nuvem, o Flyway tambem pode criar as tabelas no banco novo.

Mas existe uma diferenca importante:

### Estrutura do banco

Deve ir para todos os ambientes:

- tabelas;
- colunas;
- indices;
- constraints.

### Dados demo

Devem ser tratados com cuidado.

Usuarios como:

```text
cfo@reeva.com.br
funcionario@reeva.com.br
gestor@reeva.com.br
```

sao bons para local/demo, mas nao devem virar usuarios reais de producao sem decisao consciente.

No futuro, o ideal e separar:

- migrations estruturais;
- seeds demo;
- seeds de producao.

## Como a Performance CFO E Calculada

Endpoint:

```http
GET /api/v1/cfo/projects/performance
```

Servico:

```text
CfoProjectMetricsService
```

Calculos:

```text
Receita = soma project_financial_entries onde type = REVENUE
Despesas gerais = soma project_financial_entries onde type = GENERAL_EXPENSE
Reembolsos = soma expenses aprovadas/pagas
Custo total = despesas gerais + reembolsos
Lucro = receita - custo total
Margem = lucro / receita
ROI = lucro / custo total
Perdas evitaveis = rejeicoes + excedentes acima de politica
Economia IA = perdas evitaveis + autoaprovacoes * custo manual estimado
```

Status de reembolso considerados como custo reembolsavel:

```text
MANAGER_APPROVED
FINANCE_APPROVED
PAID
```

## Como Explicar Para o Time

Uma forma simples:

> A Reeva nao esta tentando ser ERP ou CRM agora. O funcionario so envia nota e escolhe projeto. O projeto vira o centro da analise. A parte financeira demo cria receita e despesas gerais para dar contexto ao CFO. A parte real da Reeva vem dos reembolsos: quanto foi aprovado, rejeitado, economizado, evitado e automatizado. Assim o CFO consegue ver nao so gasto, mas onde a empresa esta gastando bem ou mal por projeto.

## Proximos Passos Recomendados

1. Substituir mocks restantes do CFO por endpoints reais.
2. Criar endpoint para gerar dados financeiros demo com IA.
3. Criar recomendacoes Reeva:
   - manter padrao;
   - reduzir gasto;
   - investigar;
   - automatizar;
   - revisar politica.
4. Separar claramente seeds demo de migrations estruturais antes de producao.
5. Criar documentacao de deploy explicando quais migrations rodam em nuvem.

