import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getManagerDashboard, getTeamExpenses } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { ExpenseDetailPanel } from '../../components/manager/ExpenseDetailPanel'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { categoryLabels, fmt, fmtDate, isActionRequired, reviewStatuses } from '../../realData'
import { getToken } from '../../session'
import type { ExpenseResponse } from '../../types'

export function G01Dashboard() {
  const token = getToken()
  const [selected, setSelected] = useState<ExpenseResponse | null>(null)

  const { data: dashboard, error: dashboardError } = useQuery({
    queryKey: ['manager-dashboard'],
    queryFn: () => getManagerDashboard(token!),
    enabled: !!token,
  })

  const { data: expensesPage, error: expensesError } = useQuery({
    queryKey: ['team-expenses', 'recent'],
    queryFn: () => getTeamExpenses(token!, undefined, 0, 8),
    enabled: !!token,
  })

  const expenses = expensesPage?.content ?? []
  const error = dashboardError ?? expensesError

  const queue = useMemo(
    () => expenses.filter((expense) => reviewStatuses.includes(expense.status)),
    [expenses]
  )
  const correctionCount = useMemo(
    () => expenses.filter(isActionRequired).length,
    [expenses]
  )

  return (
    <DesktopShell title="Dashboard da equipe" role="GERENTE">
      {error && <p className="mb-4 rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">{error instanceof Error ? error.message : 'Falha ao carregar dashboard.'}</p>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Pendentes" value={dashboard?.pendingCount ?? 0} subtext="na fila do gestor" />
        <MetricCard label="Aprovadas" value={dashboard?.approvedCount ?? 0} subtext={fmt(dashboard?.approvedTotalAmount ?? 0)} />
        <MetricCard label="Autoaprovadas" value={dashboard?.autoApprovedCount ?? 0} subtext={`${dashboard?.automationRate ?? 0}% automação`} />
        <MetricCard label="Fora da política" value={dashboard?.policyViolationCount ?? 0} subtext="pedem atenção" />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[14px] font-medium text-[#1a1a2e]">Ações pendentes hoje</p>
              <p className="mt-0.5 text-[12px] text-gray-400">Notas que precisam de decisão ou acompanhamento.</p>
            </div>
            <Link to="/gerente/aprovacoes" className="text-[12px] font-medium text-[#3C3489]">Abrir fila</Link>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <FocusMetric label="Na fila" value={queue.length} tone={queue.length > 0 ? 'amber' : 'neutral'} />
            <FocusMetric label="Correções" value={correctionCount} tone={correctionCount > 0 ? 'red' : 'neutral'} />
            <FocusMetric label="Revisão manual" value={dashboard?.manualReviewCount ?? 0} tone={(dashboard?.manualReviewCount ?? 0) > 0 ? 'purple' : 'neutral'} />
          </div>
        </Card>

        <Card>
          <p className="text-[14px] font-medium text-[#1a1a2e]">Eficiência da IA</p>
          <p className="mt-3 text-[28px] font-semibold text-[#1a1a2e]">{dashboard?.automationRate ?? 0}%</p>
          <p className="text-[12px] text-gray-400">das notas elegíveis seguiram sem trabalho manual</p>
          <div className="mt-3 rounded-[8px] border border-[#97C459] bg-[#EAF3DE] p-3 text-[12px] text-[#27500A]">
            Economia estimada: <strong>{fmt(dashboard?.estimatedSavingsAmount ?? 0)}</strong>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-medium text-[#1a1a2e]">Atividade recente</p>
            <p className="mt-0.5 text-[12px] text-gray-400">Últimas notas enviadas pela equipe.</p>
          </div>
          <Link to="/gerente/notas" className="text-[12px] font-medium text-[#3C3489]">Ver todas</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {['Funcionário', 'Projeto', 'Nota', 'Categoria', 'Valor', 'Data', 'IA', 'Status'].map((header) => (
                  <th key={header} className="py-2 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">{header}</th>
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
                  className="cursor-pointer border-b border-black/[0.04] hover:bg-gray-50"
                >
                  <td className="py-3 pr-3 font-medium text-[#1a1a2e]">{expense.userName}</td>
                  <td className="max-w-[160px] truncate py-3 pr-3">{expense.projectName}</td>
                  <td className="max-w-[200px] truncate py-3 pr-3">{expense.title}</td>
                  <td className="py-3 pr-3">{categoryLabels[expense.category]}</td>
                  <td className="py-3 pr-3 font-medium">{fmt(expense.amount)}</td>
                  <td className="py-3 pr-3">{fmtDate(expense.expenseDate)}</td>
                  <td className="py-3 pr-3">
                    {expense.aiScore == null ? '-' : <Badge variant={scoreVariant(expense.aiScore)}>{expense.aiScore}</Badge>}
                  </td>
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

function FocusMetric({ label, value, tone }: { label: string; value: number; tone: 'amber' | 'red' | 'purple' | 'neutral' }) {
  const toneClass = {
    amber: 'border-[#FAC775] bg-[#FAEEDA] text-[#633806]',
    red: 'border-[#F09595] bg-[#FCEBEB] text-[#791F1F]',
    purple: 'border-[#AFA9EC] bg-[#EEEDFE] text-[#3C3489]',
    neutral: 'border-black/[0.07] bg-white text-[#1a1a2e]',
  }[tone]

  return (
    <div className={`rounded-[8px] border p-3 ${toneClass}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-[22px] font-semibold">{value}</p>
    </div>
  )
}

function scoreVariant(score: number): 'green' | 'amber' | 'red' {
  if (score >= 90) return 'green'
  if (score >= 70) return 'amber'
  return 'red'
}
