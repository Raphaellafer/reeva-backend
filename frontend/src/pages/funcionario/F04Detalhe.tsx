import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMyExpense, retryExpenseOcr, submitEmployeeCorrection } from '../../api'
import { MobileShell } from '../../components/layout/MobileShell'
import { AIPanel } from '../../components/ui/AIPanel'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Timeline } from '../../components/ui/Timeline'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { categoryLabels, fmt, fmtDate, getReceiptLineItems } from '../../realData'
import { getToken } from '../../session'
import type { TimelineItem } from '../../components/ui/Timeline'
import type { ExpenseCategory, ExpenseResponse } from '../../types'

const categories: Array<{ value: ExpenseCategory; label: string }> = [
  { value: 'FOOD', label: 'Alimentacao' },
  { value: 'TRANSPORT', label: 'Transporte' },
  { value: 'LODGING', label: 'Hospedagem' },
  { value: 'PURCHASE', label: 'Compras' },
]

function buildTimeline(expense: ExpenseResponse): TimelineItem[] {
  return expense.statusHistory.map((item) => ({
    label: item.notes || item.toStatus,
    date: new Date(item.changedAt).toLocaleString('pt-BR'),
    color: item.toStatus === 'NEEDS_REVISION' || item.toStatus.includes('REJECTED')
      ? 'red'
      : item.toStatus.includes('APPROVED')
        ? 'green'
        : item.toStatus === 'PENDING_REVIEW'
          ? 'amber'
          : 'blue',
  }))
}

export function F04Detalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [expense, setExpense] = useState<ExpenseResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [savingCorrection, setSavingCorrection] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ExpenseCategory | ''>('')
  const [expenseDate, setExpenseDate] = useState('')
  const [description, setDescription] = useState('')

  function shouldPoll(current: ExpenseResponse | null) {
    return current?.status === 'SUBMITTED'
  }

  async function loadExpense() {
    const token = getToken()
    if (!token || !id) return null
    const loaded = await getMyExpense(token, id)
    setExpense(loaded)
    return loaded
  }

  useEffect(() => {
    let cancelled = false
    let attempts = 0
    let timer: number | undefined

    async function loadAndPoll() {
      try {
        const loaded = await loadExpense()
        if (cancelled) return
        if (loaded && shouldPoll(loaded) && attempts < 12) {
          attempts += 1
          timer = window.setTimeout(() => void loadAndPoll(), 2500)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Falha ao carregar nota.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadAndPoll()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [id])

  useEffect(() => {
    if (!expense) return
    setTitle(expense.title ?? '')
    setCategory(expense.category)
    setExpenseDate(expense.expenseDate ?? '')
    setDescription(expense.description ?? '')
  }, [expense])

  const itens = expense ? getReceiptLineItems(expense) : []
  const analysisMessages = expense
    ? Array.from(new Set([
        expense.aiAnalysis,
        expense.aiDecisionReason !== expense.aiAnalysis ? expense.aiDecisionReason : null,
        expense.policyViolationReason ? `Politica: ${expense.policyViolationReason}` : null,
      ].filter(Boolean) as string[]))
    : []
  const shouldShowFiscal = Boolean(
    expense?.sefazValidationMessage
      && expense.sefazStatus !== 'NOT_APPLICABLE'
      && !expense.sefazValidationMessage.toLowerCase().includes('codigo sefaz nao informado')
  )
  const canRetryOcr = Boolean(
    expense
      && expense.status !== 'SUBMITTED'
      && (
        !expense.ocrData
        || expense.aiAnalysis?.toLowerCase().includes('openai')
        || expense.aiAnalysis?.toLowerCase().includes('falha')
        || expense.aiAnalysis?.toLowerCase().includes('ocr')
      )
  )
  const needsEmployeeCorrection = expense?.status === 'NEEDS_REVISION'
  const canCorrectNonFinancialFields = Boolean(expense?.amount != null && expense.amount > 0)

  async function retryOcr() {
    const token = getToken()
    if (!token || !id) return
    setRetrying(true)
      setError(null)
      try {
        const updated = await retryExpenseOcr(token, id)
        setExpense(updated)
        window.setTimeout(() => void loadExpense().catch(() => undefined), 2500)
      } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao reenviar OCR.')
    } finally {
      setRetrying(false)
    }
  }

  async function handleCorrectionSubmit() {
    const token = getToken()
    if (!token || !id || !expense) return

    if (!title.trim()) {
      setError('Informe o estabelecimento ou um titulo para a nota.')
      return
    }
    if (!category) {
      setError('Selecione a categoria da despesa.')
      return
    }
    if (!canCorrectNonFinancialFields) {
      setError('O valor da nota precisa ser lido pela IA. Tire uma nova foto para tentar o OCR novamente.')
      return
    }
    if (!expenseDate) {
      setError('Informe a data correta da nota.')
      return
    }

    setSavingCorrection(true)
    setError(null)
    try {
      const updated = await submitEmployeeCorrection(token, id, {
        title: title.trim(),
        category,
        expenseDate,
        description,
      })
      setExpense(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar correcao para o gestor.')
    } finally {
      setSavingCorrection(false)
    }
  }

  return (
    <MobileShell>
      <div className="bg-white px-4 pt-4 pb-3 flex items-center gap-3 border-b border-black/[0.06]">
        <button onClick={() => navigate(-1)} className="text-gray-400 text-xl leading-none">&lt;</button>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-gray-400 truncate font-mono">{expense?.id ?? 'Nota'}</p>
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-medium text-[#1a1a2e] truncate">{expense?.title ?? 'Carregando...'}</p>
            {expense && <StatusBadge status={expense.status} />}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {loading && <p className="text-center text-[13px] text-gray-400 py-8">Carregando...</p>}
        {error && <p className="text-[12px] text-[#791F1F] bg-[#FCEBEB] border border-[#F09595] rounded-[8px] p-3">{error}</p>}

        {expense && (
          <>
            <AIPanel title="Analise da IA">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <p className="text-[#3C3489]/60">Estabelecimento</p>
                  <p className="font-medium text-[#3C3489]">{expense.title}</p>
                </div>
                <div>
                  <p className="text-[#3C3489]/60">Projeto</p>
                  <p className="font-medium text-[#3C3489]">{expense.projectName}</p>
                </div>
                <div>
                  <p className="text-[#3C3489]/60">Categoria</p>
                  <p className="font-medium text-[#3C3489]">{categoryLabels[expense.category]}</p>
                </div>
                <div>
                  <p className="text-[#3C3489]/60">Score</p>
                  <p className="font-medium text-[#3C3489]">{expense.aiScore ?? '-'}</p>
                </div>
                <div>
                  <p className="text-[#3C3489]/60">Data</p>
                  <p className="font-medium text-[#3C3489]">{fmtDate(expense.expenseDate)}</p>
                </div>
                <div>
                  <p className="text-[#3C3489]/60">Valor</p>
                  <p className="font-medium text-[#3C3489]">{fmt(expense.amount)}</p>
                </div>
                <div>
                  <p className="text-[#3C3489]/60">Politica</p>
                  <p className="font-medium text-[#3C3489]">
                    {expense.policyCompliant == null ? 'Pendente' : expense.policyCompliant ? 'Ok' : 'Fora'}
                  </p>
                </div>
              </div>
              {(analysisMessages.length > 0 || shouldShowFiscal) && (
                <div className="mt-2 pt-2 border-t border-[#AFA9EC]/30 text-[12px] text-[#3C3489]/80 space-y-1">
                  {analysisMessages.map((message) => <p key={message}>{message}</p>)}
                  {shouldShowFiscal && <p>Fiscal: {expense.sefazValidationMessage}</p>}
                </div>
              )}
            </AIPanel>

            {canRetryOcr ? (
              <Button
                variant="primary"
                className="w-full justify-center"
                disabled={retrying}
                onClick={() => void retryOcr()}
              >
                {retrying ? 'Reenviando...' : 'Tentar OCR novamente'}
              </Button>
            ) : null}

            {needsEmployeeCorrection ? (
              <div className="bg-white rounded-[10px] border border-black/[0.07] p-4 space-y-3">
                <div>
                  <p className="text-[13px] font-medium text-[#1a1a2e]">Completar campos obrigatorios</p>
                  <p className="text-[12px] text-gray-500 mt-1">
                    A IA nao conseguiu identificar todos os dados nao financeiros da nota. O valor nao pode ser alterado manualmente.
                  </p>
                </div>

                {!canCorrectNonFinancialFields ? (
                  <p className="text-[12px] text-[#791F1F] bg-[#FCEBEB] border border-[#F09595] rounded-[8px] p-3">
                    O valor total nao foi lido com seguranca. Tire uma nova foto da nota para evitar reembolso com valor manual.
                  </p>
                ) : (
                  <div className="text-[12px] text-[#3C3489] bg-[#F4F2FF] border border-[#AFA9EC]/40 rounded-[8px] p-3">
                    Valor travado pela nota: <strong>{fmt(expense.amount)}</strong>
                  </div>
                )}

                <label className="block text-[12px] text-gray-500">
                  Estabelecimento ou titulo da nota
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="mt-1 w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-[12px] text-gray-500">
                    Categoria
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value as ExpenseCategory | '')}
                      className="mt-1 w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]"
                    >
                      <option value="">Selecione</option>
                      {categories.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-[12px] text-gray-500">
                    Data da nota
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={(event) => setExpenseDate(event.target.value)}
                      className="mt-1 w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]"
                    />
                  </label>
                </div>

                <label className="block text-[12px] text-gray-500">
                  Observacoes
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e] resize-none"
                  />
                </label>

                <Button
                  variant="primary"
                  className="w-full justify-center"
                  disabled={savingCorrection || !canCorrectNonFinancialFields}
                  onClick={() => void handleCorrectionSubmit()}
                >
                  {savingCorrection ? 'Enviando ao gestor...' : 'Enviar correcao ao gestor'}
                </Button>
              </div>
            ) : null}

            <div>
              <p className="text-[13px] font-medium text-[#1a1a2e] mb-2">Itens lidos pela IA</p>
              <div className="bg-white rounded-[10px] border border-black/[0.07] overflow-hidden divide-y divide-black/[0.06]">
                {itens.length === 0 && <p className="text-[12px] text-gray-400 p-3">Nenhum item extraido ainda.</p>}
                {itens.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="flex items-center justify-between px-3 py-2.5 gap-2">
                    <p className="text-[12px] text-[#1a1a2e] truncate">{item.name ?? 'Item'}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.quantity != null && <Badge variant="gray">{item.quantity}x</Badge>}
                      <p className="text-[12px] font-medium text-[#1a1a2e]">{fmt(item.total_price ?? item.unit_price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[10px] border border-black/[0.07] p-3">
              <p className="text-[13px] font-medium text-[#1a1a2e] mb-3">Linha do tempo</p>
              <Timeline items={buildTimeline(expense)} />
            </div>
          </>
        )}
      </div>
    </MobileShell>
  )
}
