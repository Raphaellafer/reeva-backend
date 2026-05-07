import React, { useEffect, useMemo, useState } from 'react'
import { getApprovedPayments } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { fmt, fmtDate } from '../../realData'
import { getToken } from '../../session'
import type { PaymentBatchResponse } from '../../types'

function monthStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function csvEscape(value: string | number | null | undefined) {
  const text = value == null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function downloadCsv(batch: PaymentBatchResponse, from: string, to: string) {
  const rows = [
    [
      'Periodo de',
      'Periodo ate',
      'Funcionario',
      'Email',
      'Pix',
      'Projeto',
      'Nota',
      'Data da despesa',
      'Origem da aprovacao',
      'Valor da despesa',
      'Total do funcionario',
      'Total geral do lote',
    ],
  ]

  batch.employees.forEach((employee) => {
    employee.expenses.forEach((expense) => {
      rows.push([
        from || 'inicio',
        to || 'hoje',
        employee.name,
        employee.email,
        employee.pixKey || '',
        expense.projectName || 'Sem projeto',
        expense.title,
        expense.expenseDate,
        expense.autoApproved ? 'IA' : 'Gestor',
        Number(expense.amount || 0).toFixed(2),
        Number(employee.totalAmount || 0).toFixed(2),
        Number(batch.totalAmount || 0).toFixed(2),
      ])
    })
  })

  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `reeva-pagamentos-${from || 'inicio'}-${to || 'hoje'}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function G08Pagamentos() {
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(today())
  const [batch, setBatch] = useState<PaymentBatchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const token = getToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      setBatch(await getApprovedPayments(token, from, to))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar aprovados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const expenses = useMemo(
    () => batch?.employees.flatMap((employee) => employee.expenses.map((expense) => ({ employee, expense }))) ?? [],
    [batch]
  )

  return (
    <DesktopShell
      title="Aprovados para financeiro"
      role="GERENTE"
      actions={(
        <Button variant="primary" size="sm" disabled={!batch || batch.expenseCount === 0} onClick={() => batch && downloadCsv(batch, from, to)}>
          Baixar planilha
        </Button>
      )}
    >
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[12px] text-gray-500">
            De
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="block mt-1 rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]" />
          </label>
          <label className="text-[12px] text-gray-500">
            Ate
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="block mt-1 rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]" />
          </label>
          <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? 'Carregando...' : 'Filtrar'}
          </Button>
        </div>
      </Card>

      {error && <p className="text-[12px] text-[#791F1F] bg-[#FCEBEB] border border-[#F09595] rounded-[8px] p-3 mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Card><p className="text-[11px] text-gray-400 uppercase">Total aprovado</p><p className="text-[22px] font-semibold text-[#1a1a2e]">{fmt(batch?.totalAmount ?? 0)}</p></Card>
        <Card><p className="text-[11px] text-gray-400 uppercase">Funcionarios</p><p className="text-[22px] font-semibold text-[#1a1a2e]">{batch?.employeeCount ?? 0}</p></Card>
        <Card><p className="text-[11px] text-gray-400 uppercase">Notas</p><p className="text-[22px] font-semibold text-[#1a1a2e]">{batch?.expenseCount ?? 0}</p></Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[940px]">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {['Funcionario', 'Email', 'Pix', 'Projeto', 'Nota', 'Data', 'Origem', 'Valor'].map((header) => (
                  <th key={header} className="text-left py-2.5 pr-3 text-[11px] uppercase tracking-wide text-gray-400 font-medium">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && expenses.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400">Nenhum reembolso aprovado no periodo.</td></tr>
              )}
              {expenses.map(({ employee, expense }) => (
                <tr key={expense.id} className="border-b border-black/[0.04]">
                  <td className="py-3 pr-3 font-medium text-[#1a1a2e] whitespace-nowrap">{employee.name}</td>
                  <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">{employee.email}</td>
                  <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">{employee.pixKey || <span className="text-[#791F1F]">Sem Pix</span>}</td>
                  <td className="py-3 pr-3 text-gray-700 max-w-[150px] truncate">{expense.projectName || '-'}</td>
                  <td className="py-3 pr-3 text-gray-700 max-w-[190px] truncate">{expense.title}</td>
                  <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">{fmtDate(expense.expenseDate)}</td>
                  <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">{expense.autoApproved ? 'IA' : 'Gestor'}</td>
                  <td className="py-3 pr-3 font-medium text-[#1a1a2e] whitespace-nowrap">{fmt(expense.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </DesktopShell>
  )
}
