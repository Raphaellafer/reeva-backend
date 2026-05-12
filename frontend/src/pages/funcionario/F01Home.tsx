import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMyExpenses } from '../../api'
import { MobileShell } from '../../components/layout/MobileShell'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { getStoredUser } from '../../hooks/useAuth'
import {
  categoryLabels,
  fmt,
  fmtDate,
  initials,
  isActionRequired,
  isApproved,
  isPending,
  nextActionText,
} from '../../realData'
import { getToken } from '../../session'

const statusBorder: Record<string, string> = {
  AI_APPROVED: 'border-l-[#97C459]',
  MANAGER_APPROVED: 'border-l-[#97C459]',
  FINANCE_APPROVED: 'border-l-[#97C459]',
  PAID: 'border-l-[#97C459]',
  SUBMITTED: 'border-l-[#AFA9EC]',
  PENDING_REVIEW: 'border-l-[#FAC775]',
  DRAFT: 'border-l-gray-300',
  OCR_FAILED: 'border-l-[#F09595]',
  NEEDS_REVISION: 'border-l-[#F09595]',
  MANAGER_REJECTED: 'border-l-[#F09595]',
}

export function F01Home() {
  const token = getToken()
  const user = getStoredUser()
  const userName = user?.name ?? 'Usuário'

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-expenses'],
    queryFn: () => getMyExpenses(token!),
    enabled: !!token,
  })

  const expenses = data?.content ?? []
  const actionRequired = useMemo(() => expenses.filter(isActionRequired), [expenses])
  const pending = useMemo(() => expenses.filter(isPending), [expenses])
  const approved = useMemo(() => expenses.filter(isApproved), [expenses])
  const totalApproved = approved.reduce((sum, expense) => sum + (expense.amount ?? 0), 0)
  const recent = expenses.slice(0, 4)
  const focusExpense = actionRequired[0] ?? pending[0] ?? recent[0]

  return (
    <MobileShell>
      <div className="flex items-center justify-between border-b border-black/[0.06] bg-white px-4 pb-3 pt-4">
        <div>
          <p className="text-[11px] text-gray-400">Olá,</p>
          <p className="text-[15px] font-medium text-[#1a1a2e]">{userName.split(' ')[0]}</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a2e] text-[12px] font-medium text-white">
          {initials(userName)}
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="rounded-[10px] bg-[#1a1a2e] p-4 text-white">
          <div className="mb-4">
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wide text-white/50">Próxima ação</p>
              <p className="text-[20px] font-semibold leading-tight">
                {actionRequired.length > 0
                  ? `${actionRequired.length} nota(s) para corrigir`
                  : pending.length > 0
                    ? `${pending.length} nota(s) em andamento`
                    : 'Tudo em dia'}
              </p>
            </div>
          </div>

          {focusExpense ? (
            <Link
              to={`/funcionario/nota/${focusExpense.id}`}
              className="block rounded-[8px] border border-white/10 bg-white/5 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{focusExpense.title}</p>
                  <p className="mt-1 text-[11px] text-white/55">{nextActionText(focusExpense)}</p>
                </div>
                <span className="shrink-0 text-[13px] font-medium">{fmt(focusExpense.amount)}</span>
              </div>
            </Link>
          ) : (
            <Link
              to="/funcionario/enviar"
              className="block rounded-[8px] border border-white/10 bg-white/5 p-3 text-[12px] text-white/70"
            >
              Envie sua primeira nota para começar o acompanhamento.
            </Link>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <SummaryCard label="Aprovado" value={fmt(totalApproved)} />
          <SummaryCard label="Pendentes" value={pending.length} />
          <SummaryCard label="A corrigir" value={actionRequired.length} tone={actionRequired.length > 0 ? 'warning' : 'normal'} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-medium text-[#1a1a2e]">Notas recentes</p>
            <Link to="/funcionario/historico" className="text-[11px] font-medium text-[#3C3489]">Ver histórico</Link>
          </div>

          {isLoading && <p className="py-8 text-center text-[13px] text-gray-400">Carregando...</p>}
          {error && <p className="rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">{error instanceof Error ? error.message : 'Falha ao carregar notas.'}</p>}

          <div className="space-y-2">
            {!isLoading && recent.length === 0 && (
              <div className="rounded-[10px] border border-dashed border-black/[0.12] bg-white p-5 text-center">
                <p className="text-[13px] font-medium text-[#1a1a2e]">Nenhuma nota enviada ainda</p>
                <p className="mt-1 text-[12px] text-gray-400">Quando você enviar uma nota, o status aparecerá aqui.</p>
              </div>
            )}
            {recent.map((expense) => (
              <Link
                key={expense.id}
                to={`/funcionario/nota/${expense.id}`}
                className={`block rounded-[10px] border border-black/[0.07] border-l-4 bg-white ${statusBorder[expense.status] ?? 'border-l-gray-300'} p-3`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[#1a1a2e]">{expense.title}</p>
                    <p className="text-[11px] text-gray-400">
                      {expense.projectName} · {categoryLabels[expense.category]} · {fmtDate(expense.expenseDate)}
                    </p>
                    {(isActionRequired(expense) || expense.status === 'PENDING_REVIEW') && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-gray-500">{nextActionText(expense)}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-medium text-[#1a1a2e]">{fmt(expense.amount)}</p>
                    <StatusBadge status={expense.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </MobileShell>
  )
}

function SummaryCard({ label, value, tone = 'normal' }: { label: string; value: React.ReactNode; tone?: 'normal' | 'warning' }) {
  return (
    <div className={`rounded-[9px] border bg-white p-3 ${tone === 'warning' ? 'border-[#FAC775]' : 'border-black/[0.07]'}`}>
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-1 truncate text-[15px] font-semibold ${tone === 'warning' ? 'text-[#633806]' : 'text-[#1a1a2e]'}`}>
        {value}
      </p>
    </div>
  )
}



