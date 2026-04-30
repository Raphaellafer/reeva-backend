import React, { useEffect, useState } from 'react'
import { getAttachmentBlob } from '../../api'
import { categoryLabels, fmt, fmtDate, getReceiptLineItems } from '../../realData'
import type { AttachmentItem, ExpenseResponse } from '../../types'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { StatusBadge } from '../ui/StatusBadge'

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
        <p className="text-[13px] font-medium text-[#1a1a2e] mb-3">Dados brutos da IA</p>
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div><p className="text-gray-400">Decisao</p><p className="font-medium">{expense.aiDecision ?? '-'}</p></div>
          <div><p className="text-gray-400">Elegivel autoaprovacao</p><p className="font-medium">{expense.autoApprovalEligible ? 'Sim' : 'Nao'}</p></div>
          <div><p className="text-gray-400">Alerta</p><p className="font-medium">{expense.aiAlertLevel ?? '-'}</p></div>
          <div><p className="text-gray-400">SEFAZ</p><p className="font-medium">{expense.sefazValidationMessage ?? '-'}</p></div>
        </div>
        {expense.ocrData && (
          <details className="mt-3">
            <summary className="text-[12px] text-[#3C3489] cursor-pointer">Ver JSON OCR</summary>
            <pre className="mt-2 max-h-56 overflow-auto rounded-[8px] bg-gray-50 p-3 text-[11px] text-gray-700 whitespace-pre-wrap">
              {formatOcrJson(expense.ocrData)}
            </pre>
          </details>
        )}
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

function formatOcrJson(raw: string) {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}
