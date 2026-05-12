import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getMyExpense, retryExpenseOcr, submitEmployeeCorrection } from '../../api'
import { AttachmentPreview } from '../../components/attachments/AttachmentPreview'
import { MobileShell } from '../../components/layout/MobileShell'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Timeline } from '../../components/ui/Timeline'
import {
  aiDecisionLabel,
  categoryLabels,
  fmt,
  fmtDate,
  getReceiptLineItems,
  nextActionText,
  sefazStatusLabel,
  statusLabel,
} from '../../realData'
import { getToken } from '../../session'
import type { TimelineItem } from '../../components/ui/Timeline'
import type { ExpenseCategory } from '../../types'

const categories = Object.entries(categoryLabels) as Array<[ExpenseCategory, string]>

function buildTimeline(expense: NonNullable<ReturnType<typeof useQuery<any>>['data']>): TimelineItem[] {
  return expense.statusHistory.map((item: any) => ({
    label: item.notes || statusLabel(item.toStatus),
    date: new Date(item.changedAt).toLocaleString('pt-BR'),
    color: item.toStatus === 'NEEDS_REVISION' || item.toStatus.includes('REJECTED')
      ? 'red'
      : item.toStatus.includes('APPROVED') || item.toStatus === 'PAID'
        ? 'green'
        : item.toStatus === 'PENDING_REVIEW'
          ? 'amber'
          : 'blue',
  }))
}

export function F04Detalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const token = getToken()
  const queryClient = useQueryClient()

  const [retrying, setRetrying] = useState(false)
  const [savingCorrection, setSavingCorrection] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ExpenseCategory | ''>('')
  const [expenseDate, setExpenseDate] = useState('')
  const [description, setDescription] = useState('')

  const { data: expense, isLoading, error } = useQuery({
    queryKey: ['my-expense', id],
    queryFn: () => getMyExpense(token!, id!),
    enabled: !!token && !!id,
    refetchInterval: (query) => query.state.data?.status === 'SUBMITTED' ? 2500 : false,
  })

  useEffect(() => {
    if (!expense) return
    setTitle(expense.title ?? '')
    setCategory(expense.category)
    setExpenseDate(expense.expenseDate ?? '')
    setDescription(expense.description ?? '')
  }, [expense?.id])

  const items = expense ? getReceiptLineItems(expense) : []
  const analysisMessages = expense
    ? uniqueMessages([
        expense.aiAnalysis,
        expense.aiDecisionReason !== expense.aiAnalysis ? expense.aiDecisionReason : null,
        expense.policyViolationReason ? `Politica: ${expense.policyViolationReason}` : null,
        expense.manualReviewReason,
      ])
    : []
  const shouldShowFiscal = Boolean(
    expense?.sefazValidationMessage
      && expense.sefazStatus !== 'NOT_APPLICABLE'
      && !expense.sefazValidationMessage.toLowerCase().includes('codigo sefaz nao informado')
      && !analysisMessages.some((message) => containsMessage(message, expense.sefazValidationMessage))
  )
  const canRetryOcr = Boolean(
    expense
      && expense.status !== 'SUBMITTED'
      && (
        !expense.ocrData
        || expense.status === 'OCR_FAILED'
        || expense.aiAnalysis?.toLowerCase().includes('openai')
        || expense.aiAnalysis?.toLowerCase().includes('falha')
        || expense.aiAnalysis?.toLowerCase().includes('ocr')
      )
  )
  const needsEmployeeCorrection = expense?.status === 'NEEDS_REVISION'
  const canCorrectNonFinancialFields = Boolean(expense?.amount != null && expense.amount > 0)

  async function retryOcr() {
    if (!token || !id) return
    setRetrying(true)
    setActionError(null)
    try {
      await retryExpenseOcr(token, id)
      await queryClient.invalidateQueries({ queryKey: ['my-expense', id] })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Falha ao tentar nova leitura.')
    } finally {
      setRetrying(false)
    }
  }

  async function handleCorrectionSubmit() {
    if (!token || !id || !expense) return

    if (!title.trim()) {
      setActionError('Informe o estabelecimento ou um titulo para a nota.')
      return
    }
    if (!category) {
      setActionError('Selecione a categoria da despesa.')
      return
    }
    if (!canCorrectNonFinancialFields) {
      setActionError('O valor da nota precisa ser lido pela IA. Tire uma nova foto para tentar a leitura novamente.')
      return
    }
    if (!expenseDate) {
      setActionError('Informe a data correta da nota.')
      return
    }

    setSavingCorrection(true)
    setActionError(null)
    try {
      await submitEmployeeCorrection(token, id, {
        title: title.trim(),
        category,
        expenseDate,
        description,
      })
      await queryClient.invalidateQueries({ queryKey: ['my-expense', id] })
      await queryClient.invalidateQueries({ queryKey: ['my-expenses'] })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Falha ao enviar correcao para o gestor.')
    } finally {
      setSavingCorrection(false)
    }
  }

  return (
    <MobileShell>
      <div className="flex items-center gap-3 border-b border-black/[0.06] bg-white px-4 pb-3 pt-4">
        <button onClick={() => navigate(-1)} className="text-xl leading-none text-gray-400">&lt;</button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] text-gray-400">{expense?.projectName ?? 'Nota fiscal'}</p>
          <div className="flex items-center gap-2">
            <p className="truncate text-[14px] font-medium text-[#1a1a2e]">{expense?.title ?? 'Carregando...'}</p>
            {expense && <StatusBadge status={expense.status} />}
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        {isLoading && <p className="py-8 text-center text-[13px] text-gray-400">Carregando...</p>}
        {(error || actionError) && (
          <p className="rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">
            {actionError ?? (error instanceof Error ? error.message : 'Falha ao carregar nota.')}
          </p>
        )}

        {expense && (
          <>
            <Card className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">Status atual</p>
                  <p className="mt-1 text-[17px] font-semibold text-[#1a1a2e]">{statusLabel(expense.status)}</p>
                </div>
                <p className="shrink-0 text-[18px] font-semibold text-[#1a1a2e]">{fmt(expense.amount)}</p>
              </div>
              <div className="rounded-[8px] border border-black/[0.07] bg-[#F8F8FC] p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Proxima acao</p>
                <p className="mt-1 text-[12px] text-gray-600">{nextActionText(expense)}</p>
              </div>
              {canRetryOcr && (
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  disabled={retrying}
                  onClick={() => void retryOcr()}
                >
                  {retrying ? 'Tentando nova leitura...' : 'Tentar leitura novamente'}
                </Button>
              )}
            </Card>

            {needsEmployeeCorrection && (
              <CorrectionCard
                title={title}
                category={category}
                expenseDate={expenseDate}
                description={description}
                amount={expense.amount}
                canCorrectNonFinancialFields={canCorrectNonFinancialFields}
                savingCorrection={savingCorrection}
                onTitleChange={setTitle}
                onCategoryChange={setCategory}
                onExpenseDateChange={setExpenseDate}
                onDescriptionChange={setDescription}
                onSubmit={() => void handleCorrectionSubmit()}
              />
            )}

            <Card>
              <p className="mb-3 text-[13px] font-medium text-[#1a1a2e]">Foto da nota</p>
              {expense.attachments[0] ? (
                <AttachmentPreview attachment={expense.attachments[0]} token={token!} />
              ) : (
                <p className="text-[12px] text-gray-400">Sem foto anexada.</p>
              )}
            </Card>

            <Card>
              <p className="mb-3 text-[13px] font-medium text-[#1a1a2e]">Dados da nota</p>
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <InfoItem label="Estabelecimento" value={expense.title} full />
                <InfoItem label="Projeto" value={expense.projectName} />
                <InfoItem label="Categoria" value={categoryLabels[expense.category]} />
                <InfoItem label="Data" value={fmtDate(expense.expenseDate)} />
                <InfoItem label="Valor" value={fmt(expense.amount)} />
                {expense.description && <InfoItem label="Observacoes" value={expense.description} full />}
              </div>
            </Card>

            <Card>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-[#1a1a2e]">Analise da IA</p>
                <Badge variant={scoreVariant(expense.aiScore)}>{expense.aiScore == null ? 'Sem score' : `${expense.aiScore}/100`}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <InfoItem label="Decisao" value={aiDecisionLabel(expense.aiDecision)} />
                <InfoItem label="Politica" value={expense.aiDecision === 'REJECTED_BY_FISCAL_VALIDATION' ? 'Bloqueio fiscal' : expense.policyCompliant == null ? 'Pendente' : expense.policyCompliant ? 'Dentro da politica' : 'Fora da politica'} />
                <InfoItem label="Fiscal" value={sefazStatusLabel(expense.sefazStatus)} />
                <InfoItem label="Autoaprovacao" value={expense.autoApprovalEligible ? 'Elegivel' : 'Nao elegivel'} />
              </div>
              {(analysisMessages.length > 0 || shouldShowFiscal) && (
                <div className="mt-3 space-y-1 rounded-[8px] border border-[#AFA9EC]/40 bg-[#F4F2FF] p-3 text-[12px] text-[#3C3489]">
                  {analysisMessages.map((message) => <p key={message}>{message}</p>)}
                  {shouldShowFiscal && <p>Fiscal: {expense.sefazValidationMessage}</p>}
                </div>
              )}
            </Card>

            <Card>
              <p className="mb-3 text-[13px] font-medium text-[#1a1a2e]">Itens da nota</p>
              <div className="overflow-hidden rounded-[8px] border border-black/[0.07] bg-white">
                {items.length === 0 && <p className="p-3 text-[12px] text-gray-400">Nenhum item identificado ainda.</p>}
                {items.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-2 border-b border-black/[0.05] px-3 py-2.5 last:border-b-0">
                    <p className="truncate text-[12px] text-[#1a1a2e]">{item.name ?? 'Item'}</p>
                    <div className="flex shrink-0 items-center gap-2">
                      {item.quantity != null && <Badge variant="gray">{item.quantity}x</Badge>}
                      <p className="text-[12px] font-medium text-[#1a1a2e]">{fmt(item.total_price ?? item.unit_price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <p className="mb-3 text-[13px] font-medium text-[#1a1a2e]">Historico da nota</p>
              <Timeline items={buildTimeline(expense)} />
            </Card>
          </>
        )}
      </div>
    </MobileShell>
  )
}

function InfoItem({ label, value, full = false }: { label: string; value: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : undefined}>
      <p className="text-gray-400">{label}</p>
      <p className="mt-0.5 break-words font-medium text-[#1a1a2e]">{value || '-'}</p>
    </div>
  )
}

function CorrectionCard({
  title,
  category,
  expenseDate,
  description,
  amount,
  canCorrectNonFinancialFields,
  savingCorrection,
  onTitleChange,
  onCategoryChange,
  onExpenseDateChange,
  onDescriptionChange,
  onSubmit,
}: {
  title: string
  category: ExpenseCategory | ''
  expenseDate: string
  description: string
  amount: number | null
  canCorrectNonFinancialFields: boolean
  savingCorrection: boolean
  onTitleChange: (value: string) => void
  onCategoryChange: (value: ExpenseCategory | '') => void
  onExpenseDateChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onSubmit: () => void
}) {
  return (
    <Card className="space-y-3 border-[#FAC775]">
      <div>
        <p className="text-[13px] font-medium text-[#1a1a2e]">Corrigir dados da nota</p>
        <p className="mt-1 text-[12px] text-gray-500">Atualize os campos solicitados e envie novamente para o gestor.</p>
      </div>

      {!canCorrectNonFinancialFields ? (
        <p className="rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">
          O valor total nao foi lido com seguranca. Tente uma nova leitura da nota para evitar valor manual.
        </p>
      ) : (
        <p className="rounded-[8px] border border-[#AFA9EC]/40 bg-[#F4F2FF] p-3 text-[12px] text-[#3C3489]">
          Valor travado pela nota: <strong>{fmt(amount)}</strong>
        </p>
      )}

      <label className="block text-[12px] font-medium text-gray-500">
        Estabelecimento ou titulo
        <input value={title} onChange={(event) => onTitleChange(event.target.value)} className={fieldClass} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-[12px] font-medium text-gray-500">
          Categoria
          <select value={category} onChange={(event) => onCategoryChange(event.target.value as ExpenseCategory | '')} className={fieldClass}>
            <option value="">Selecione</option>
            {categories.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="block text-[12px] font-medium text-gray-500">
          Data da nota
          <input type="date" value={expenseDate} onChange={(event) => onExpenseDateChange(event.target.value)} className={fieldClass} />
        </label>
      </div>

      <label className="block text-[12px] font-medium text-gray-500">
        Observacoes
        <textarea value={description} onChange={(event) => onDescriptionChange(event.target.value)} rows={3} className={`${fieldClass} resize-none`} />
      </label>

      <Button
        variant="primary"
        className="w-full justify-center"
        disabled={savingCorrection || !canCorrectNonFinancialFields}
        onClick={onSubmit}
      >
        {savingCorrection ? 'Enviando ao gestor...' : 'Enviar correcao'}
      </Button>
    </Card>
  )
}

function scoreVariant(score: number | null): 'green' | 'amber' | 'red' | 'gray' {
  if (score == null) return 'gray'
  if (score >= 90) return 'green'
  if (score >= 70) return 'amber'
  return 'red'
}

function uniqueMessages(messages: Array<string | null | undefined>) {
  const result: string[] = []
  for (const message of messages) {
    if (!message) continue
    const normalized = normalizeMessage(message)
    if (!normalized) continue
    if (result.some((existing) => normalizeMessage(existing) === normalized || containsMessage(existing, message))) continue
    result.push(message)
  }
  return result
}

function containsMessage(container: string | null | undefined, message: string | null | undefined) {
  const normalizedContainer = normalizeMessage(container)
  const normalizedMessage = normalizeMessage(message)
  return Boolean(normalizedContainer && normalizedMessage && normalizedContainer.includes(normalizedMessage))
}

function normalizeMessage(message: string | null | undefined) {
  return (message ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^(politica|fiscal|sefaz|revisao):\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const fieldClass = 'mt-1 w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#3C3489] focus:ring-2 focus:ring-[#3C3489]/15'
