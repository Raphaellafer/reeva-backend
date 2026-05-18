import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCfoExpenses } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { fmt } from '../../data/mock'
import { getToken } from '../../session'
import type { CfoExpenseResponse, ExpenseCategory, ExpenseStatus, PageResponse } from '../../types'
import { categoryLabels, statusLabels } from './cfoUtils'

type InvestigationSignal = '' | 'duplicate' | 'fiscal' | 'policy' | 'lowOcr'

const categoryOptions: Array<{ value: '' | ExpenseCategory; label: string }> = [
  { value: '', label: 'Todas categorias' },
  { value: 'FOOD', label: categoryLabels.FOOD },
  { value: 'TRANSPORT', label: categoryLabels.TRANSPORT },
  { value: 'LODGING', label: categoryLabels.LODGING },
  { value: 'PURCHASE', label: categoryLabels.PURCHASE },
  { value: 'HARDWARE', label: categoryLabels.HARDWARE },
]

const statusOptions: Array<{ value: '' | ExpenseStatus; label: string }> = [
  { value: '', label: 'Todos status' },
  { value: 'SUBMITTED', label: statusLabels.SUBMITTED },
  { value: 'PENDING_REVIEW', label: statusLabels.PENDING_REVIEW },
  { value: 'MANAGER_APPROVED', label: statusLabels.MANAGER_APPROVED },
  { value: 'MANAGER_REJECTED', label: statusLabels.MANAGER_REJECTED },
  { value: 'FINANCE_APPROVED', label: statusLabels.FINANCE_APPROVED },
  { value: 'FINANCE_REJECTED', label: statusLabels.FINANCE_REJECTED },
  { value: 'PAID', label: statusLabels.PAID },
  { value: 'OCR_FAILED', label: statusLabels.OCR_FAILED },
]

const signalOptions: Array<{ value: InvestigationSignal; label: string }> = [
  { value: '', label: 'Todos sinais' },
  { value: 'duplicate', label: 'Duplicadas' },
  { value: 'fiscal', label: 'Fiscal invalida' },
  { value: 'policy', label: 'Politica violada' },
  { value: 'lowOcr', label: 'OCR baixo' },
]

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

function signalFilters(signal: InvestigationSignal) {
  return { duplicate: signal === 'duplicate', fiscalInvalid: signal === 'fiscal', policyViolation: signal === 'policy', lowOcr: signal === 'lowOcr' }
}

function isLowOcr(expense: CfoExpenseResponse) {
  return expense.status === 'OCR_FAILED' || (expense.aiScore != null && expense.aiScore < 85)
}

function riskBadge(expense: CfoExpenseResponse) {
  if (expense.duplicate) return <Badge variant="red">Duplicada</Badge>
  if (expense.aiDecision === 'REJECTED_BY_FISCAL_VALIDATION' || expense.sefazStatus === 'INVALID') return <Badge variant="red">Fiscal</Badge>
  if (expense.policyCompliant === false || expense.aiDecision === 'REJECTED_BY_POLICY') return <Badge variant="amber">Politica</Badge>
  if (isLowOcr(expense)) return <Badge variant="blue">OCR baixo</Badge>
  return <Badge variant="green">Ok</Badge>
}

function riskReason(expense: CfoExpenseResponse) {
  if (expense.duplicate) return expense.duplicateOfExpenseId ? `Duplicada de ${expense.duplicateOfExpenseId.slice(0, 8)}` : 'Possivel duplicidade'
  if (expense.aiDecision === 'REJECTED_BY_FISCAL_VALIDATION' || expense.sefazStatus === 'INVALID') return 'Validacao fiscal invalida'
  if (expense.policyCompliant === false || expense.aiDecision === 'REJECTED_BY_POLICY') return expense.policyViolationReason ?? 'Fora da politica'
  if (isLowOcr(expense)) return `Leitura OCR ${expense.aiScore ?? 'N/A'}`
  return expense.manualReviewReason ?? '-'
}

export function C04Notas() {
  const token = getToken()
  const [category, setCategory] = useState<'' | ExpenseCategory>('')
  const [status, setStatus] = useState<'' | ExpenseStatus>('')
  const [signal, setSignal] = useState<InvestigationSignal>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)

  const { data, isLoading, error } = useQuery({
    queryKey: ['cfo-expenses', category, status, signal, from, to, page],
    queryFn: () => getCfoExpenses(token!, { category, status, page, size: 20, from: from || undefined, to: to || undefined, ...signalFilters(signal) }),
    enabled: !!token,
  })

  const activeFilterCount = useMemo(() => [category, status, signal, from, to].filter(Boolean).length, [category, status, signal, from, to])
  const pageTotal = useMemo(() => (data?.content ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0), [data])
  const pageAvg = useMemo(() => { const items = data?.content ?? []; return items.length === 0 ? 0 : pageTotal / items.length }, [data, pageTotal])

  function resetPageAnd(run: () => void) { setPage(0); run() }

  function clearFilters() { setCategory(''); setStatus(''); setSignal(''); setFrom(''); setTo(''); setPage(0) }

  function exportCSV() {
    const headers = ['Funcionario', 'Depto', 'Gestor', 'Projeto', 'Estabelecimento', 'Categoria', 'Data', 'Valor', 'Leitura OCR', 'Conformidade', 'Status', 'Risco', 'Motivo']
    const rows = (data?.content ?? []).map((e) => [e.employeeName, e.departmentName ?? '', e.managerName ?? '', e.projectName, e.supplierName ?? e.title, categoryLabels[e.category] ?? e.category, formatDate(e.expenseDate), (e.amount ?? 0).toFixed(2), e.aiScore ?? '', e.complianceScore ?? '', statusLabels[e.status] ?? e.status, e.duplicate ? 'Duplicada' : e.aiDecision === 'REJECTED_BY_FISCAL_VALIDATION' ? 'Fiscal' : e.policyCompliant === false ? 'Politica' : isLowOcr(e) ? 'OCR baixo' : 'Ok', riskReason(e)])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `notas-cfo-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DesktopShell title="Todas as notas da empresa" role="CFO">
      {error && <Card className="mb-4 border-[#F09595] bg-[#FCEBEB]"><p className="text-[13px] text-[#791F1F]">{error instanceof Error ? error.message : 'Falha ao carregar notas.'}</p></Card>}

      <Card className="mb-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[14px] font-medium text-[#1a1a2e]">Filtros de investigacao</p>
            <p className="mt-1 text-[12px] text-gray-400">Use sinais financeiros para localizar notas que exigem revisao CFO.</p>
          </div>
          <Badge variant={activeFilterCount > 0 ? 'purple' : 'gray'}>{activeFilterCount} filtro(s)</Badge>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-6">
          <select value={category} onChange={(event) => resetPageAnd(() => setCategory(event.target.value as '' | ExpenseCategory))} className="h-9 rounded-[7px] border border-black/10 bg-white px-3 text-[12px] text-gray-700">
            {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={status} onChange={(event) => resetPageAnd(() => setStatus(event.target.value as '' | ExpenseStatus))} className="h-9 rounded-[7px] border border-black/10 bg-white px-3 text-[12px] text-gray-700">
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={signal} onChange={(event) => resetPageAnd(() => setSignal(event.target.value as InvestigationSignal))} className="h-9 rounded-[7px] border border-black/10 bg-white px-3 text-[12px] text-gray-700">
            {signalOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input type="date" value={from} onChange={(event) => resetPageAnd(() => setFrom(event.target.value))} className="h-9 rounded-[7px] border border-black/10 bg-white px-3 text-[12px] text-gray-700" />
          <input type="date" value={to} onChange={(event) => resetPageAnd(() => setTo(event.target.value))} className="h-9 rounded-[7px] border border-black/10 bg-white px-3 text-[12px] text-gray-700" />
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters} disabled={activeFilterCount === 0}>Limpar</Button>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[12px] text-gray-500">{isLoading ? 'Carregando notas...' : `${data?.totalElements ?? 0} nota(s) — pag. ${(data?.number ?? 0) + 1}/${Math.max(data?.totalPages ?? 1, 1)}`}</p>
            {!isLoading && (data?.content.length ?? 0) > 0 && <span className="text-[12px] text-gray-400">total desta pag. <span className="font-medium text-[#1a1a2e]">{fmt(pageTotal)}</span>{' · '}media <span className="font-medium text-[#1a1a2e]">{fmt(pageAvg)}</span></span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-2"><Badge variant="red">Duplicada</Badge><Badge variant="amber">Politica</Badge><Badge variant="blue">OCR baixo</Badge></div>
            <Button type="button" variant="ghost" size="sm" onClick={exportCSV} disabled={isLoading || (data?.content.length ?? 0) === 0}>Exportar CSV</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-[13px]">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {['Funcionario', 'Depto', 'Gestor', 'Projeto', 'Estabelecimento', 'Categoria', 'Data', 'Valor', 'Leitura', 'Conform.', 'Status', 'Risco', 'Motivo'].map((header) => (
                  <th key={header} className="py-2.5 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.content ?? []).map((expense) => (
                <tr key={expense.id} className="border-b border-black/[0.04] hover:bg-gray-50">
                  <td className="whitespace-nowrap py-3 pr-3 font-medium text-[#1a1a2e]">{expense.employeeName}</td>
                  <td className="whitespace-nowrap py-3 pr-3 text-gray-500">{expense.departmentName ?? '-'}</td>
                  <td className="whitespace-nowrap py-3 pr-3 text-gray-500">{expense.managerName ?? '-'}</td>
                  <td className="max-w-[140px] truncate py-3 pr-3 text-gray-700">{expense.projectName}</td>
                  <td className="max-w-[160px] truncate py-3 pr-3 text-gray-700">{expense.supplierName ?? expense.title}</td>
                  <td className="whitespace-nowrap py-3 pr-3 text-gray-500">{categoryLabels[expense.category] ?? expense.category}</td>
                  <td className="whitespace-nowrap py-3 pr-3 text-gray-500">{formatDate(expense.expenseDate)}</td>
                  <td className="whitespace-nowrap py-3 pr-3 font-medium">{fmt(expense.amount ?? 0)}</td>
                  <td className="py-3 pr-3 text-gray-600">{expense.aiScore ?? '-'}</td>
                  <td className="py-3 pr-3 text-gray-600">{expense.complianceScore ?? '-'}</td>
                  <td className="py-3 pr-3"><StatusBadge status={expense.status} /></td>
                  <td className="py-3 pr-3">{riskBadge(expense)}</td>
                  <td className="max-w-[220px] truncate py-3 pr-3 text-[12px] text-gray-500">{riskReason(expense)}</td>
                </tr>
              ))}
              {!isLoading && (data?.content.length ?? 0) === 0 && <tr><td colSpan={13} className="py-5 text-[13px] text-gray-400">Nenhuma nota encontrada com os filtros atuais.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 pt-4">
          <p className="text-[12px] text-gray-400">Pagina {(data?.number ?? 0) + 1} de {Math.max(data?.totalPages ?? 1, 1)}</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" disabled={data?.first ?? true} onClick={() => setPage((current) => Math.max(0, current - 1))}>Anterior</Button>
            <Button variant="ghost" size="sm" disabled={data?.last ?? true} onClick={() => setPage((current) => current + 1)}>Proxima</Button>
          </div>
        </div>
      </Card>
    </DesktopShell>
  )
}
