import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getManagerDashboard, getTeamExpenses } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ExpenseDetailPanel } from '../../components/manager/ExpenseDetailPanel'
import { categoryLabels, fmt, fmtDate } from '../../realData'
import { getToken } from '../../session'
import type { DashboardResponse, ExpenseResponse } from '../../types'

export function G01Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([])
  const [selected, setSelected] = useState<ExpenseResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const token = getToken()

  useEffect(() => {
    const token = getToken()
    if (!token) return
    Promise.all([
      getManagerDashboard(token),
      getTeamExpenses(token, undefined, 0, 5),
    ])
      .then(([dashboardData, expensesPage]) => {
        setDashboard(dashboardData)
        setExpenses(expensesPage.content)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar dashboard.'))
  }, [])

  return (
    <DesktopShell title="Dashboard da equipe" role="GERENTE">
      {error && <p className="text-[12px] text-[#791F1F] bg-[#FCEBEB] border border-[#F09595] rounded-[8px] p-3 mb-4">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <MetricCard label="Pendentes" value={dashboard?.pendingCount ?? 0} subtext="aguardando revisao" />
        <MetricCard label="Aprovadas" value={dashboard?.approvedCount ?? 0} subtext={fmt(dashboard?.approvedTotalAmount ?? 0)} />
        <MetricCard label="Autoaprovadas" value={dashboard?.autoApprovedCount ?? 0} subtext={`${dashboard?.automationRate ?? 0}% automacao`} />
        <MetricCard label="Violacoes" value={dashboard?.policyViolationCount ?? 0} subtext="fora da politica" />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[14px] font-medium text-[#1a1a2e]">Notas reais do banco</p>
          <Link to="/gerente/aprovacoes" className="text-[12px] text-[#3C3489]">Ver fila</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[680px]">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {['Funcionario', 'Projeto', 'Nota', 'Categoria', 'Valor', 'Data', 'IA', 'Status'].map((header) => (
                  <th key={header} className="text-left py-2 text-[11px] uppercase tracking-wide text-gray-400 font-medium pr-3">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400">Nenhuma nota encontrada.</td></tr>
              )}
              {expenses.map((expense) => (
                <tr
                  key={expense.id}
                  onClick={() => setSelected(expense)}
                  className="border-b border-black/[0.04] hover:bg-gray-50 cursor-pointer"
                >
                  <td className="py-3 pr-3 font-medium text-[#1a1a2e]">{expense.userName}</td>
                  <td className="py-3 pr-3 max-w-[160px] truncate">{expense.projectName}</td>
                  <td className="py-3 pr-3 max-w-[180px] truncate">{expense.title}</td>
                  <td className="py-3 pr-3">{categoryLabels[expense.category]}</td>
                  <td className="py-3 pr-3 font-medium">{fmt(expense.amount)}</td>
                  <td className="py-3 pr-3">{fmtDate(expense.expenseDate)}</td>
                  <td className="py-3 pr-3">{expense.aiScore ?? '-'}</td>
                  <td className="py-3 pr-3"><StatusBadge status={expense.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && token && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 md:p-8">
          <div className="w-full max-w-4xl">
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => setSelected(null)}
                className="rounded-[8px] bg-white px-3 py-2 text-[12px] font-medium text-[#1a1a2e] shadow"
              >
                Fechar
              </button>
            </div>
            <ExpenseDetailPanel expense={selected} token={token} />
          </div>
        </div>
      )}
    </DesktopShell>
  )
}
