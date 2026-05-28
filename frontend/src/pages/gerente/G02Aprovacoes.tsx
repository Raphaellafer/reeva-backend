import React, { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { approveExpense, getApprovedPayments, getTeamExpenses, rejectExpense, requestRevision } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { ExpenseDetailPanel } from '../../components/manager/ExpenseDetailPanel'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { categoryLabels, fmt, fmtDate, reviewStatuses } from '../../realData'
import { getToken } from '../../session'
import type { ExpenseResponse, PageResponse } from '../../types'

type ManagerAction = 'reject' | 'revision'

function monthStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function risk(expense: ExpenseResponse): { label: string; variant: 'green' | 'amber' | 'red' } {
  if (expense.policyCompliant === false || expense.sefazStatus === 'INVALID') return { label: 'Alto', variant: 'red' }
  if ((expense.complianceScore ?? 100) < 70 || (expense.aiScore ?? 100) < 85 || expense.status === 'PENDING_REVIEW') return { label: 'Médio', variant: 'amber' }
  return { label: 'Baixo', variant: 'green' }
}

function reviewReason(expense: ExpenseResponse) {
  return expense.manualReviewReason
    ?? expense.policyViolationReason
    ?? expense.aiDecisionReason
    ?? expense.aiAnalysis
    ?? 'Aguardando decisão do gestor.'
}

export function G02Aprovacoes() {
  const token = getToken()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<ExpenseResponse | null>(null)
  const [actionMode, setActionMode] = useState<ManagerAction | null>(null)
  const [actionNotes, setActionNotes] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: page, isLoading, error } = useQuery({
    queryKey: ['team-expenses', 'queue'],
    queryFn: () => getTeamExpenses(token!, undefined, 0, 50),
    enabled: !!token,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    select: (data) => ({
      ...data,
      content: data.content.filter((e) => reviewStatuses.includes(e.status)),
    }),
  })

  const expenses = page?.content ?? []

  const approveMutation = useMutation({
    mutationFn: (expenseId: string) => approveExpense(token!, expenseId),
    onMutate: async (expenseId) => {
      await queryClient.cancelQueries({ queryKey: ['team-expenses'] })
      const previousPages = queryClient.getQueriesData<PageResponse<ExpenseResponse>>({ queryKey: ['team-expenses'] })
      const approvedAt = new Date().toISOString()

      queryClient.setQueriesData<PageResponse<ExpenseResponse>>({ queryKey: ['team-expenses'] }, (old) => {
        if (!old) return old
        return {
          ...old,
          content: old.content.map((expense) =>
            expense.id === expenseId
              ? { ...expense, status: 'MANAGER_APPROVED', updatedAt: approvedAt }
              : expense
          ),
        }
      })

      setSelected((current) => current?.id === expenseId ? null : current)
      return { previousPages }
    },
    onSuccess: (updated) => {
      queryClient.setQueriesData<PageResponse<ExpenseResponse>>({ queryKey: ['team-expenses'] }, (old) => {
        if (!old) return old
        return {
          ...old,
          content: old.content.map((expense) => expense.id === updated.id ? updated : expense),
        }
      })
      setActionMode(null)
      setActionNotes('')
      setActionError(null)
      const from = monthStart()
      const to = today()
      void queryClient.prefetchQuery({
        queryKey: ['approved-payments', from, to],
        queryFn: () => getApprovedPayments(token!, from, to),
        staleTime: 60_000,
      })
    },
    onError: (err, _expenseId, context) => {
      context?.previousPages?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data)
      })
      setActionError(err instanceof Error ? err.message : 'Acao nao concluida.')
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['manager-dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['team-expenses'], refetchType: 'inactive' })
      void queryClient.invalidateQueries({ queryKey: ['approved-payments'], refetchType: 'inactive' })
    },
  })
  const rejectMutation = useMutation({
    mutationFn: ({ expenseId, notes }: { expenseId: string; notes: string }) =>
      rejectExpense(token!, expenseId, notes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['team-expenses'] })
      void queryClient.invalidateQueries({ queryKey: ['manager-dashboard'] })
      setActionMode(null)
      setActionNotes('')
      setActionError(null)
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : 'Ação não concluída.'),
  })

  const revisionMutation = useMutation({
    mutationFn: ({ expenseId, notes }: { expenseId: string; notes: string }) =>
      requestRevision(token!, expenseId, notes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['team-expenses'] })
      void queryClient.invalidateQueries({ queryKey: ['manager-dashboard'] })
      setActionMode(null)
      setActionNotes('')
      setActionError(null)
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : 'Ação não concluída.'),
  })

  const isMutating = approveMutation.isPending || rejectMutation.isPending || revisionMutation.isPending

  function submitDecision() {
    if (!selected || !actionMode) return
    const notes = actionNotes.trim()
    if (notes.length < 8) {
      setActionError('Informe um motivo claro para o funcionário entender o retorno.')
      return
    }
    setActionError(null)
    if (actionMode === 'reject') rejectMutation.mutate({ expenseId: selected.id, notes })
    if (actionMode === 'revision') revisionMutation.mutate({ expenseId: selected.id, notes })
  }

  const highRiskCount = useMemo(
    () => expenses.filter((expense) => risk(expense).variant === 'red').length,
    [expenses]
  )

  return (
    <DesktopShell title="Fila de aprovações" role="GERENTE">
      {(error || actionError) && (
        <p className="mb-4 rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">
          {actionError ?? (error instanceof Error ? error.message : 'Falha ao carregar aprovações.')}
        </p>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <QueueSummary label="Na fila" value={expenses.length} />
        <QueueSummary label="Alto risco" value={highRiskCount} tone={highRiskCount > 0 ? 'red' : 'neutral'} />
        <QueueSummary label="Valor em análise" value={fmt(expenses.reduce((sum, expense) => sum + (expense.amount ?? 0), 0))} />
      </div>

      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="min-w-0 flex-1">
          <Card>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-medium text-[#1a1a2e]">Notas aguardando decisão</p>
                <p className="mt-0.5 text-[12px] text-gray-400">Priorize risco alto, política fora do padrão, conformidade baixa e leitura OCR baixa.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-[13px]">
                <thead>
                  <tr className="border-b border-black/[0.06]">
                    {['Funcionário', 'Nota', 'Categoria', 'Valor', 'Data', 'Status', 'Risco', ''].map((header) => (
                      <th key={header} className="py-2.5 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading && expenses.length === 0 && (
                    <tr><td colSpan={8} className="py-8 text-center text-gray-400">Carregando...</td></tr>
                  )}
                  {!isLoading && expenses.length === 0 && (
                    <tr><td colSpan={8} className="py-8 text-center text-gray-400">Nenhuma aprovação pendente.</td></tr>
                  )}
                  {expenses.map((expense) => {
                    const riskConfig = risk(expense)
                    return (
                      <tr
                        key={expense.id}
                        onClick={() => {
                          setSelected(expense)
                          setActionMode(null)
                          setActionNotes('')
                          setActionError(null)
                        }}
                        className={`cursor-pointer border-b border-black/[0.04] ${selected?.id === expense.id ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                      >
                        <td className="whitespace-nowrap py-3 pr-3 font-medium text-[#1a1a2e]">{expense.userName}</td>
                        <td className="max-w-[220px] py-3 pr-3">
                          <p className="truncate text-[#1a1a2e]">{expense.title}</p>
                          <p className="truncate text-[11px] text-gray-400">{expense.projectName}</p>
                        </td>
                        <td className="whitespace-nowrap py-3 pr-3 text-gray-500">{categoryLabels[expense.category] ?? expense.category}</td>
                        <td className="whitespace-nowrap py-3 pr-3 font-medium">{fmt(expense.amount)}</td>
                        <td className="whitespace-nowrap py-3 pr-3 text-gray-500">{fmtDate(expense.expenseDate)}</td>
                        <td className="py-3 pr-3"><StatusBadge status={expense.status} /></td>
                        <td className="py-3 pr-3"><Badge variant={riskConfig.variant}>{riskConfig.label}</Badge></td>
                        <td className="py-3 pr-3 text-right">
                          <Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); setSelected(expense) }}>
                            Analisar
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-3 xl:w-[520px]">
          {selected && token ? (
            <>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-[#1a1a2e]">Motivo da revisão</p>
                    <p className="mt-1 text-[12px] text-gray-500">{reviewReason(selected)}</p>
                  </div>
                  <Badge variant={risk(selected).variant}>Risco {risk(selected).label.toLowerCase()}</Badge>
                </div>
              </Card>

              <ExpenseDetailPanel
                expense={selected}
                token={token}
                actions={(
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1 justify-center"
                        disabled={isMutating}
                        onClick={() => approveMutation.mutate(selected.id)}
                      >
                        Aprovar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 justify-center"
                        disabled={isMutating}
                        onClick={() => {
                          setActionMode('revision')
                          setActionNotes('')
                          setActionError(null)
                        }}
                      >
                        Pedir correção
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 justify-center border-[#F09595] text-[#791F1F]"
                        disabled={isMutating}
                        onClick={() => {
                          setActionMode('reject')
                          setActionNotes('')
                          setActionError(null)
                        }}
                      >
                        Rejeitar
                      </Button>
                    </div>

                    {actionMode && (
                      <div className="rounded-[8px] border border-black/[0.08] bg-white p-3">
                        <label className="block text-[12px] font-medium text-gray-500">
                          {actionMode === 'revision' ? 'Mensagem de correção' : 'Motivo da rejeição'}
                          <textarea
                            value={actionNotes}
                            onChange={(event) => setActionNotes(event.target.value)}
                            rows={4}
                            className="mt-1 w-full resize-none rounded-[8px] border border-black/[0.08] bg-white px-3 py-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#3C3489] focus:ring-2 focus:ring-[#3C3489]/15"
                            placeholder={actionMode === 'revision' ? 'Ex: confira a categoria e envie novamente.' : 'Ex: despesa fora da política de reembolso.'}
                          />
                        </label>
                        {actionError && <p className="mt-2 text-[12px] text-[#791F1F]">{actionError}</p>}
                        <div className="mt-3 flex justify-end gap-2">
                          <Button variant="ghost" size="sm" disabled={isMutating} onClick={() => setActionMode(null)}>Cancelar</Button>
                          <Button size="sm" disabled={isMutating} onClick={submitDecision}>
                            {isMutating ? 'Enviando...' : actionMode === 'revision' ? 'Enviar correção' : 'Confirmar rejeição'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              />
            </>
          ) : (
            <Card className="flex h-32 items-center justify-center">
              <p className="text-[13px] text-gray-400">Selecione uma nota para ver detalhes</p>
            </Card>
          )}
        </div>
      </div>
    </DesktopShell>
  )
}

function QueueSummary({ label, value, tone = 'neutral' }: { label: string; value: React.ReactNode; tone?: 'neutral' | 'red' }) {
  return (
    <Card className={tone === 'red' ? 'border-[#F09595] bg-[#FCEBEB]' : ''}>
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-1 text-[22px] font-semibold ${tone === 'red' ? 'text-[#791F1F]' : 'text-[#1a1a2e]'}`}>{value}</p>
    </Card>
  )
}
