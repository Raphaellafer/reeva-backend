import React, { useEffect, useState } from 'react'
import { getCfoExpenses } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { fmt } from '../../data/mock'
import { getToken } from '../../session'
import type { CfoExpenseResponse, ExpenseCategory, ExpenseStatus, PageResponse } from '../../types'

const categoryOptions: Array<{ value: '' | ExpenseCategory; label: string }> = [
  { value: '', label: 'Todas categorias' },
  { value: 'FOOD', label: 'Alimentacao' },
  { value: 'TRANSPORT', label: 'Transporte' },
  { value: 'LODGING', label: 'Hospedagem' },
  { value: 'PURCHASE', label: 'Compras' },
  { value: 'HARDWARE', label: 'Hardware' },
]

const statusOptions: Array<{ value: '' | ExpenseStatus; label: string }> = [
  { value: '', label: 'Todos status' },
  { value: 'SUBMITTED', label: 'Enviadas' },
  { value: 'PENDING_REVIEW', label: 'Em revisao' },
  { value: 'MANAGER_APPROVED', label: 'Aprovadas' },
  { value: 'MANAGER_REJECTED', label: 'Rejeitadas' },
  { value: 'OCR_FAILED', label: 'Erro OCR' },
]

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

export function C04Notas() {
  const [category, setCategory] = useState<'' | ExpenseCategory>('')
  const [status, setStatus] = useState<'' | ExpenseStatus>('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState<PageResponse<CfoExpenseResponse> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return

    setLoading(true)
    getCfoExpenses(token, { category, status, page, size: 20 })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar notas.'))
      .finally(() => setLoading(false))
  }, [category, status, page])

  function updateCategory(value: '' | ExpenseCategory) {
    setPage(0)
    setCategory(value)
  }

  function updateStatus(value: '' | ExpenseStatus) {
    setPage(0)
    setStatus(value)
  }

  return (
    <DesktopShell title="Todas as notas da empresa" role="CFO">
      {error && (
        <Card className="mb-4">
          <p className="text-[13px] text-[#791F1F]">{error}</p>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={category}
          onChange={(event) => updateCategory(event.target.value as '' | ExpenseCategory)}
          className="h-9 rounded-[7px] border border-black/10 bg-white px-3 text-[12px] text-gray-700"
        >
          {categoryOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => updateStatus(event.target.value as '' | ExpenseStatus)}
          className="h-9 rounded-[7px] border border-black/10 bg-white px-3 text-[12px] text-gray-700"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <Card>
        <p className="text-[12px] text-gray-500 mb-3">
          {loading ? 'Carregando notas...' : `${data?.totalElements ?? 0} nota(s) reais salvas no sistema`}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[900px]">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {['Funcionario', 'Depto', 'Gestor', 'Projeto', 'Estabelecimento', 'Categoria', 'Data', 'Valor', 'IA', 'Status', 'Risco'].map((header) => (
                  <th key={header} className="text-left py-2.5 pr-3 text-[11px] uppercase tracking-wide text-gray-400 font-medium">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.content ?? []).map((expense) => (
                <tr key={expense.id} className="border-b border-black/[0.04] hover:bg-gray-50">
                  <td className="py-3 pr-3 font-medium text-[#1a1a2e] whitespace-nowrap">{expense.employeeName}</td>
                  <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">{expense.departmentName ?? '-'}</td>
                  <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">{expense.managerName ?? '-'}</td>
                  <td className="py-3 pr-3 text-gray-700 max-w-[140px] truncate">{expense.projectName}</td>
                  <td className="py-3 pr-3 text-gray-700 max-w-[160px] truncate">{expense.supplierName ?? expense.title}</td>
                  <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">{categoryOptions.find((option) => option.value === expense.category)?.label ?? expense.category}</td>
                  <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">{formatDate(expense.expenseDate)}</td>
                  <td className="py-3 pr-3 font-medium whitespace-nowrap">{fmt(expense.amount ?? 0)}</td>
                  <td className="py-3 pr-3 text-gray-600">{expense.aiScore ?? '-'}</td>
                  <td className="py-3 pr-3"><StatusBadge status={expense.status} /></td>
                  <td className="py-3">
                    {expense.duplicate ? (
                      <Badge variant="red">Duplicada</Badge>
                    ) : expense.policyCompliant === false ? (
                      <Badge variant="amber">Politica</Badge>
                    ) : (
                      <Badge variant="green">Ok</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && (data?.content.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={11} className="py-5 text-[13px] text-gray-400">Nenhuma nota encontrada com os filtros atuais.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 pt-4">
          <p className="text-[12px] text-gray-400">Pagina {(data?.number ?? 0) + 1} de {Math.max(data?.totalPages ?? 1, 1)}</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" disabled={data?.first ?? true} onClick={() => setPage((current) => Math.max(0, current - 1))}>
              Anterior
            </Button>
            <Button variant="ghost" size="sm" disabled={data?.last ?? true} onClick={() => setPage((current) => current + 1)}>
              Proxima
            </Button>
          </div>
        </div>
      </Card>
    </DesktopShell>
  )
}
