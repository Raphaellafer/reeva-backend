# Reeva — Briefing completo do frontend

> Leia este arquivo antes de qualquer implementação. Ele contém todas as decisões de produto, UX e design já definidas pela equipe.

---

## O que é a Reeva

Startup B2B de **gestão de reembolso corporativo com inteligência artificial**.

### Fluxo central
1. Funcionário envia uma nota fiscal (foto, XML ou PDF)
2. A IA extrai todos os dados da nota automaticamente
3. A IA valida a nota no **SEFAZ** (autenticidade do CNPJ e da NF-e)
4. A IA classifica cada item como reembolsável ou não
5. A nota aprovada pela IA vai para o gerente aprovar
6. O gerente aprova ou recusa
7. Relatórios automáticos são enviados periodicamente

### Diferencial central — ROI Corporativo
Quando o funcionário sai para um **almoço corporativo com cliente**, ele vincula o CRM da empresa à nota fiscal. A Reeva então calcula o ROI daquele almoço: quanto foi investido vs quanto de receita aquele cliente gerou depois.

---

## Regras de negócio importantes

### Dois tipos de refeição
| Tipo | Limite | Bebida alcoólica | CRM vinculado |
|------|--------|-----------------|---------------|
| Refeição comum | Baixo (ex: R$ 80/pessoa) | ❌ Inelegível | Não |
| Almoço corporativo | Alto (ex: R$ 300/pessoa) | ✅ Liberada | Sim — habilita ROI |

### O que a IA verifica em toda nota
- Autenticidade no SEFAZ (CNPJ ativo, chave de acesso válida)
- Extração de dados: estabelecimento, CNPJ, data, valor, itens
- Classificação de cada item como reembolsável ou não
- Comparação com os limites de categoria do funcionário

### Relatórios automáticos gerados pela IA
- Semanal para gerentes: resumo de aprovações e alertas
- Imediato para gerente: quando detecta fraude
- Mensal para CFO: ROI + compliance + economia gerada

---

## Stack técnica

- **Frontend:** Vite + React + TypeScript
- **Estilo:** Tailwind CSS
- **Backend:** Java (Spring Boot) — já existe em `/src`
- **Estrutura de pastas frontend sugerida:**

```
frontend/
  src/
    components/
      ui/          # componentes base reutilizáveis (Badge, Button, Card, Table...)
      layout/      # Sidebar, Topbar, MobileNav, MobileFrame
      charts/      # HorizontalBar, ProgressBar, Sparkline
    pages/
      funcionario/ # F-01 a F-04 (mobile-first)
      gerente/     # G-01 a G-05 (desktop)
      cfo/         # C-01 a C-05 (desktop)
    hooks/
    types/
    router/        # React Router com guards de perfil
```

---

## Hierarquias de usuário — 3 níveis

### Nível 1 — Funcionário
- **Device:** Mobile-first (375px base). Pode usar no celular durante o dia.
- **Acesso:** Apenas dados próprios. Não vê outros funcionários.
- **Ações:** Enviar nota, acompanhar status, ver histórico pessoal.

### Nível 2 — Gerente
- **Device:** Desktop (1280px+).
- **Acesso:** Todos os funcionários da sua equipe/departamento.
- **Ações:** Aprovar/recusar notas, ver alertas da IA, ver relatórios da equipe.

### Nível 3 — CFO / Diretor
- **Device:** Desktop (1280px+).
- **Acesso:** Toda a empresa. Todos os gerentes e departamentos.
- **Ações:** Dashboard macro, ROI corporativo, compliance, relatórios para board.

---

## Mapa de telas completo

### Funcionário — Mobile (F-01 a F-04)

#### F-01 · Home — Resumo pessoal do mês
**Componentes:**
- Header com saudação + avatar
- Hero card escuro com: total reembolsado, variação vs mês anterior, contadores (aprovadas / pendentes / rejeitadas)
- Botão primário "Enviar nova nota fiscal" (destaque máximo)
- Lista de notas recentes com: nome do estabelecimento, tipo, data, valor, badge de status
- Link "Ver todo histórico"

**Bottom navigation:** Home | Enviar | Histórico | Perfil

---

#### F-02 · Enviar NF — Upload + análise de IA ao vivo
**Componentes:**
- Step indicator (4 passos: Tipo → Upload → IA → Confirmar)
- Grid 2×2 de seleção de tipo: Refeição comum | Almoço corporativo | Transporte | Viagem
- Quando "Almoço corporativo" selecionado → campos extras aparecem:
  - Empresa do cliente
  - ID no CRM (opcional — desbloqueia cálculo de ROI)
  - Oportunidade vinculada (dropdown com dados do CRM)
  - Participantes da reunião
- Zona de upload (drag & drop ou câmera)
- Painel lateral/inferior de IA em tempo real:
  - Validação SEFAZ (✓ OK / ✗ Falhou)
  - Extração de dados (✓ OK / em andamento)
  - Classificação de itens (X de Y itens ok)
  - Alerta inline se item inelegível detectado
- Quando tipo = Almoço corp., mostrar toggles de regras especiais (limite elevado, bebida liberada)
- Botão "Enviar para aprovação" (ativo só quando IA terminar)

---

#### F-03 · Histórico — Todas as notas do funcionário
**Componentes:**
- Filtros em pill: Todos | Pendentes | Aprovados | Rejeitados
- Lista agrupada por mês
- Cada item: borda lateral colorida por status (verde/amarelo/vermelho), nome, tipo, data, valor, badge
- Notas rejeitadas mostram motivo em banner vermelho abaixo
- Notas pendentes mostram "Aguardando gerente · enviado há Xh"

**Cores de status:**
- Verde `#97C459` → Aprovado
- Amarelo `#EF9F27` → Pendente / Aprovação
- Vermelho `#F09595` → Rejeitado

---

#### F-04 · Detalhe da nota — Status completo + itens
**Componentes:**
- Header com número da NF-e e badge de status
- Painel IA (fundo roxo claro `#EEEDFE`):
  - Estabelecimento, CNPJ, status SEFAZ, valor total, valor elegível
- Lista de itens detectados com badge verde (elegível) ou amarelo (inelegível) e valor
- Barra de progresso do limite mensal da categoria
- Timeline de eventos: IA validou → Enviado para gerente → (Aprovado/Recusado)

---

### Gerente — Desktop (G-01 a G-05)

**Layout base desktop:**
- Sidebar fixa 200px à esquerda
- Topbar 46px no topo
- Conteúdo com padding 20px 24px
- Background do content: cinza levemente diferente do branco dos cards

---

#### G-01 · Dashboard da equipe
**Métricas (4 cards):** Total reembolsado | Notas pendentes | Taxa de aprovação | Alertas da IA

**Seção principal (2 colunas):**
- Tabela: funcionário, notas enviadas, aprovadas, pendentes, alertas IA
- Painel de aprovações urgentes (cards compactos com ação rápida ✓/✗)

**Seção lateral:**
- Painel de alertas da IA (3 mais recentes)
- Gráfico de barras horizontais: gasto por categoria

---

#### G-02 · Fila de aprovações
**Layout:** Tabela à esquerda (70%) + painel de detalhe à direita (30%)

**Tabela:**
- Colunas: Funcionário | Nota | Valor | Status IA | Nível de risco | Ações
- Linhas coloridas por risco: verde (baixo), amarelo (médio), vermelho (alto/fraude)
- Ação rápida ✓ e ✗ inline

**Painel de detalhe (ao clicar na linha):**
- Todos os dados da nota
- Se almoço corporativo: cliente vinculado, oportunidade CRM, ROI estimado
- Banner verde se ROI alto → "Alta prioridade de aprovação"
- Histórico do funcionário (taxa, alertas)
- Botões Aprovar / Recusar

---

#### G-03 · Alertas da IA — Janela de anomalias
**Exclusivo do gerente.** A IA envia alertas que o gerente precisa tomar ação.

**Tipos de alerta com cor e severidade:**
- 🔴 Crítico: CNPJ inativo no SEFAZ, nota fraudulenta detectada → ação: Bloquear funcionário
- 🟡 Médio: Itens inelegíveis recorrentes → ação: Notificar funcionário
- 🔵 Informativo: Limite de categoria próximo → sem ação obrigatória

**Cada card de alerta mostra:**
- Funcionário envolvido
- Descrição do problema
- Notas relacionadas (mini cards)
- Botões de ação contextual

**Sidebar direita:**
- Resumo do mês (fraudes, itens, valor recuperado)
- Configuração de notificações (toggles)

---

#### G-04 · Todas as notas
Tabela completa de todas as notas da equipe com filtros por: funcionário, status, tipo, período, valor.

---

#### G-05 · Perfil do funcionário
Ao clicar em um funcionário: histórico completo, métricas pessoais, alertas relacionados a ele.

---

### CFO — Desktop (C-01 a C-05)

---

#### C-01 · Dashboard executivo
**Métricas (4 cards):** Total reembolsado empresa | Economia gerada pela IA | ROI médio almoços | Taxa compliance geral

**Seção principal:**
- Gráfico de barras horizontais: reembolso por departamento
- Tabela de gerentes: nome, equipe, total, compliance %, alertas

**Sidebar direita:**
- Card de ROI (fundo roxo `#EEEDFE`) com número grande
- Card de economia da IA com breakdown (fraudes + inelegíveis + horas RH)
- Alertas críticos da empresa

---

#### C-02 · ROI Corporativo — Diferencial central
**Métricas (4 cards):** ROI médio | Receita atribuída | Reuniões rastreadas | Custo total

**Seção principal:**
- Gráfico de barras horizontais: ROI por cliente (ranking)
  - Cores por performance: verde escuro (>5×) → verde médio (3-5×) → amarelo (<3×) → vermelho (0×)
- Tabela de melhores reuniões: data, cliente, vendedor, investido, receita gerada, ROI, status

**Sidebar direita:**
- Card destacado do melhor cliente (fundo verde claro)
  - Número ROI grande
  - Timeline: almoço → proposta → contrato
  - Insight de velocidade de fechamento
- Card de recomendação da IA (onde investir / onde parar)

---

#### C-03 · Compliance financeiro
**Métricas (4 cards):** Total processado | Aprovadas pela IA | Fraudes bloqueadas | Compliance %

**Seção principal:**
- Tabela de funcionários com mais ocorrências: depto, notas, fraudes, inelegíveis, valor recuperado, nível de risco
- Configuração de relatórios automáticos (toggles):
  - Relatório executivo mensal → board
  - Alerta crítico imediato → e-mail + WhatsApp
  - Resumo semanal → gerentes
  - Benchmark departamental

**Sidebar direita:**
- Card de economia total com breakdown
- Status de integrações CRM (Salesforce, HubSpot, Pipedrive)

---

#### C-04 · Todas as notas (empresa)
Tabela global com filtros por departamento, gerente, funcionário, período, status.

---

#### C-05 · Configurações gerais
Limites por categoria, políticas de reembolso, integrações, usuários e permissões.

---

## Design system

### Paleta de cores

```css
/* Status */
--green-fill: #EAF3DE;   --green-text: #27500A;   --green-border: #97C459;
--amber-fill: #FAEEDA;   --amber-text: #633806;   --amber-border: #FAC775;
--red-fill:   #FCEBEB;   --red-text:   #791F1F;   --red-border:   #F09595;
--blue-fill:  #E6F1FB;   --blue-text:  #0C447C;   --blue-border:  #85B7EB;
--purple-fill:#EEEDFE;   --purple-text:#3C3489;   --purple-border:#AFA9EC;

/* Marca */
--navy: #1a1a2e;   /* cor principal da marca — sidebar ativa, botão primário */
```

### Componentes base a criar

**Badge** — props: variant (green | amber | red | blue | purple | gray), children

**Button** — props: variant (primary=navy | ghost), size (sm | md), icon?

**Card** — wrapper com borda 0.5px, border-radius 10px, padding 12px 14px

**MetricCard** — label + valor grande + subtexto com trend

**HorizontalBarChart** — label + barra + valor (componente próprio, sem lib externa)

**StatusBadge** — atalho do Badge mapeado de status string

**AIPanel** — fundo roxo `#EEEDFE`, dot pulsante, título, conteúdo

**ProgressBar** — altura 4px, cor configurável

**Timeline** — lista vertical com dot colorido + linha conectora

**MobileFrame** — wrapper com notch, nav inferior, home indicator (só para dev/preview)

**Sidebar** (desktop) — logo, nav por seção, rodapé com usuário

**Topbar** (desktop) — título, slot direito para ações

**MobileNav** — bottom navigation com 4 itens

### Tipografia
- Font: sistema (`font-sans` do Tailwind é suficiente)
- Tamanhos: 10px labels, 11-12px body, 13-14px títulos, 20-32px números de destaque
- Peso: 400 normal, 500 medium (único peso bold usado)

### Bordas e arredondamento
- Cards: `rounded-[10px] border border-black/[0.07]`
- Botões: `rounded-[7px]`
- Badges: `rounded-full`
- Mobile cards: `rounded-[10px]`

### Sidebar desktop
- Largura: 200px
- Background: branco (igual topbar)
- Border right: `border-r border-black/[0.07]`
- Item ativo: `bg-[#1a1a2e] text-white`

---

## Roteamento sugerido

```
/login                          → seleção de perfil / autenticação

/funcionario/                   → F-01 Home
/funcionario/enviar             → F-02 Enviar nota
/funcionario/historico          → F-03 Histórico
/funcionario/nota/:id           → F-04 Detalhe da nota

/gerente/                       → G-01 Dashboard equipe
/gerente/aprovacoes             → G-02 Fila de aprovações
/gerente/alertas                → G-03 Alertas da IA
/gerente/notas                  → G-04 Todas as notas
/gerente/funcionario/:id        → G-05 Perfil do funcionário

/cfo/                           → C-01 Dashboard executivo
/cfo/roi                        → C-02 ROI Corporativo
/cfo/compliance                 → C-03 Compliance
/cfo/notas                      → C-04 Todas as notas
/cfo/configuracoes              → C-05 Configurações
```

Guard de rota: verificar `user.role` (FUNCIONARIO | GERENTE | CFO) e redirecionar para a raiz do perfil correto.

---

## Ordem sugerida de implementação

1. Componentes base (`/components/ui`)
2. Layout desktop (Sidebar + Topbar)
3. Layout mobile (MobileNav + estrutura de tela)
4. F-01 Home do funcionário
5. F-02 Enviar nota (com mock da IA)
6. F-03 Histórico
7. F-04 Detalhe da nota
8. G-01 Dashboard gerente
9. G-02 Aprovações
10. G-03 Alertas IA
11. C-01 Dashboard CFO
12. C-02 ROI Corporativo
13. C-03 Compliance
14. Roteamento + guards de perfil
15. Integração com API backend (substituir mocks)

---

## Dados mock para desenvolvimento

Use estes dados nos componentes antes de integrar com o backend.

```typescript
// types/index.ts
export type UserRole = 'FUNCIONARIO' | 'GERENTE' | 'CFO'
export type NotaStatus = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'ANALISE_IA'
export type NotaTipo = 'REFEICAO' | 'ALMOCO_CORPORATIVO' | 'TRANSPORTE' | 'VIAGEM'
export type AlertaNivel = 'CRITICO' | 'MEDIO' | 'INFORMATIVO'

export interface Nota {
  id: string
  nfe: string
  estabelecimento: string
  tipo: NotaTipo
  valor: number
  valorElegivel: number
  status: NotaStatus
  data: string
  sefazOk: boolean
  itensTotais: number
  itensElegiveis: number
  clienteVinculado?: string
  oportunidadeCrm?: string
  roiEstimado?: number
}

export interface Funcionario {
  id: string
  nome: string
  iniciais: string
  departamento: string
  notasMes: number
  aprovadas: number
  pendentes: number
  alertas: number
  totalReembolsado: number
  taxaAprovacao: number
}

export interface AlertaIA {
  id: string
  nivel: AlertaNivel
  funcionarioNome: string
  titulo: string
  descricao: string
  notasRelacionadas: string[]
  valor: number
}

export interface RoiCliente {
  cliente: string
  investido: number
  receita: number
  roi: number
  status: 'FECHADO' | 'EM_NEGOCIACAO' | 'PERDIDO'
  vendedor: string
  data: string
}
```

---

*Briefing gerado a partir das decisões de produto e UX definidas pela equipe fundadora da Reeva.*
