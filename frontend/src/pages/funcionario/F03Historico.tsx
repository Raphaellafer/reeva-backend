import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyExpenses } from '../../api'
import { MobileShell } from '../../components/layout/MobileShell'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { categoryLabels, fmt, fmtDate, isApproved, isPending, isRejected } from '../../realData'
import { getToken } from '../../session'
import type { ExpenseResponse } from '../../types'

type Filtro = 'TODOS' | 'PENDENTE' | 'APROVADO' | 'REJEITADO'

const filtros: { id: Filtro; label: string }[] = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'PENDENTE', label: 'Pendentes' },
  { id: 'APROVADO', label: 'Aprovados' },
  { id: 'REJEITADO', label: 'Rejeitados' },
]

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

function groupByMonth(expenses: ExpenseResponse[]) {
  const map: Record<string, ExpenseResponse[]> = {}
  expenses.forEach((expense) => {
    const key = expense.expenseDate.slice(0, 7)
    if (!map[key]) map[key] = []
    map[key].push(expense)
  })
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
}

function monthLabel(key: string) {
  const [year, month] = key.split('-')
  const months = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  return `${months[parseInt(month) - 1]} ${year}`
}

export function F03Historico() {
  const [filtro, setFiltro] = useState<Filtro>('TODOS')
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    getMyExpenses(token)
      .then((page) => setExpenses(page.content))
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar notas.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (filtro === 'TODOS') return expenses
    if (filtro === 'PENDENTE') return expenses.filter(isPending)
    if (filtro === 'APROVADO') return expenses.filter(isApproved)
    return expenses.filter(isRejected)
  }, [expenses, filtro])

  const grupos = groupByMonth(filtered)

  return (
    <MobileShell>
      <div className="bg-white px-4 pt-4 pb-3 border-b border-black/[0.06]">
        <p className="text-[15px] font-medium text-[#1a1a2e]">Historico de notas</p>
      </div>

      <div className="bg-white px-4 py-2.5 flex gap-2 overflow-x-auto border-b border-black/[0.06]">
        {filtros.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
              filtro === f.id
                ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]'
                : 'text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-5">
        {loading && <p className="text-center text-[13px] text-gray-400 py-8">Carregando...</p>}
        {error && <p className="text-[12px] text-[#791F1F] bg-[#FCEBEB] border border-[#F09595] rounded-[8px] p-3">{error}</p>}
        {!loading && grupos.length === 0 && (
          <p className="text-center text-[13px] text-gray-400 py-8">Nenhuma nota encontrada.</p>
        )}

        {grupos.map(([monthKey, notas]) => (
          <div key={monthKey}>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2">{monthLabel(monthKey)}</p>
            <div className="space-y-2">
              {notas.map((expense) => (
                <Link
                  key={expense.id}
                  to={`/funcionario/nota/${expense.id}`}
                  className={`block bg-white rounded-[10px] border border-black/[0.07] border-l-4 ${statusBorder[expense.status] ?? 'border-l-gray-300'} p-3`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[#1a1a2e] truncate">{expense.title}</p>
                      <p className="text-[11px] text-gray-400">{expense.projectName} - {categoryLabels[expense.category]} - {fmtDate(expense.expenseDate)}</p>
                      {expense.aiAnalysis && <p className="text-[10px] text-[#633806] mt-1">{expense.aiAnalysis}</p>}
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
        ))}
      </div>
    </MobileShell>
  )
}
