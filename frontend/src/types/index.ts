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

export interface TimelineEvent {
  label: string
  date: string
  color?: 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'gray'
}

export interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}
