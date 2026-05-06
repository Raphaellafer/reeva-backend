# Plano: Reorganizar a Experiencia CFO

## Objetivo

Reorganizar a area CFO para que ela deixe de parecer uma colecao de metricas soltas e passe a contar uma historia clara:

> Quanto a empresa gastou, onde ha risco, onde a IA economizou dinheiro e qual acao o CFO deve tomar agora.

A tela atual ja tem dados reais importantes, mas esta pesada para interpretar. O problema principal nao e falta de dado. E excesso de informacao no mesmo nivel de importancia.

## Principio Central

Cada tela deve responder uma pergunta principal.

Se uma informacao nao ajuda a responder aquela pergunta, ela deve:

- sair da tela;
- virar detalhe em outra tela;
- aparecer apenas depois de clique;
- ou ficar para uma fase futura.

O CFO nao deve precisar entender o funcionamento interno da Reeva para usar o produto. A interface precisa traduzir os dados em decisao.

## Nova Organizacao Recomendada

### Menu CFO

Manter somente 5 areas:

1. **Visao Executiva**
2. **Projetos**
3. **Riscos e Compliance**
4. **Notas**
5. **Politicas**

Evitar nomes como "ROI" como item principal, porque ROI e uma metrica dentro da analise de projeto, nao a experiencia inteira.

## Tela 1: Visao Executiva

### Pergunta que a tela responde

> O que merece minha atencao agora?

Essa deve ser a primeira tela do CFO.

### O que mostrar

#### Linha 1: Resumo executivo

Mostrar apenas 4 cards:

1. **Total reembolsado**
   - Quanto saiu ou sera pago em reembolsos.

2. **Perdas evitaveis**
   - Quanto poderia ter sido perdido sem controle.

3. **Economia pela IA**
   - Valor estimado economizado por bloqueio, politica e automacao.

4. **Compliance**
   - Percentual de notas dentro da politica.

Esses cards devem ser simples. Sem muitos subtitulos.

#### Linha 2: Alertas prioritarios

Mostrar uma lista curta com no maximo 3 alertas.

Exemplos:

- Projeto X concentra R$ 1.240 em perdas evitaveis.
- Categoria Alimentacao teve aumento fora do padrao.
- 4 notas foram rejeitadas por duplicidade.

Cada alerta deve ter:

- motivo;
- impacto financeiro;
- botao ou link para ver detalhes.

#### Linha 3: Onde investigar

Mostrar uma tabela curta com os projetos de maior exposicao.

Colunas:

- Projeto
- Reembolso total
- Perdas evitaveis
- Compliance
- Status

Nao mostrar score numerico cru nessa tela. Score interno deve virar status:

- Saudavel
- Atencao
- Critico

#### Linha 4: Gasto por categoria

Mostrar grafico simples de categorias.

Usar para responder:

> Onde a empresa esta gastando mais?

### O que remover desta tela

Remover da visao executiva:

- distribuicao detalhada por status;
- lista longa de recomendacoes;
- badges tecnicos demais;
- score numerico de risco;
- textos explicando "receita demo + reembolsos reais";
- qualquer coisa sobre configuracao.

Essas informacoes podem existir, mas nao na primeira tela.

### Resultado esperado

O CFO deve bater o olho e entender:

1. gasto total;
2. economia/perda;
3. nivel de controle;
4. quais projetos precisam de acao.

## Tela 2: Projetos

### Pergunta que a tela responde

> Quais projetos estao performando bem e quais estao consumindo dinheiro demais?

Essa tela substitui mentalmente a ideia de "ROI". O ROI continua existindo, mas dentro de Projetos.

### Estado inicial da tela

Mostrar uma lista de projetos.

Colunas principais:

- Projeto
- Receita demo
- Custo total
- Reembolsos reais
- Lucro demo
- Margem demo
- ROI demo
- Perdas evitaveis reais
- Compliance

### Como rotular dados demo

Usar um aviso discreto no topo:

> Receita, lucro, margem e ROI usam dados demo. Reembolsos, politicas, duplicidades e economia IA usam dados reais da Reeva.

Nao repetir esse texto em todo card.

### O que acontece ao clicar em um projeto

Abrir detalhe do projeto.

O detalhe deve ser dividido em 4 blocos:

1. **Resumo financeiro**
   - Receita demo
   - Custo total
   - Lucro demo
   - ROI demo

2. **Reembolsos reais**
   - total reembolsado;
   - categorias;
   - notas recentes;
   - tendencia mensal.

3. **Controle Reeva**
   - perdas evitaveis;
   - economia IA;
   - duplicidades;
   - violacoes de politica;
   - OCR baixo.

4. **Recomendacao**
   - uma recomendacao principal;
   - motivo;
   - impacto;
   - acao sugerida.

### O que remover ou esconder

Remover do detalhe:

- tabela repetida do proprio projeto;
- grafico de ROI quando so existe um projeto selecionado;
- muitos blocos laterais competindo;
- texto generico como "manter automacao onde houver baixo risco" sem ligar a um dado especifico.

### Resultado esperado

O CFO entende se o projeto:

- esta dando retorno;
- esta caro;
- tem reembolso fora do padrao;
- merece investigacao;
- merece mais investimento.

## Tela 3: Riscos e Compliance

### Pergunta que a tela responde

> Onde esta o risco operacional ou antifraude?

Essa tela nao deve ser uma segunda dashboard financeira. Ela deve ser uma tela de controle.

### O que mostrar

#### Cards do topo

Manter apenas 4:

1. Notas processadas
2. Fora da politica
3. Duplicadas rejeitadas
4. OCR baixo

Nao colocar "perda evitada" como card principal aqui. Perda evitada ja aparece na visao executiva. Aqui o foco e risco.

#### Lista principal

O elemento principal deve ser uma tabela de "casos de risco", nao uma tabela de todos os funcionarios.

Cada linha deve representar um risco acionavel:

- colaborador com reincidencia;
- projeto com muitas violacoes;
- categoria acima do limite;
- OCR ruim recorrente;
- duplicidade detectada.

Colunas:

- Tipo de risco
- Quem/projeto/categoria
- Ocorrencias
- Valor envolvido
- Severidade
- Acao

### Drill-down

Ao clicar em um risco:

- abrir lista de notas que explicam aquele risco;
- mostrar motivo da IA/politica;
- mostrar historico se existir.

### O que remover desta tela

Remover:

- ranking grande de funcionarios como primeira coisa;
- score numerico sem explicacao;
- projetos em atencao e categorias sensiveis ao mesmo tempo na lateral;
- cards duplicados do dashboard.

Essas informacoes podem virar abas:

- Por colaborador
- Por projeto
- Por categoria
- Por politica

Mas a primeira visao deve ser "riscos acionaveis".

### Resultado esperado

O CFO entende:

- onde ha risco;
- por que ha risco;
- quanto esta em jogo;
- qual acao tomar.

## Tela 4: Notas

### Pergunta que a tela responde

> Qual nota explica este numero?

Essa tela deve ser uma area de auditoria e rastreabilidade, nao uma dashboard.

### O que mostrar

Tabela de notas reais com filtros fortes.

Colunas recomendadas:

- Data
- Funcionario
- Projeto
- Fornecedor
- Categoria
- Valor
- Status
- Politica
- IA
- Duplicidade

### Filtros prioritarios

Mostrar no topo:

- periodo;
- projeto;
- status;
- categoria;
- risco.

Depois, em "mais filtros":

- funcionario;
- gestor;
- OCR baixo;
- duplicada;
- fora da politica.

### O que remover

Remover:

- gerente como coluna obrigatoria se a tela ficar larga demais;
- departamento como coluna obrigatoria;
- muitas badges na mesma linha;
- score IA se ele nao for usado para acao.

Esses dados podem aparecer no detalhe da nota.

### Detalhe da nota

Ao clicar em uma nota, abrir painel lateral com:

- foto/anexo;
- valor extraido;
- itens;
- politica aplicada;
- motivo da decisao;
- status;
- historico;
- duplicidade se existir.

### Resultado esperado

O CFO consegue auditar qualquer metrica clicando ate chegar na nota real.

## Tela 5: Politicas

### Pergunta que a tela responde

> Quais regras controlam os reembolsos e quem alterou essas regras?

Essa tela deve substituir "Configuracoes CFO".

### O que mostrar

#### Bloco 1: Politicas ativas

Tabela:

- Categoria
- Limite por nota
- Limite diario
- Limite mensal
- Recibo obrigatorio
- Score minimo IA
- Ultima alteracao

#### Bloco 2: Log de alteracoes

Mostrar somente as ultimas 5 alteracoes.

Ter botao:

> Ver historico completo

No historico completo, usar paginacao.

#### Bloco 3: Criar nova politica

Permitir adicionar categoria/politica nova quando ela ja existir como categoria do sistema.

Exemplo:

- Hardware
- Treinamento
- Eventos

Importante:

Se a categoria ainda nao existe no backend, nao vender como simples configuracao. Precisa deixar claro que criar uma nova categoria pode exigir:

- enum/categoria no backend;
- suporte no OCR/classificacao;
- politica;
- seed/migration;
- exibicao no frontend.

### O que remover

Remover da tela:

- integracoes CRM fake;
- usuarios fake;
- ERP em configuracao fake;
- botoes que nao persistem nada;
- salvar configuracoes local.

### Resultado esperado

O CFO consegue explicar:

- qual regra esta ativa;
- quem mudou;
- quando mudou;
- o que mudou.

## Hierarquia de Decisao

Para organizar melhor, toda informacao deve cair em um desses niveis:

### Nivel 1: Executivo

Vai para a Visao Executiva.

Exemplos:

- gasto total;
- perda evitavel;
- economia IA;
- compliance;
- top 3 projetos em risco.

### Nivel 2: Diagnostico

Vai para Projetos ou Riscos.

Exemplos:

- reembolso por categoria;
- projeto com maior custo;
- colaborador com reincidencia;
- categoria que viola politica.

### Nivel 3: Evidencia

Vai para Notas.

Exemplos:

- nota individual;
- imagem da nota;
- OCR;
- motivo da politica;
- historico da aprovacao.

### Nivel 4: Governanca

Vai para Politicas.

Exemplos:

- regra de limite;
- log de alteracao;
- usuario que alterou;
- criacao de nova politica.

## O Que Nao E Necessario Agora

Para o MVP CFO, nao precisa ter:

- integracao CRM;
- benchmark departamental;
- relatorios automaticos;
- ERP;
- usuarios e permissoes na tela CFO;
- muitas tendencias ao mesmo tempo;
- graficos sofisticados;
- IA generativa escrevendo textos longos;
- previsao de quarter baseada em reunioes/clientes.

Essas coisas podem vir depois. Agora o core e:

> reembolso real, risco real, economia real, projeto como centro de analise.

## Nova Ordem de Implementacao

### Fase 1: Simplificar Visao Executiva

Objetivo:

Deixar `/cfo` clara e executiva.

Tarefas:

- reduzir cards para 4;
- transformar recomendacoes em top 3 alertas;
- trocar score numerico por status;
- remover distribuicao por status;
- deixar grafico de categoria mais limpo;
- adicionar links para projetos, riscos e notas.

### Fase 2: Reorganizar Projetos

Objetivo:

Transformar `/cfo/roi` em `/cfo/projetos` mentalmente.

Tarefas:

- ajustar titulo para "Projetos";
- manter aviso de dados demo uma unica vez;
- melhorar lista de projetos;
- simplificar detalhe;
- remover grafico/tabela repetida quando um projeto estiver selecionado;
- adicionar bloco "Controle Reeva" ligado a dados reais.

### Fase 3: Reorganizar Riscos

Objetivo:

Fazer `/cfo/compliance` virar uma fila de riscos acionaveis.

Tarefas:

- criar conceito de `riskItems`;
- agrupar riscos por tipo;
- mostrar lista priorizada;
- mover colaborador/projeto/categoria para abas ou detalhes;
- adicionar clique para notas relacionadas.

### Fase 4: Melhorar Notas como Auditoria

Objetivo:

Fazer `/cfo/notas` explicar qualquer numero do CFO.

Tarefas:

- simplificar colunas;
- adicionar filtros de periodo e risco;
- criar painel lateral de detalhe;
- mostrar imagem/anexo, OCR, politica e historico.

### Fase 5: Politicas e Log

Objetivo:

Transformar configuracoes em governanca real.

Tarefas:

- renomear para Politicas;
- mostrar politicas reais;
- mostrar ultimas 5 alteracoes;
- criar historico completo paginado;
- planejar criacao segura de novas categorias.

## Criterios de Aceite

- O CFO entende a primeira tela em menos de 30 segundos.
- Cada tela tem uma pergunta principal clara.
- Nenhuma tela mistura dashboard, auditoria e configuracao ao mesmo tempo.
- Todo numero importante permite chegar nas notas que explicam o valor.
- Dados demo ficam claramente separados de dados reais.
- Score interno vira linguagem executiva.
- Notas ficam como evidencia, nao como dashboard.
- Politicas ficam como governanca, nao como configuracao fake.

## Recomendacao Final

Nao vale tentar deixar todas as telas "ricas" agora.

O melhor caminho e deixar a experiencia menor, mais limpa e mais confiavel.

Para o CFO, menos informacao bem organizada vale mais do que muitos dados jogados na tela.
