# Plano: Tornar o CFO Real, Completo e Pitch-Ready

## Objetivo

Transformar a area CFO da Reeva em uma experiencia real, baseada no banco e facil de entender para um diretor financeiro.

Hoje a Reeva ja tem a fundacao da parte CFO em `/cfo/roi`, mas ainda existe uma mistura perigosa:

- algumas metricas vem do backend real;
- varias telas ainda usam mocks estaticos;
- algumas mensagens parecem produto final, mas ainda nao sao rastreaveis;
- o CFO ainda nao consegue entender facilmente "por que" uma metrica esta boa ou ruim.

O objetivo deste plano e remover os mocks, consolidar os endpoints reais e criar uma experiencia executiva clara:

- visao geral da empresa;
- lista de projetos;
- detalhe de projeto;
- compliance e risco;
- todas as notas reais;
- configuracoes reais ou claramente marcadas como futuras;
- recomendacoes Reeva baseadas em reembolsos.

## Estado Atual

### Ja existe e esta real

#### Backend CFO

Pacote:

```text
src/main/java/com/reeva/backend/finance
```

Endpoints atuais:

```http
GET /api/v1/cfo/projects/performance
GET /api/v1/cfo/projects/{projectId}/performance
GET /api/v1/cfo/projects/{projectId}/financial-entries
POST /api/v1/cfo/projects/{projectId}/financial-entries
```

Tabela real:

```text
project_financial_entries
```

Essa tabela guarda dados financeiros demo por projeto:

- receita demo;
- despesas gerais demo;
- data;
- categoria;
- fonte.

As despesas reembolsaveis reais vem de:

```text
expenses
```

Metricas ja calculadas:

- receita;
- despesas gerais;
- reembolsos;
- custo total;
- lucro;
- margem;
- ROI;
- perdas evitaveis;
- economia IA;
- quantidade de reembolsos;
- taxa de compliance;
- taxa de autoaprovacao;
- tendencia mensal.

#### Frontend CFO real

Tela:

```text
frontend/src/pages/cfo/C02ROI.tsx
```

Rota:

```text
/cfo/roi
```

Esta tela ja chama:

```text
getCfoProjectPerformance()
```

E usa:

```http
GET /api/v1/cfo/projects/performance
```

Tambem foi ajustada para:

- mostrar primeiro uma lista de projetos;
- abrir o detalhe ao clicar em um projeto;
- usar a tela atual como detalhe do projeto selecionado.

### Ainda esta mockado

#### `/cfo` - Dashboard executivo

Arquivo:

```text
frontend/src/pages/cfo/C01Dashboard.tsx
```

Problemas:

- usa `deptos` fixo;
- usa `gerentes` fixo;
- usa `mockAlertas`;
- total reembolsado, economia IA, ROI e compliance sao valores escritos no frontend;
- nao bate necessariamente com `/cfo/roi`;
- nao explica origem dos numeros.

#### `/cfo/compliance`

Arquivo:

```text
frontend/src/pages/cfo/C03Compliance.tsx
```

Problemas:

- funcionarios de risco sao fixos;
- fraudes, inelegiveis e recuperado sao mock;
- relatorios automaticos nao persistem;
- integracoes CRM sao mock;
- nao usa duplicidades reais, rejeicoes reais, politicas reais ou OCR real.

#### `/cfo/notas`

Arquivo:

```text
frontend/src/pages/cfo/C04Notas.tsx
```

Problemas:

- usa `mockNotas`;
- funcionario, departamento e gerente aparecem fixos;
- nao lista notas reais da empresa;
- filtros de departamento nao filtram dados reais;
- nao tem detalhe real da nota para CFO.

#### `/cfo/configuracoes`

Arquivo:

```text
frontend/src/pages/cfo/C05Config.tsx
```

Problemas:

- limites por categoria sao locais;
- botao salvar apenas muda estado na tela;
- politicas sao texto fixo;
- integracoes sao ficticias;
- usuarios/permissoes sao fixos;
- nao conversa com backend.

## Principio de Produto

O CFO nao deve ver apenas "dashboard bonito".

Ele precisa responder rapidamente:

1. Quanto a empresa esta gastando com reembolsos?
2. Quais projetos estao dando retorno?
3. Onde existem perdas evitaveis?
4. Onde a IA economizou dinheiro ou trabalho?
5. Onde a politica esta falhando?
6. Quais projetos ou categorias exigem acao?
7. Que decisoes devo tomar no proximo mes ou quarter?

O foco da Reeva deve continuar sendo reembolso.

A receita demo existe para dar contexto financeiro. A recomendacao da Reeva deve ser baseada em:

- reembolsos;
- politicas;
- anomalias;
- duplicidade;
- OCR;
- aprovacao automatica;
- perdas evitaveis;
- padroes por projeto e categoria.

## Separacao Visual Obrigatoria

Para nao confundir o CFO:

### Dados reais Reeva

Devem aparecer como dados operacionais reais:

- notas enviadas;
- valores reembolsados;
- status das despesas;
- duplicidades rejeitadas;
- violacoes de politica;
- OCR/score;
- aprovacoes automaticas;
- despesas por categoria;
- despesas por projeto;
- historico de decisao.

### Dados financeiros demo

Devem ser rotulados claramente:

- receita demo;
- despesas gerais demo;
- margem demo;
- lucro demo;
- ROI demo.

Texto sugerido:

```text
Receita demo usada apenas como contexto financeiro. As recomendacoes da Reeva sao baseadas nos reembolsos reais.
```

## Experiencia Final Desejada

### 1. Dashboard CFO Real

Rota:

```text
/cfo
```

Funcao:

Dar uma visao executiva da empresa inteira.

Cards principais:

- total reembolsado;
- economia IA;
- perdas evitaveis;
- compliance geral;
- taxa de autoaprovacao;
- projetos com maior risco;
- projetos com melhor ROI demo.

Graficos:

- reembolsos por projeto;
- reembolsos por categoria;
- tendencia mensal de reembolso;
- ranking de perdas evitaveis;
- distribuicao por status.

Bloco de recomendacoes:

- 3 a 5 recomendacoes executivas;
- cada recomendacao deve ter motivo, impacto e acao sugerida.

Dados necessarios:

- agregados de `expenses`;
- agregados de `project_financial_entries`;
- politicas ativas;
- status e decisoes IA.

Endpoint recomendado:

```http
GET /api/v1/cfo/overview
```

DTO sugerido:

```text
CfoOverviewResponse
- totalReimbursedAmount
- totalSubmittedAmount
- avoidableLosses
- aiSavings
- complianceRate
- autoApprovalRate
- duplicateRejectedCount
- policyViolationCount
- lowOcrConfidenceCount
- projectRiskRanking[]
- categorySpend[]
- statusDistribution[]
- monthlyReimbursementTrend[]
- recommendations[]
```

### 2. Lista de Projetos CFO

Rota:

```text
/cfo/roi
```

Funcao:

Mostrar todos os projetos como centros de analise.

Tabela:

- projeto;
- receita demo;
- custo total;
- lucro demo;
- margem demo;
- ROI demo;
- economia IA;
- perdas evitaveis;
- compliance;
- status de risco.

Ja foi iniciado.

Melhorias futuras:

- busca por projeto;
- filtro por periodo;
- filtro por risco;
- ordenacao por ROI, perdas, custo, compliance;
- cards compactos para mobile/tablet;
- indicador de "sem dados financeiros demo".

### 3. Detalhe de Projeto CFO

Rota atual:

```text
/cfo/roi
```

Estado atual:

- abre detalhe por clique dentro da propria tela.

Possivel rota futura:

```text
/cfo/projetos/:projectId
```

Funcao:

Mostrar a historia financeira e operacional de um projeto.

Secoes:

- resumo financeiro;
- tendencia mensal;
- composicao de custo;
- reembolsos por categoria;
- notas recentes;
- perdas evitaveis;
- economia IA;
- compliance;
- recomendacoes Reeva.

Endpoint atual suficiente para parte financeira:

```http
GET /api/v1/cfo/projects/{projectId}/performance
```

Endpoints adicionais recomendados:

```http
GET /api/v1/cfo/projects/{projectId}/expenses
GET /api/v1/cfo/projects/{projectId}/category-breakdown
GET /api/v1/cfo/projects/{projectId}/recommendations
```

### 4. Compliance CFO Real

Rota:

```text
/cfo/compliance
```

Funcao:

Mostrar risco real por pessoa, projeto, categoria e politica.

Trocar mocks por:

- usuarios reais;
- despesas reais;
- politicas reais;
- duplicidades reais;
- OCR baixo;
- violacoes de politica;
- rejeicoes;
- reincidencias.

Cards:

- notas processadas;
- fora da politica;
- duplicidades rejeitadas;
- OCR baixo;
- colaboradores com maior risco;
- categorias com maior violacao.

Tabela de risco:

- funcionario;
- departamento;
- gerente;
- notas enviadas;
- valor total;
- violacoes;
- duplicidades;
- OCR baixo;
- valor evitado;
- score de risco.

Endpoint recomendado:

```http
GET /api/v1/cfo/compliance
```

DTO sugerido:

```text
CfoComplianceResponse
- processedExpenseCount
- policyViolationCount
- duplicateRejectedCount
- lowOcrConfidenceCount
- totalAvoidedAmount
- riskyEmployees[]
- riskyProjects[]
- riskyCategories[]
```

### 5. Todas as Notas CFO Real

Rota:

```text
/cfo/notas
```

Funcao:

Dar visibilidade global das notas da empresa.

Trocar `mockNotas` por endpoint real.

Tabela:

- funcionario;
- departamento;
- gerente;
- projeto;
- fornecedor;
- categoria;
- data;
- valor;
- status;
- score IA;
- decisao IA;
- politica;
- duplicidade;
- acao.

Filtros:

- periodo;
- projeto;
- categoria;
- status;
- funcionario;
- gerente;
- risco;
- duplicada;
- fora da politica;
- OCR baixo.

Endpoint recomendado:

```http
GET /api/v1/cfo/expenses
```

Com paginacao:

```text
page
size
status
projectId
employeeId
managerId
category
from
to
risk
```

DTO pode reaproveitar `ExpenseResponse`, mas talvez precise de campos extras:

- departmentName;
- managerName;
- duplicateOfExpenseId;
- attachmentCount.

### 6. Configuracoes CFO

Rota:

```text
/cfo/configuracoes
```

Decisao importante:

Nem tudo precisa virar real agora.

Para MVP, a tela pode ser reduzida para configuracoes que realmente existem:

- politicas de reembolso;
- usuarios/permissoes basicas;
- entradas financeiras demo por projeto.

O que ainda nao existe deve sair da tela ou aparecer como "em breve", para nao parecer falso.

Melhor caminho:

1. Mover politicas reais do gerente para um componente compartilhado.
2. CFO pode visualizar politicas e, se permitido, editar.
3. Mostrar log de alteracoes de politicas.
4. Mostrar configuracao de entradas financeiras demo por projeto.

Endpoints ja existentes para politicas no gerente podem ser reaproveitados ou duplicados com autorizacao CFO.

Endpoints CFO recomendados:

```http
GET /api/v1/cfo/policies
PUT /api/v1/cfo/policies/{policyId}
GET /api/v1/cfo/policies/audit-logs
GET /api/v1/cfo/projects/{projectId}/financial-entries
POST /api/v1/cfo/projects/{projectId}/financial-entries
```

## Backend Necessario

### Fase Backend 1: Overview CFO

Criar:

```text
CfoOverviewService
CfoOverviewResponse
```

Endpoint:

```http
GET /api/v1/cfo/overview
```

Calculos:

- total reembolsado;
- total solicitado;
- economia IA;
- perdas evitaveis;
- taxa de compliance;
- taxa de autoaprovacao;
- duplicidades;
- OCR baixo;
- status distribution;
- reembolso por categoria;
- reembolso por projeto;
- tendencia mensal.

### Fase Backend 2: Expenses CFO

Criar endpoint global:

```http
GET /api/v1/cfo/expenses
```

Com paginacao e filtros.

Regras:

- sempre filtrar por `company_id`;
- CFO ve empresa toda;
- gerente nao deve acessar esse endpoint se a decisao for restringir CFO para FINANCE/ADMIN.

### Fase Backend 3: Compliance CFO

Criar:

```text
CfoComplianceService
CfoComplianceResponse
RiskScoreCalculator
```

Score de risco inicial rule-based:

```text
risco = pontos por:
- duplicidade rejeitada;
- politica violada;
- OCR baixo;
- valor alto;
- muitas revisoes;
- rejeicoes recorrentes.
```

Classificacao:

- baixo;
- medio;
- alto.

### Fase Backend 4: Recomendacoes Reeva

Comecar sem IA generativa.

Recomendacoes rule-based:

- "Investigar projeto com perdas evitaveis altas";
- "Revisar politica de categoria com violacao recorrente";
- "Manter automacao em projeto com compliance alto";
- "Exigir nova foto onde OCR baixo esta recorrente";
- "Monitorar colaborador com concentracao de despesas";
- "Revisar limite quando muitos gastos ficam pouco acima da politica".

Depois, adicionar IA para transformar os sinais em linguagem executiva.

Endpoint:

```http
GET /api/v1/cfo/recommendations
GET /api/v1/cfo/projects/{projectId}/recommendations
```

## Frontend Necessario

### Fase Frontend 1: Remover mocks do Dashboard

Arquivo:

```text
frontend/src/pages/cfo/C01Dashboard.tsx
```

Trocar:

- `deptos`;
- `gerentes`;
- `mockAlertas`;
- `totalEmpresa`;
- valores fixos.

Por:

```text
getCfoOverview()
```

Experiencia:

- cards no topo;
- graficos compactos;
- ranking de projetos;
- recomendacoes;
- CTA para abrir projetos.

### Fase Frontend 2: Melhorar `/cfo/roi`

Arquivo:

```text
frontend/src/pages/cfo/C02ROI.tsx
```

Melhorias:

- filtros de periodo;
- busca;
- ordenacao;
- detalhe com abas:
  - financeiro;
  - reembolsos;
  - compliance;
  - recomendacoes;
  - entradas demo.

### Fase Frontend 3: Tornar `/cfo/notas` real

Arquivo:

```text
frontend/src/pages/cfo/C04Notas.tsx
```

Trocar `mockNotas` por:

```text
getCfoExpenses()
```

Adicionar:

- paginacao;
- filtros;
- detalhe lateral ou modal;
- badges de risco.

### Fase Frontend 4: Tornar `/cfo/compliance` real

Arquivo:

```text
frontend/src/pages/cfo/C03Compliance.tsx
```

Trocar:

- `funcionariosRisco`;
- economias fixas;
- integracoes mock.

Por:

```text
getCfoCompliance()
```

### Fase Frontend 5: Reduzir ou realinhar Configuracoes

Arquivo:

```text
frontend/src/pages/cfo/C05Config.tsx
```

Mudar a tela para:

- politicas reais;
- log real;
- entradas financeiras demo;
- usuarios reais, se houver endpoint seguro.

Remover da versao MVP:

- CRM conectado fake;
- ERP em configuracao fake;
- usuarios falsos.

## Design e Usabilidade

### Direcao visual

O CFO precisa de densidade, clareza e hierarquia.

Evitar:

- textos longos explicativos demais;
- metricas soltas sem origem;
- cards decorativos sem acao;
- graficos que nao ajudam decisao;
- cores demais.

Preferir:

- tabelas densas e bem organizadas;
- badges de risco;
- filtros claros;
- ranking por impacto financeiro;
- drill-down por projeto;
- tooltip ou legenda curta para receita demo;
- recomendacoes com impacto estimado.

### Linguagem

Usar termos executivos:

- "perdas evitaveis";
- "economia operacional";
- "conformidade";
- "risco de reembolso";
- "automacao segura";
- "custo reembolsavel";
- "projeto com maior exposicao".

Evitar:

- "fraude" quando nao houver confirmacao;
- causalidade forte com receita demo;
- "ROI real" se a receita ainda e demo.

Usar:

```text
ROI demo
Margem demo
Receita demo
Economia real pela IA
Reembolsos reais
```

## Ordem Recomendada de Execucao

### Etapa 1: CFO Overview real

Mais importante para demo.

Entregas:

- `GET /api/v1/cfo/overview`;
- `C01Dashboard.tsx` conectado;
- remover mocks principais do dashboard;
- cards reais;
- rankings reais;
- recomendacoes iniciais rule-based.

Resultado:

Quando CFO entra em `/cfo`, ele ve dados reais.

### Etapa 2: CFO Expenses real

Entregas:

- `GET /api/v1/cfo/expenses`;
- `/cfo/notas` real;
- filtros basicos;
- paginacao;
- detalhe de nota.

Resultado:

CFO consegue auditar de onde vem os numeros.

### Etapa 3: CFO Compliance real

Entregas:

- `GET /api/v1/cfo/compliance`;
- score de risco;
- ranking de funcionarios/projetos/categorias;
- duplicidade e politica no painel.

Resultado:

CFO entende risco, nao apenas custo.

### Etapa 4: Projeto detalhe completo

Entregas:

- melhorar detalhe dentro de `/cfo/roi`;
- adicionar abas ou secoes;
- conectar notas do projeto;
- mostrar recomendacoes por projeto;
- listar entradas financeiras demo.

Resultado:

Projeto vira centro real da analise.

### Etapa 5: Configuracoes reais ou enxutas

Entregas:

- remover mocks de integracao;
- conectar politicas reais;
- mostrar log real;
- permitir gerenciar entradas financeiras demo.

Resultado:

Tela deixa de parecer fake.

## Criterios de Aceite

- Nenhuma tela CFO principal usa arrays mockados como fonte primaria.
- `/cfo` mostra dados reais do backend.
- `/cfo/roi` lista projetos e abre detalhe.
- `/cfo/notas` mostra notas reais da empresa.
- `/cfo/compliance` usa violacoes reais, duplicidades reais e OCR real.
- Receita demo e marcada visualmente como demo.
- Recomendacoes da Reeva sao baseadas em reembolsos.
- CFO consegue clicar de uma metrica ate a lista de notas que explica aquela metrica.
- Build frontend passa.
- Testes backend passam.
- Endpoints CFO respeitam `company_id`.
- Permissoes CFO sao revisadas.

## Riscos

### Misturar demo com real

Mitigacao:

Rotular receita e ROI como demo enquanto nao houver ERP real.

### Dashboard bonito mas sem rastreabilidade

Mitigacao:

Toda metrica clicavel deve abrir lista, detalhe ou explicacao.

### Escopo crescer demais

Mitigacao:

Fazer primeiro overview, notas e compliance. Configuracoes e IA generativa ficam depois.

### Recomendacao parecer certeza causal

Mitigacao:

Usar linguagem probabilistica:

- "associado a";
- "no mesmo periodo";
- "sugere";
- "vale investigar";
- "bom candidato".

## Melhor Proxima Implementacao

Comecar pela Etapa 1:

```text
Phase CFO-1: Real Executive Overview
```

Escopo fechado:

1. criar `CfoOverviewResponse`;
2. criar `CfoOverviewService`;
3. criar endpoint `GET /api/v1/cfo/overview`;
4. calcular cards reais;
5. calcular graficos reais;
6. gerar recomendacoes rule-based simples;
7. conectar `C01Dashboard.tsx`;
8. remover mocks do dashboard executivo.

Isso entrega o maior salto de credibilidade: o CFO entra na primeira tela e tudo que aparece ja vem do sistema real.
