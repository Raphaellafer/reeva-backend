import type { AiDecision, ExpenseResponse, ExpenseStatus, PaymentMethod, SefazStatus } from './types'

export function fmt(value: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0)
}

export function fmtDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR')
}

export const categoryLabels: Record<string, string> = {
  FOOD: 'Alimentação',
  TRANSPORT: 'Transporte',
  LODGING: 'Hospedagem',
  PURCHASE: 'Compras',
  HARDWARE: 'Hardware',
}

export function categoryLabel(category: string | null | undefined) {
  if (!category) return '-'
  return categoryLabels[category] ?? category
}

export const paymentMethodLabels: Record<PaymentMethod | string, string> = {
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Cartão de crédito',
  DEBIT_CARD: 'Cartão de débito',
  PIX: 'Pix',
  CORPORATE_CARD: 'Cartão corporativo',
  MEAL_VOUCHER: 'Vale-refeição',
  OTHER: 'Outro',
  UNKNOWN: 'Não identificado',
}

export const statusLabels: Record<ExpenseStatus | string, string> = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Enviada',
  AI_APPROVED: 'Aprovada pela IA',
  PENDING_REVIEW: 'Em revisão',
  MANAGER_APPROVED: 'Aprovada pelo gestor',
  MANAGER_REJECTED: 'Rejeitada pelo gestor',
  FINANCE_APPROVED: 'Liberada para pagamento',
  FINANCE_REJECTED: 'Rejeitada pelo financeiro',
  PAID: 'Paga',
  CANCELLED: 'Cancelada',
  NEEDS_REVISION: 'Correção solicitada',
  OCR_FAILED: 'Leitura falhou',
  APROVADO: 'Aprovado',
  PENDENTE: 'Pendente',
  REJEITADO: 'Rejeitado',
  ANALISE_IA: 'Análise IA',
}

export const aiDecisionLabels: Record<AiDecision | string, string> = {
  AUTO_APPROVED: 'Autoaprovada',
  READY_FOR_MANAGER: 'Enviar para gestor',
  NEEDS_EMPLOYEE_CORRECTION: 'Precisa de correção',
  REJECTED_BY_POLICY: 'Reprovada pela política',
  REJECTED_BY_FISCAL_VALIDATION: 'Reprovada na validação fiscal',
  PENDING_MANUAL_REVIEW: 'Revisão manual',
  DUPLICATE_REJECTED: 'Duplicada rejeitada',
}

export const sefazStatusLabels: Record<SefazStatus | string, string> = {
  NOT_APPLICABLE: 'Não aplicável',
  PENDING: 'Pendente',
  VALID: 'Válida',
  INVALID: 'Inválida',
  UNAVAILABLE: 'Indisponível',
}

export const reviewStatuses: ExpenseStatus[] = ['SUBMITTED', 'PENDING_REVIEW']

export function statusLabel(status: string | null | undefined) {
  if (!status) return '-'
  return statusLabels[status] ?? status
}

export function aiDecisionLabel(decision: string | null | undefined) {
  if (!decision) return '-'
  return aiDecisionLabels[decision] ?? decision
}

export function sefazStatusLabel(status: string | null | undefined) {
  if (!status) return '-'
  return sefazStatusLabels[status] ?? status
}

export function isApproved(expense: ExpenseResponse) {
  return ['AI_APPROVED', 'MANAGER_APPROVED', 'FINANCE_APPROVED', 'PAID'].includes(expense.status)
}

export function isRejected(expense: ExpenseResponse) {
  return ['MANAGER_REJECTED', 'FINANCE_REJECTED', 'CANCELLED'].includes(expense.status)
}

export function isPending(expense: ExpenseResponse) {
  return ['DRAFT', 'SUBMITTED', 'PENDING_REVIEW', 'OCR_FAILED'].includes(expense.status)
}

export function isActionRequired(expense: ExpenseResponse) {
  return ['NEEDS_REVISION', 'OCR_FAILED'].includes(expense.status)
}

export function nextActionText(expense: ExpenseResponse) {
  if (expense.status === 'NEEDS_REVISION') return 'Revise os campos solicitados e envie novamente ao gestor.'
  if (expense.status === 'OCR_FAILED') return 'Tente reenviar a leitura da nota ou envie uma foto mais nítida.'
  if (expense.status === 'SUBMITTED') return 'A IA está analisando a nota. Ela aparecerá na fila do gestor se precisar de revisão.'
  if (expense.status === 'PENDING_REVIEW') return 'A nota está com o gestor para decisão.'
  if (isApproved(expense)) return 'Nota aprovada. Acompanhe a liberação para pagamento.'
  if (isRejected(expense)) return 'Nota encerrada. Veja o motivo no histórico.'
  return 'Nenhuma ação necessária no momento.'
}

export function initials(name: string | null | undefined) {
  return (name ?? 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U'
}

export interface ReceiptLineItem {
  name: string | null
  quantity: number | null
  unit_price: number | null
  total_price: number | null
}

type OcrField<T> = {
  value?: T | null
  raw_text?: string | null
}

type NestedOcrLineItem = {
  name?: OcrField<string>
  quantity?: OcrField<number | string>
  unit_price?: OcrField<number | string>
  total_price?: OcrField<number | string>
}

type ParsedOcrData = {
  line_items?: ReceiptLineItem[]
  extraction?: {
    line_items?: NestedOcrLineItem[]
  }
}

export function getReceiptLineItems(expense: ExpenseResponse): ReceiptLineItem[] {
  if (!expense.ocrData) return []
  try {
    const parsed = JSON.parse(expense.ocrData) as ParsedOcrData
    if (Array.isArray(parsed.extraction?.line_items)) {
      return parsed.extraction.line_items.map((item) => ({
        name: readTextField(item.name),
        quantity: readNumberField(item.quantity),
        unit_price: readNumberField(item.unit_price),
        total_price: readNumberField(item.total_price),
      })).filter((item) => item.name && item.name.trim().length > 0)
    }
    return parsed.line_items ?? []
  } catch {
    return []
  }
}

function readTextField(field: OcrField<string> | undefined) {
  return field?.value ?? field?.raw_text ?? null
}

function readNumberField(field: OcrField<number | string> | undefined) {
  const raw = field?.raw_text ?? field?.value
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') return raw
  const normalized = raw.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}
