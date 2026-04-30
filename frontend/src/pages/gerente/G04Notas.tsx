import React, { useEffect, useMemo, useState } from 'react'
import { getTeamExpenses } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { categoryLabels, fmt, fmtDate, initials } from '../../realData'
import { getToken } from '../../session'
import type { ExpenseCategory, ExpenseResponse, ExpenseStatus } from '../../types'

type FiltroStatus = 'TODOS' | ExpenseStatus
type FiltroCategoria = 'TODOS' | ExpenseCategory

export function G04Notas() {
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('TODOS')
  const [filtroCategoria, setFiltroCategoria] = useState<FiltroCategoria>('TODOS')
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    getTeamExpenses(token, undefined, 0, 100)
      .then((page) => setExpenses(page.content))
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar notas.'))
  }, [])

  const filtered = useMemo(() => expenses.filter((expense) => {
    if (filtroStatus !== 'TODOS' && expense.status !== filtroStatus) return false
    if (filtroCategoria !== 'TODOS' && expense.category !== filtroCategoria) return false
    return true
  }), [expenses, filtroStatus, filtroCategoria])

  return (
    <DesktopShell title="Todas as notas" role="GERENTE">
      <div className="flex flex-wrap gap-2 mb-4">
        {(['TODOS', 'SUBMITTED', 'AI_APPROVED', 'PENDING_REVIEW', 'MANAGER_APPROVED', 'NEEDS_REVISION'] as FiltroStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setFiltroStatus(status)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${filtroStatus === status ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'text-gray-500 border-gray-200 hover:border-gray-400 bg-white'}`}
          >
            {status === 'TODOS' ? 'Todos' : status}
          </button>
        ))}
        <span className="self-center text-[11px] text-gray-300">|</span>
        {(['TODOS', 'FOOD', 'TRANSPORT', 'LODGING', 'PURCHASE'] as FiltroCategoria[]).map((category) => (
          <button
            key={category}
            onClick={() => setFiltroCategoria(category)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${filtroCategoria === category ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'text-gray-500 border-gray-200 hover:border-gray-400 bg-white'}`}
          >
            {category === 'TODOS' ? 'Todas categorias' : categoryLabels[category]}
          </button>
        ))}
      </div>

      {error && <p className="text-[12px] text-[#791F1F] bg-[#FCEBEB] border border-[#F09595] rounded-[8px] p-3 mb-4">{error}</p>}

      <Card>
        <p className="text-[12px] text-gray-500 mb-3">{filtered.length} nota(s) encontrada(s)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[720px]">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {['Funcionario', 'Projeto', 'Nota', 'Categoria', 'Data', 'Valor', 'Score', 'Status'].map((header) => (
                  <th key={header} className="text-left py-2.5 pr-3 text-[11px] uppercase tracking-wide text-gray-400 font-medium">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((expense) => (
                <tr key={expense.id} className="border-b border-black/[0.04] hover:bg-gray-50">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center text-[10px] font-medium">{initials(expense.userName)}</div>
                      <span className="text-[#1a1a2e] font-medium whitespace-nowrap">{expense.userName}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-gray-700 max-w-[150px] truncate">{expense.projectName}</td>
                  <td className="py-3 pr-3 text-gray-700 max-w-[180px] truncate">{expense.title}</td>
                  <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">{categoryLabels[expense.category]}</td>
                  <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">{fmtDate(expense.expenseDate)}</td>
                  <td className="py-3 pr-3 font-medium text-[#1a1a2e] whitespace-nowrap">{fmt(expense.amount)}</td>
                  <td className="py-3 pr-3 text-gray-500">{expense.aiScore ?? '-'}</td>
                  <td className="py-3 pr-3"><StatusBadge status={expense.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </DesktopShell>
  )
}
