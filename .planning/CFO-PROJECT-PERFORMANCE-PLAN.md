# Plano: Performance Financeira por Projeto e Inteligencia Reeva

## Objetivo

Iniciar o core da Reeva para CFO: transformar dados de reembolso em uma visao executiva por projeto, mostrando nao apenas perdas e controle, mas tambem quais padroes de gasto parecem fazer sentido para a empresa.

O MVP deve mostrar:

- receita demo por projeto;
- custo total por projeto;
- lucro;
- margem;
- ROI;
- tendencia mensal;
- perdas evitaveis;
- economia gerada pela IA;
- recomendacoes para o proximo quarter baseadas principalmente em reembolsos.

## Principio de Produto

O funcionario nao deve virar operador de CRM.

O fluxo de envio da nota deve continuar simples:

- escolher projeto;
- escolher categoria;
- enviar nota;
- corrigir campos quando a IA nao conseguir ler.

Nao devemos exigir, neste momento:

- cliente separado;
- tipo de interacao;
- objetivo da despesa;
- resultado esperado;
- resultado observado manual.

O projeto sera o centro da analise. Se o projeto representar um cliente, uma implantacao, uma pre-venda ou uma iniciativa comercial, isso ja sera suficiente para o MVP.

## Separacao Conceitual

### 1. Camada financeira demo

Mostra o placar financeiro do projeto.

Dados:

- receita demo;
- despesas gerais demo;
- reembolsos reais;
- custo total;
- lucro;
- margem;
- ROI;
- tendencia mensal.

Esses dados servem para contextualizar o CFO. Como a receita sera gerada por IA/demo, ela nao deve ser tratada como verdade operacional auditavel.

### 2. Camada de inteligencia Reeva

Explica o que esta acontecendo nos reembolsos e recomenda acoes.

Dados usados:

- expenses;
- categoria da despesa;
- valor;
- projeto;
- status;
- politica;
- score da IA;
- decisao da IA;
- motivo de violacao;
- motivo de revisao manual;
- historico de aprovacao;
- tendencia por periodo.

A IA pode usar a receita demo como contexto de performance, mas nao deve auditar ou criticar receita demo.

Regra de produto:

> A Reeva recomenda acoes sobre gastos reembolsaveis, controle, eficiencia e padroes de despesa. Ela nao recomenda acoes sobre inconsistencias de receita demo.

## Decisao de Escopo

Para o MVP, nao adicionar campos obrigatorios no envio de nota.

Em vez disso, usar:

- projeto como contexto comercial;
- categoria como tipo de gasto;
- OCR/IA como enriquecimento automatico;
- receita demo persistida como contexto financeiro;
- metricas calculadas no backend.

## Modelo de Dados Proposto

### Nova tabela: project_financial_entries

Guardar entradas financeiras demo por projeto.

Tipos:

- REVENUE;
- GENERAL_EXPENSE.

Fonte:

- AI_GENERATED_DEMO;
- MANUAL;
- IMPORT.

Campos:

- id;
- company_id;
- project_id;
- type;
- category;
- description;
- amount;
- currency;
- entry_date;
- source;
- ai_model;
- ai_prompt_summary;
- created_at;
- updated_at.

Observacao:

O campo `projects.revenue` ja existe, mas ele e agregado demais para tendencia mensal e analise por periodo. A nova tabela permite salvar historico mensal e diferentes tipos de entradas.

### Possivel campo futuro em projects

Opcional, nao obrigatorio para MVP:

- client_name.

Isso pode ajudar a interface, mas o MVP pode usar `project.name`.

## Calculos de Performance por Projeto

Para cada projeto e periodo:

### Receita

Soma de `project_financial_entries.amount` onde:

- type = REVENUE;
- project_id = projeto;
- entry_date dentro do periodo.

### Despesas gerais

Soma de `project_financial_entries.amount` onde:

- type = GENERAL_EXPENSE;
- project_id = projeto;
- entry_date dentro do periodo.

### Reembolsos

Soma de `expenses.amount` onde:

- project_id = projeto;
- status em MANAGER_APPROVED, FINANCE_APPROVED ou PAID;
- is_deleted = false;
- expense_date dentro do periodo.

### Custo total

```text
custoTotal = despesasGerais + reembolsos
```

### Lucro

```text
lucro = receita - custoTotal
```

### Margem

```text
margem = lucro / receita
```

Se receita for zero, exibir N/A.

### ROI

```text
roi = lucro / custoTotal
```

Se custo total for zero, exibir N/A.

### Perdas evitaveis

Estimativa baseada em reembolsos:

- valor acima da politica;
- itens inelegiveis;
- notas rejeitadas por politica;
- despesas com score baixo;
- duplicidades futuras, quando houver sinal.

Para MVP, calcular de forma simples:

```text
perdasEvitaveis = soma do valor excedente de despesas fora da politica + valor rejeitado por politica
```

### Economia pela IA

Estimativa baseada em:

- auto-aprovacoes que economizam trabalho manual;
- despesas rejeitadas/limitadas por politica;
- despesas roteadas corretamente para revisao.

Para MVP:

```text
economiaIA = perdasEvitaveis + (quantidadeAutoAprovada * custoManualEstimado)
```

O custo manual estimado ja aparece no codigo como algo perto de R$18 por aprovacao automatizada.

## Recomendacoes CFO

As recomendacoes devem ter duas familias.

### 1. Controle

Objetivo: reduzir perdas, risco e trabalho manual.

Exemplos:

- revisar politica de alimentacao no projeto X;
- investigar aumento de transporte no projeto Y;
- manter auto-aprovacao para projeto com alto score e baixa violacao;
- bloquear categoria recorrente fora da politica;
- pedir revisao em notas com baixa confianca de OCR.

### 2. Crescimento com controle

Objetivo: identificar onde gastar parece fazer sentido.

Importante:

Essas recomendacoes nao devem afirmar causalidade forte.

Usar linguagem como:

- "associado a";
- "no mesmo periodo";
- "padrao favoravel";
- "vale manter";
- "vale testar";
- "vale observar".

Exemplos:

- Projeto Y teve alta margem demo, reembolsos dentro da politica e crescimento de receita no periodo. Vale manter o padrao de gastos comerciais no proximo quarter.
- Despesas de alimentacao no Projeto X cresceram, mas permaneceram dentro da politica e acompanharam aumento de receita demo. Vale preservar limite atual e monitorar.
- Projeto Z teve aumento de reembolsos sem melhora de margem demo. Vale revisar limites antes do proximo quarter.
- Projeto A tem baixo custo reembolsavel, alta margem e alta taxa de aprovacao automatica. Bom candidato para politica mais automatizada.

## Regras para a IA de Recomendacao

A IA pode:

- resumir tendencias de reembolso;
- comparar categorias por projeto;
- sugerir manter, reduzir, investigar ou automatizar;
- relacionar padroes de reembolso com performance demo do projeto;
- gerar linguagem executiva para CFO.

A IA nao deve:

- dizer que a receita demo esta errada;
- auditar faturamento;
- afirmar que uma nota causou diretamente uma receita;
- recomendar estrategia comercial baseada somente em receita demo;
- exigir novos campos manuais do funcionario.

Prompt interno sugerido:

```text
Voce e a IA da Reeva. Gere recomendacoes executivas para CFO com foco em reembolsos, politica, eficiencia operacional, perdas evitaveis e padroes de gasto por projeto.

A receita e as despesas gerais sao dados demonstrativos usados apenas como contexto financeiro. Nao critique nem audite a receita demo. Quando relacionar gastos a performance, use linguagem probabilistica como "associado a", "no mesmo periodo" ou "padrao favoravel".

Nao recomende que funcionarios preencham novos campos. Use projeto, categoria, valor, status, score, politica e historico de reembolsos.
```

## Backend Proposto

Criar pacote:

```text
com.reeva.backend.finance
```

Classes:

- `ProjectFinancialEntry`;
- `FinancialEntryType`;
- `FinancialEntrySource`;
- `FinancialEntryCategory`;
- `ProjectFinancialEntryRepository`;
- `CfoProjectMetricsService`;
- `CfoRecommendationService`;
- `CfoController`.

DTOs:

- `ProjectFinancialEntryResponse`;
- `ProjectFinancialEntryRequest`;
- `ProjectPerformanceResponse`;
- `ProjectMonthlyTrendResponse`;
- `CfoRecommendationResponse`;
- `GenerateDemoFinancialDataRequest`.

Endpoints:

```http
GET /api/v1/cfo/projects/performance
GET /api/v1/cfo/projects/{projectId}/performance
GET /api/v1/cfo/projects/{projectId}/financial-entries
POST /api/v1/cfo/projects/{projectId}/financial-entries
POST /api/v1/cfo/projects/{projectId}/generate-demo-financial-data
POST /api/v1/cfo/projects/{projectId}/recommendations
```

## Frontend Proposto

Atualizar as telas CFO para sair de mocks:

- `C01Dashboard.tsx`;
- `C02ROI.tsx`;
- possivelmente renomear visualmente "ROI Corporativo" para "Performance por Projeto".

Nova experiencia:

### Dashboard CFO

Cards:

- Receita demo;
- Custo total;
- Lucro;
- Margem;
- Economia pela IA;
- Perdas evitaveis.

Graficos:

- ranking de projetos por margem;
- ranking de projetos por perdas evitaveis;
- tendencia mensal: receita, custo, lucro;
- composicao de custo: reembolsos vs despesas gerais;
- reembolsos por categoria.

### Tela de projeto

Para um projeto especifico:

- resumo financeiro;
- trend mensal;
- reembolsos por categoria;
- status dos reembolsos;
- recomendacoes Reeva;
- entradas financeiras demo.

### Botao demo

Adicionar acao:

```text
Gerar dados demo com IA
```

Parametros:

- periodo;
- perfil do projeto;
- intensidade de receita;
- intensidade de custos gerais;
- quantidade de meses.

## Ordem de Implementacao

### Fase 1: Base persistente demo

1. Criar migration `project_financial_entries`.
2. Criar entidade e repository.
3. Criar endpoints simples para listar/criar entradas por projeto.
4. Seedar alguns dados demo para projetos existentes.

Resultado esperado:

Dados financeiros demo ficam salvos no banco e sobrevivem a restart.

### Fase 2: Metricas por projeto

1. Criar servico `CfoProjectMetricsService`.
2. Calcular receita, despesas gerais, reembolsos, custo total, lucro, margem e ROI.
3. Calcular tendencia mensal.
4. Criar testes unitarios para formulas.

Resultado esperado:

Backend entrega performance por projeto sem depender de mock no frontend.

### Fase 3: Metricas Reeva

1. Calcular perdas evitaveis.
2. Calcular economia pela IA.
3. Calcular taxa de conformidade.
4. Calcular taxa de aprovacao automatica.
5. Calcular distribuicao por categoria.

Resultado esperado:

O dashboard mostra valor do core da Reeva: controlar e melhorar reembolsos.

### Fase 4: Recomendacoes

1. Comecar com recomendacoes rule-based para nao bloquear em IA.
2. Adicionar camada IA para transformar metricas em texto executivo.
3. Garantir regra: recomendacao opera sobre reembolsos, nao sobre auditoria de receita.
4. Salvar ou retornar recomendacoes sob demanda.

Resultado esperado:

CFO recebe recomendacoes de manter, reduzir, investigar, automatizar ou revisar politica.

### Fase 5: Frontend CFO

1. Conectar dashboard CFO aos novos endpoints.
2. Trocar mocks por dados reais.
3. Criar visual de performance por projeto.
4. Criar painel de recomendacoes Reeva.
5. Criar botao de gerar dados demo.

Resultado esperado:

Demo pitch-ready: CFO enxerga ganhos, perdas e recomendacoes por projeto.

## Criterios de Aceite

- Funcionario continua enviando nota sem novos campos obrigatorios.
- Projeto e obrigatorio para nota.
- Receita demo fica salva em tabela persistente.
- Despesas gerais demo ficam salvas em tabela persistente.
- Reembolsos continuam vindo de `expenses`.
- CFO ve performance por projeto sem mocks.
- CFO ve recomendacoes baseadas em reembolso.
- A IA nao critica receita demo.
- Metricas lidam com divisao por zero.
- Testes cobrem calculo de margem, ROI, custo total e perdas evitaveis.

## Riscos

- Recomendacao parecer causal demais.
- CFO confundir receita demo com dado real.
- Frontend continuar usando mocks em partes importantes.
- Metricas ficarem bonitas, mas sem explicacao acionavel.
- Funcionarios receberem campos demais e abandonarem o fluxo.

## Decisoes Fechadas Para MVP

- Projeto sera o centro da analise.
- Projeto pode representar cliente/contexto comercial.
- Nao adicionar cliente separado na nota agora.
- Nao adicionar objetivo da despesa agora.
- Nao adicionar resultado esperado agora.
- Receita sera IA/demo e persistida.
- Recomendacoes serao focadas em reembolsos e padroes de gasto.
- ROI sera uma metrica, nao a unica metrica.
- Margem, lucro, perdas evitaveis e economia IA tambem serao metricas centrais.

## Proxima Acao Recomendada

Transformar este plano em uma fase executavel:

```text
Phase 5.1: CFO Project Performance Foundation
```

Escopo da primeira execucao:

1. migration `project_financial_entries`;
2. entidade/repository;
3. calculo backend de performance por projeto;
4. endpoint CFO;
5. testes de formula;
6. seed demo minimo.

Somente depois partir para recomendacoes IA e frontend completo.
