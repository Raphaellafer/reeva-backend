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
