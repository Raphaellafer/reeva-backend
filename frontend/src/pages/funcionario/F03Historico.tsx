import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMyExpenses } from '../../api'
import { AttachmentPreview } from '../../components/attachments/AttachmentPreview'
import { MobileShell } from '../../components/layout/MobileShell'
import { StatusBadge } from '../../components/ui/StatusBadge'
import {
  categoryLabels,
  fmt,
  fmtDate,
  isActionRequired,
  isApproved,
  isPending,
  isRejected,
  nextActionText,
} from '../../realData'
import { getToken } from '../../session'
import type { ExpenseResponse } from '../../types'

type Filter = 'TODOS' | 'ACAO' | 'ANDAMENTO' | 'APROVADO' | 'ENCERRADO'

const filters: { id: Filter; label: string }[] = [
  { id: 'TODOS', label: 'Todas' },
  { id: 'ACAO', label: 'A corrigir' },
  { id: 'ANDAMENTO', label: 'Em andamento' },
  { id: 'APROVADO', label: 'Aprovadas' },
  { id: 'ENCERRADO', label: 'Encerradas' },
]

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
  FINANCE_REJECTED: 'border-l-[#F09595]',
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
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  return `${months[Number(month) - 1]} ${year}`
}

export function F03Historico() {
  const token = getToken()
  const [filter, setFilter] = useState<Filter>('TODOS')
  const [query, setQuery] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-expenses'],
    queryFn: () => getMyExpenses(token!),
    enabled: !!token,
  })

  const expenses = data?.content ?? []

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return expenses.filter((expense) => {
      if (filter === 'ACAO' && !isActionRequired(expense)) return false
      if (filter === 'ANDAMENTO' && (isActionRequired(expense) || !isPending(expense))) return false
      if (filter === 'APROVADO' && !isApproved(expense)) return false
      if (filter === 'ENCERRADO' && !isRejected(expense)) return false
      if (!normalizedQuery) return true
      const content = `${expense.title} ${expense.projectName} ${categoryLabels[expense.category]}`.toLowerCase()
      return content.includes(normalizedQuery)
    })
  }, [expenses, filter, query])

  const groups = groupByMonth(filtered)

  return (
    <MobileShell>
      <div className="border-b border-black/[0.06] bg-white px-4 pb-3 pt-4">
        <p className="text-[15px] font-medium text-[#1a1a2e]">Histórico de notas</p>
        <p className="mt-0.5 text-[11px] text-gray-400">{expenses.length} nota(s) enviadas</p>
      </div>

      <div className="border-b border-black/[0.06] bg-white px-4 py-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar nota, projeto ou categoria"
          className="mb-3 w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#3C3489] focus:ring-2 focus:ring-[#3C3489]/15"
        />
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {filters.map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                filter === item.id
                  ? 'border-[#1a1a2e] bg-[#1a1a2e] text-white'
                  : 'border-gray-200 text-gray-500 hover:border-gray-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5 px-4 py-4">
        {isLoading && <p className="py-8 text-center text-[13px] text-gray-400">Carregando...</p>}
        {error && <p className="rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">{error instanceof Error ? error.message : 'Falha ao carregar notas.'}</p>}
        {!isLoading && groups.length === 0 && (
          <div className="rounded-[10px] border border-dashed border-black/[0.12] bg-white p-5 text-center">
            <p className="text-[13px] font-medium text-[#1a1a2e]">Nenhuma nota encontrada</p>
            <p className="mt-1 text-[12px] text-gray-400">Ajuste os filtros ou envie uma nova nota.</p>
          </div>
        )}

        {groups.map(([monthKey, notes]) => (
          <div key={monthKey}>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-gray-400">{monthLabel(monthKey)}</p>
            <div className="space-y-2">
              {notes.map((expense) => (
                <Link
                  key={expense.id}
                  to={`/funcionario/nota/${expense.id}`}
                  className={`block rounded-[10px] border border-black/[0.07] border-l-4 bg-white ${statusBorder[expense.status] ?? 'border-l-gray-300'} p-3`}
                >
                  <div className="flex items-start gap-3">
                    {expense.attachments[0] && (
                      <div className="shrink-0">
                        <AttachmentPreview attachment={expense.attachments[0]} token={token!} compact />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
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
        ))}
      </div>
    </MobileShell>
  )
}
