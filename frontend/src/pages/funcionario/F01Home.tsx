import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyExpenses } from '../../api'
import { MobileShell } from '../../components/layout/MobileShell'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { getStoredUser } from '../../hooks/useAuth'
import { categoryLabels, fmt, fmtDate, initials, isApproved, isPending, isRejected } from '../../realData'
import { getToken } from '../../session'
import type { ExpenseResponse } from '../../types'

const statusBorder: Record<string, string> = {
  AI_APPROVED: 'border-l-[#97C459]',
  MANAGER_APPROVED: 'border-l-[#97C459]',
  FINANCE_APPROVED: 'border-l-[#97C459]',
  PAID: 'border-l-[#97C459]',
  SUBMITTED: 'border-l-[#AFA9EC]',
  PENDING_REVIEW: 'border-l-[#FAC775]',
  DRAFT: 'border-l-gray-300',
  NEEDS_REVISION: 'border-l-[#F09595]',
  MANAGER_REJECTED: 'border-l-[#F09595]',
}

export function F01Home() {
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const user = getStoredUser()
  const userName = user?.name ?? 'Usuario'

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    getMyExpenses(token)
      .then((page) => setExpenses(page.content))
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar notas.'))
      .finally(() => setLoading(false))
  }, [])

  const recentes = expenses.slice(0, 4)
  const totalMes = expenses.filter(isApproved).reduce((sum, expense) => sum + (expense.amount ?? 0), 0)
  const aprovadas = expenses.filter(isApproved).length
  const pendentes = expenses.filter(isPending).length
  const rejeitadas = expenses.filter(isRejected).length

  return (
    <MobileShell>
      <div className="bg-white px-4 pt-4 pb-3 flex items-center justify-between border-b border-black/[0.06]">
        <div>
          <p className="text-[11px] text-gray-400">Bom dia,</p>
          <p className="text-[15px] font-medium text-[#1a1a2e]">{userName.split(' ')[0]}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center text-[12px] font-medium">
          {initials(userName)}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="rounded-[10px] bg-[#1a1a2e] p-4 text-white">
          <p className="text-[11px] text-white/50 uppercase tracking-wide mb-1">Total aprovado</p>
          <p className="text-[32px] font-medium leading-none mb-4">{fmt(totalMes)}</p>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/5 rounded-[7px] p-2.5 text-center">
              <p className="text-[20px] font-medium text-[#97C459]">{aprovadas}</p>
              <p className="text-[10px] text-white/50">Aprovadas</p>
            </div>
            <div className="bg-white/5 rounded-[7px] p-2.5 text-center">
              <p className="text-[20px] font-medium text-[#FAC775]">{pendentes}</p>
              <p className="text-[10px] text-white/50">Pendentes</p>
            </div>
            <div className="bg-white/5 rounded-[7px] p-2.5 text-center">
              <p className="text-[20px] font-medium text-[#F09595]">{rejeitadas}</p>
              <p className="text-[10px] text-white/50">Rejeitadas</p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-medium text-[#1a1a2e]">Notas recentes</p>
            <Link to="/funcionario/historico" className="text-[11px] text-[#3C3489]">Ver tudo</Link>
          </div>

          {loading && <p className="text-[13px] text-gray-400 text-center py-8">Carregando...</p>}
          {error && <p className="text-[12px] text-[#791F1F] bg-[#FCEBEB] border border-[#F09595] rounded-[8px] p-3">{error}</p>}

          <div className="space-y-2">
            {!loading && recentes.length === 0 && (
              <p className="text-center text-[13px] text-gray-400 py-8">Nenhuma nota enviada ainda.</p>
            )}
            {recentes.map((expense) => (
              <Link
                key={expense.id}
                to={`/funcionario/nota/${expense.id}`}
                className={`block bg-white rounded-[10px] border border-black/[0.07] border-l-4 ${statusBorder[expense.status] ?? 'border-l-gray-300'} p-3`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[#1a1a2e] truncate">{expense.title}</p>
                    <p className="text-[11px] text-gray-400">{expense.projectName} - {categoryLabels[expense.category]} - {fmtDate(expense.expenseDate)}</p>
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
