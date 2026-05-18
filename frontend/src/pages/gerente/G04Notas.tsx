import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTeamExpenses } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { categoryLabels, fmt, fmtDate, initials, reviewStatuses, statusLabel } from '../../realData'
import { getToken } from '../../session'
import type { ExpenseCategory, ExpenseStatus } from '../../types'

type StatusFilter = 'TODOS' | 'FILA' | 'APROVADAS' | 'REJEITADAS' | ExpenseStatus
type CategoryFilter = 'TODOS' | ExpenseCategory

const statusFilters: { id: StatusFilter; label: string }[] = [
  { id: 'TODOS', label: 'Todas' },
  { id: 'FILA', label: 'Na fila' },
  { id: 'APROVADAS', label: 'Aprovadas' },
  { id: 'REJEITADAS', label: 'Rejeitadas' },
  { id: 'NEEDS_REVISION', label: 'Com correção' },
  { id: 'OCR_FAILED', label: 'Leitura falhou' },
]

const defaultCategoryFilters = ['TODOS', 'FOOD', 'TRANSPORT', 'LODGING', 'PURCHASE', 'HARDWARE'] as CategoryFilter[]

export function G04Notas() {
  const token = getToken()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('TODOS')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('TODOS')
  const [query, setQuery] = useState('')

  const { data: page, error } = useQuery({
    queryKey: ['team-expenses', 'all'],
    queryFn: () => getTeamExpenses(token!, undefined, 0, 100),
    enabled: !!token,
  })

  const expenses = page?.content ?? []
  const categoryFilters = useMemo(() => {
    const items = new Set<CategoryFilter>(defaultCategoryFilters)
    expenses.forEach((expense) => items.add(expense.category))
    return Array.from(items)
  }, [expenses])

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return expenses.filter((expense) => {
      if (statusFilter === 'FILA' && !reviewStatuses.includes(expense.status)) return false
      if (statusFilter === 'APROVADAS' && !['AI_APPROVED', 'MANAGER_APPROVED', 'FINANCE_APPROVED', 'PAID'].includes(expense.status)) return false
      if (statusFilter === 'REJEITADAS' && !['MANAGER_REJECTED', 'FINANCE_REJECTED', 'CANCELLED'].includes(expense.status)) return false
      if (!['TODOS', 'FILA', 'APROVADAS', 'REJEITADAS'].includes(statusFilter) && expense.status !== statusFilter) return false
      if (categoryFilter !== 'TODOS' && expense.category !== categoryFilter) return false
      if (!normalizedQuery) return true
      const content = `${expense.userName} ${expense.projectName} ${expense.title} ${categoryLabels[expense.category] ?? expense.category} ${statusLabel(expense.status)}`.toLowerCase()
      return content.includes(normalizedQuery)
    })
  }, [expenses, statusFilter, categoryFilter, query])

  return (
    <DesktopShell title="Todas as notas" role="GERENTE">
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {statusFilters.map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id)}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${statusFilter === item.id ? 'border-[#1a1a2e] bg-[#1a1a2e] text-white' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por funcionário, projeto ou nota"
            className="min-w-[280px] flex-1 rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#3C3489] focus:ring-2 focus:ring-[#3C3489]/15"
          />
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
            className="rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#3C3489] focus:ring-2 focus:ring-[#3C3489]/15"
          >
            {categoryFilters.map((category) => (
              <option key={category} value={category}>
                {category === 'TODOS' ? 'Todas as categorias' : categoryLabels[category] ?? category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="mb-4 rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">{error instanceof Error ? error.message : 'Falha ao carregar notas.'}</p>}

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] text-gray-500">{filtered.length} nota(s) encontrada(s)</p>
          {statusFilter !== 'TODOS' && <Badge variant="gray">Filtro: {statusFilters.find((item) => item.id === statusFilter)?.label ?? statusLabel(statusFilter)}</Badge>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-[13px]">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {['Funcionário', 'Projeto', 'Nota', 'Categoria', 'Data', 'Valor', 'Leitura', 'Conform.', 'Status'].map((header) => (
                  <th key={header} className="py-2.5 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-gray-400">Nenhuma nota encontrada com esses filtros.</td></tr>
              )}
              {filtered.map((expense) => (
                <tr key={expense.id} className="border-b border-black/[0.04] hover:bg-gray-50">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1a1a2e] text-[10px] font-medium text-white">{initials(expense.userName)}</div>
                      <span className="whitespace-nowrap font-medium text-[#1a1a2e]">{expense.userName}</span>
                    </div>
                  </td>
                  <td className="max-w-[150px] truncate py-3 pr-3 text-gray-700">{expense.projectName}</td>
                  <td className="max-w-[200px] truncate py-3 pr-3 text-gray-700">{expense.title}</td>
                  <td className="whitespace-nowrap py-3 pr-3 text-gray-500">{categoryLabels[expense.category] ?? expense.category}</td>
                  <td className="whitespace-nowrap py-3 pr-3 text-gray-500">{fmtDate(expense.expenseDate)}</td>
                  <td className="whitespace-nowrap py-3 pr-3 font-medium text-[#1a1a2e]">{fmt(expense.amount)}</td>
                  <td className="py-3 pr-3 text-gray-500">{expense.aiScore ?? '-'}</td>
                  <td className="py-3 pr-3 text-gray-500">{expense.complianceScore ?? '-'}</td>
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
