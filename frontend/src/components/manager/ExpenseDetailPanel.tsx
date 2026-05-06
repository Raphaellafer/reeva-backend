import React, { useEffect, useState } from 'react'
import { getAttachmentBlob } from '../../api'
import { categoryLabels, fmt, fmtDate, getReceiptLineItems } from '../../realData'
import type { AttachmentItem, ExpenseResponse } from '../../types'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { StatusBadge } from '../ui/StatusBadge'

type ParsedOcrData = {
  readable?: boolean
  document_type?: string | null
  supplier_name?: string | null
  supplier_cnpj?: string | null
  supplier_address?: string | null
  total_amount?: number | null
  tax_amount?: number | null
  issue_date?: string | null
  payment_method?: string | null
  category?: string | null
  description?: string | null
  sefaz_verification_code?: string | null
  extraction?: {
    document_type?: OcrField<string>
    supplier_name?: OcrField<string>
    supplier_cnpj?: OcrField<string>
    supplier_address?: OcrField<string>
    total_amount?: OcrField<number | string>
    tax_amount?: OcrField<number | string>
    issue_date?: OcrField<string>
    payment_method?: OcrField<string>
    sefaz_verification_code?: OcrField<string>
  }
  analysis?: {
    readable?: boolean
    category?: string | null
    description?: string | null
  }
}

type OcrField<T> = {
  value?: T | null
  raw_text?: string | null
}

function AttachmentPreview({ attachment, token }: { attachment: AttachmentItem; token: string }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let url: string | null = null
    setObjectUrl(null)
    setError(null)

    getAttachmentBlob(token, attachment.id)
      .then((blob) => {
        if (!active) return
        url = URL.createObjectURL(blob)
        setObjectUrl(url)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar anexo.'))

    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [attachment.id, token])

  if (error) {
    return <p className="text-[12px] text-[#791F1F] bg-[#FCEBEB] border border-[#F09595] rounded-[8px] p-3">{error}</p>
  }

  if (!objectUrl) {
    return <div className="h-48 rounded-[8px] bg-gray-100 animate-pulse" />
  }

  if (attachment.mimeType?.startsWith('image/')) {
    return (
      <img
        src={objectUrl}
        alt={attachment.fileName}
        className="w-full max-h-[420px] object-contain rounded-[8px] border border-black/[0.07] bg-white"
      />
    )
  }

  return (
    <a href={objectUrl} target="_blank" rel="noreferrer" className="text-[12px] text-[#3C3489] underline">
      Abrir anexo: {attachment.fileName}
    </a>
  )
}

interface ExpenseDetailPanelProps {
  expense: ExpenseResponse
  token: string
  actions?: React.ReactNode
}

export function ExpenseDetailPanel({ expense, token, actions }: ExpenseDetailPanelProps) {
  const items = getReceiptLineItems(expense)
  const attachment = expense.attachments[0]
  const ocr = parseOcrData(expense.ocrData)
  const noteData = [
    { label: 'Estabelecimento', value: firstValue(expense.title, ocr?.supplier_name) },
    { label: 'Categoria', value: categoryLabels[expense.category] ?? ocrCategoryLabel(ocr?.category) },
    { label: 'Valor', value: expense.amount != null ? fmt(expense.amount) : formatNullableMoney(ocr?.total_amount) },
    { label: 'Data da nota', value: expense.expenseDate ? fmtDate(expense.expenseDate) : fmtDate(ocr?.issue_date) },
    { label: 'Descricao', value: firstValue(expense.description, ocr?.description) },
    { label: 'Tipo de documento', value: documentTypeLabel(ocr?.document_type) },
    { label: 'Forma de pagamento', value: paymentMethodLabel(ocr?.payment_method) },
    { label: 'CNPJ', value: ocr?.supplier_cnpj },
    { label: 'Endereco', value: ocr?.supplier_address },
    { label: 'Valor de imposto', value: formatNullableMoney(ocr?.tax_amount) },
    { label: 'Codigo SEFAZ', value: ocr?.sefaz_verification_code },
  ].filter((item) => hasValue(item.value))

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="text-[15px] font-medium text-[#1a1a2e] truncate">{expense.title}</p>
            <p className="text-[12px] text-gray-400">{expense.userName} - {expense.projectName} - {categoryLabels[expense.category]} - {fmtDate(expense.expenseDate)}</p>
          </div>
          <StatusBadge status={expense.status} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px] mb-3">
          <div><p className="text-gray-400">Valor</p><p className="font-medium">{fmt(expense.amount)}</p></div>
          <div><p className="text-gray-400">Score IA</p><p className="font-medium">{expense.aiScore ?? '-'}</p></div>
          <div><p className="text-gray-400">Politica</p><p className="font-medium">{expense.policyCompliant == null ? 'Pendente' : expense.policyCompliant ? 'Ok' : 'Fora'}</p></div>
          <div><p className="text-gray-400">Fiscal</p><p className="font-medium">{expense.sefazStatus ?? '-'}</p></div>
        </div>

        {(expense.aiAnalysis || expense.policyViolationReason || expense.manualReviewReason) && (
          <div className="p-2.5 rounded-[7px] bg-[#EEEDFE] border border-[#AFA9EC] text-[12px] mb-3 text-[#3C3489] space-y-1">
            {expense.aiAnalysis && <p>{expense.aiAnalysis}</p>}
            {expense.policyViolationReason && <p>Politica: {expense.policyViolationReason}</p>}
            {expense.manualReviewReason && <p>{expense.manualReviewReason}</p>}
          </div>
        )}

        {actions}
      </Card>

      <Card>
        <p className="text-[13px] font-medium text-[#1a1a2e] mb-3">Foto da nota</p>
        {attachment ? <AttachmentPreview attachment={attachment} token={token} /> : <p className="text-[12px] text-gray-400">Sem anexo.</p>}
      </Card>

      <Card>
        <p className="text-[13px] font-medium text-[#1a1a2e] mb-3">Itens captados pelo OCR</p>
        {items.length === 0 ? (
          <p className="text-[12px] text-gray-400">Nenhum item extraido ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] min-w-[420px]">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  {['Item', 'Qtd.', 'Unitario', 'Total'].map((header) => (
                    <th key={header} className="text-left py-2 text-[11px] uppercase tracking-wide text-gray-400 font-medium pr-3">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={`${item.name}-${index}`} className="border-b border-black/[0.04]">
                    <td className="py-2 pr-3 text-[#1a1a2e]">{item.name ?? 'Item'}</td>
                    <td className="py-2 pr-3">{item.quantity ?? '-'}</td>
                    <td className="py-2 pr-3">{item.unit_price == null ? '-' : fmt(item.unit_price)}</td>
                    <td className="py-2 pr-3 font-medium">{item.total_price == null ? '-' : fmt(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <p className="text-[13px] font-medium text-[#1a1a2e] mb-3">Dados da nota</p>
        {noteData.length === 0 ? (
          <p className="text-[12px] text-gray-400 mb-3">A IA ainda nao conseguiu extrair campos legiveis desta nota.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px] mb-3">
            {noteData.map((item) => (
              <div key={item.label} className={item.label === 'Descricao' || item.label === 'Endereco' ? 'md:col-span-2' : undefined}>
                <p className="text-gray-400">{item.label}</p>
                <p className="font-medium text-[#1a1a2e] whitespace-pre-wrap break-words">{item.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-black/[0.06] pt-3">
          <p className="text-[13px] font-medium text-[#1a1a2e] mb-3">Analise da IA</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div><p className="text-gray-400">Decisao</p><p className="font-medium">{expense.aiDecision ?? '-'}</p></div>
          <div><p className="text-gray-400">Elegivel autoaprovacao</p><p className="font-medium">{expense.autoApprovalEligible ? 'Sim' : 'Nao'}</p></div>
          <div><p className="text-gray-400">Alerta</p><p className="font-medium">{expense.aiAlertLevel ?? '-'}</p></div>
          <div><p className="text-gray-400">SEFAZ</p><p className="font-medium">{expense.sefazValidationMessage ?? '-'}</p></div>
        </div>
        {expense.aiDecision === 'READY_FOR_MANAGER' && (
          <div className="mt-3 rounded-[8px] border border-[#FAC775] bg-[#FAEEDA] p-3 text-[12px] text-[#633806]">
            <Badge variant="amber" className="mb-2">Motivo da fila</Badge>
            <p>{expense.manualReviewReason ?? expense.aiDecisionReason ?? 'A regra de autoaprovacao nao foi satisfeita.'}</p>
          </div>
        )}
      </Card>
    </div>
  )
}

function parseOcrData(raw: string | null): ParsedOcrData | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as ParsedOcrData
    if (!parsed.extraction) return parsed
    return {
      ...parsed,
      readable: parsed.analysis?.readable,
      document_type: readTextField(parsed.extraction.document_type),
      supplier_name: readTextField(parsed.extraction.supplier_name),
      supplier_cnpj: readTextField(parsed.extraction.supplier_cnpj),
      supplier_address: readTextField(parsed.extraction.supplier_address),
      total_amount: readNumberField(parsed.extraction.total_amount),
      tax_amount: readNumberField(parsed.extraction.tax_amount),
      issue_date: readTextField(parsed.extraction.issue_date),
      payment_method: readTextField(parsed.extraction.payment_method),
      category: parsed.analysis?.category ?? null,
      description: parsed.analysis?.description ?? null,
      sefaz_verification_code: readTextField(parsed.extraction.sefaz_verification_code),
    }
  } catch {
    return null
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

function hasValue(value: string | null | undefined) {
  return value != null && value.trim().length > 0
}

function firstValue(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (hasValue(value)) return value!.trim()
  }
  return null
}

function formatNullableMoney(value: number | null | undefined) {
  return value == null ? null : fmt(value)
}

function ocrCategoryLabel(category: string | null | undefined) {
  if (!category) return null
  return categoryLabels[category as keyof typeof categoryLabels] ?? category
}

function paymentMethodLabel(value: string | null | undefined) {
  if (!value) return null
  return {
    CASH: 'Dinheiro',
    CREDIT_CARD: 'Cartao de credito',
    DEBIT_CARD: 'Cartao de debito',
    PIX: 'Pix',
    CORPORATE_CARD: 'Cartao corporativo',
    MEAL_VOUCHER: 'Vale-refeicao',
    UNKNOWN: 'Nao identificado',
    OTHER: 'Outro',
  }[value] ?? value
}

function documentTypeLabel(value: string | null | undefined) {
  if (!value) return null
  return {
    NFE: 'NF-e',
    NFCE: 'NFC-e',
    CUPOM: 'Cupom fiscal',
    RECIBO: 'Recibo',
    HOTEL: 'Hospedagem',
    APP_RIDE: 'Aplicativo de transporte',
    PEDAGIO: 'Pedagio',
    PARKING: 'Estacionamento',
    OTHER: 'Outro',
  }[value] ?? value
}
