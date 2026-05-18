import type { BadgeVariant } from '../../components/ui/Badge'
import type { ExpenseStatus } from '../../types'

export const categoryLabels: Record<string, string> = {
  FOOD: 'Alimentacao',
  TRANSPORT: 'Transporte',
  LODGING: 'Hospedagem',
  PURCHASE: 'Compras',
  HARDWARE: 'Hardware',
}

export const categoryColors: Record<string, string> = {
  FOOD: '#97C459',
  TRANSPORT: '#85B7EB',
  LODGING: '#AFA9EC',
  PURCHASE: '#FAC775',
  HARDWARE: '#F09595',
}

export const statusLabels: Record<ExpenseStatus, string> = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Enviada',
  AI_APPROVED: 'Aprovada pela IA',
  PENDING_REVIEW: 'Em revisao',
  MANAGER_APPROVED: 'Aprovada pelo gestor',
  MANAGER_REJECTED: 'Rejeitada pelo gestor',
  FINANCE_APPROVED: 'Aprovada pelo financeiro',
  FINANCE_REJECTED: 'Rejeitada pelo financeiro',
  PAID: 'Paga',
  CANCELLED: 'Cancelada',
  NEEDS_REVISION: 'Precisa correcao',
  OCR_FAILED: 'Erro OCR',
}

export function riskVariantByScore(score: number): BadgeVariant {
  if (score >= 70) return 'red'
  if (score >= 35) return 'amber'
  return 'green'
}

export function riskVariantByLevel(level: string): BadgeVariant {
  if (level === 'Alto') return 'red'
  if (level === 'Medio') return 'amber'
  return 'green'
}

export function severityVariant(severity: string): BadgeVariant {
  if (severity === 'HIGH') return 'red'
  if (severity === 'MEDIUM') return 'amber'
  if (severity === 'LOW') return 'green'
  return 'gray'
}

export function severityRank(severity: string) {
  if (severity === 'HIGH') return 3
  if (severity === 'MEDIUM') return 2
  if (severity === 'LOW') return 1
  return 0
}

export function pct(value: number | null | undefined) {
  return value == null ? 'N/A' : `${Math.round(value * 100)}%`
}

export function multiple(value: number | null | undefined) {
  return value == null ? 'N/A' : `${value.toFixed(1)}x`
}

export function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  if (!year || !monthNumber) return month

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)))
}
