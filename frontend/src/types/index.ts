/** Role que vem do backend (banco de dados) */
export type BackendRole = 'EMPLOYEE' | 'MANAGER' | 'FINANCE' | 'ADMIN'

/** Role usada no roteamento do frontend */
export type UserRole = 'FUNCIONARIO' | 'GERENTE' | 'CFO'

/** Mapeia a role do backend para a role de roteamento do frontend */
export function mapRole(backendRole: BackendRole): UserRole {
  switch (backendRole) {
    case 'MANAGER': return 'GERENTE'
    case 'FINANCE': return 'CFO'
    case 'ADMIN':   return 'CFO'
    default:        return 'FUNCIONARIO'
  }
}

/** Retorna a rota raiz para uma role de frontend */
export function roleToRoute(role: UserRole): string {
  const routes: Record<UserRole, string> = {
    FUNCIONARIO: '/funcionario',
    GERENTE:     '/gerente',
    CFO:         '/cfo',
  }
  return routes[role]
}
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
