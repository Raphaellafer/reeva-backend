import type { ExpenseCategory, ExpenseResponse, ExpenseStatus } from './types'

export function fmt(value: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0)
}

export function fmtDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR')
}

export const categoryLabels: Record<ExpenseCategory, string> = {
  FOOD: 'Alimentacao',
  TRANSPORT: 'Transporte',
  LODGING: 'Hospedagem',
  PURCHASE: 'Compras',
}

export const reviewStatuses: ExpenseStatus[] = ['SUBMITTED', 'PENDING_REVIEW']

export function isApproved(expense: ExpenseResponse) {
  return ['AI_APPROVED', 'MANAGER_APPROVED', 'FINANCE_APPROVED', 'PAID'].includes(expense.status)
}

export function isRejected(expense: ExpenseResponse) {
  return ['MANAGER_REJECTED', 'FINANCE_REJECTED', 'NEEDS_REVISION', 'CANCELLED'].includes(expense.status)
}

export function isPending(expense: ExpenseResponse) {
  return ['DRAFT', 'SUBMITTED', 'PENDING_REVIEW'].includes(expense.status)
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

export function getReceiptLineItems(expense: ExpenseResponse): ReceiptLineItem[] {
  if (!expense.ocrData) return []
  try {
    const parsed = JSON.parse(expense.ocrData) as { line_items?: ReceiptLineItem[] }
    return parsed.line_items ?? []
  } catch {
    return []
  }
}
