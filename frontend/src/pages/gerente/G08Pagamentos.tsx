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

function pdfSafe(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function makePdf(lines: string[]) {
  const pages: string[][] = []
  let current: string[] = []
  for (const line of lines) {
    if (current.length >= 38) {
      pages.push(current)
      current = []
    }
    current.push(line)
  }
  if (current.length) pages.push(current)

  const objects: string[] = []
  const pageObjectNumbers: number[] = []

  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push('')

  pages.forEach((pageLines) => {
    const content = [
      'BT',
      '/F1 11 Tf',
      '50 790 Td',
      '14 TL',
      ...pageLines.map((line, index) => `${index === 0 ? '' : 'T* '}(${pdfSafe(line)}) Tj`),
      'ET',
    ].join('\n')
    const contentNumber = objects.length + 1
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
    const pageNumber = objects.length + 1
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 FONT_REF 0 R >> >> /Contents ${contentNumber} 0 R >>`)
    pageObjectNumbers.push(pageNumber)
  })

  const fontObjectNumber = objects.length + 1
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(' ')}] /Count ${pageObjectNumbers.length} >>`

  const fixedObjects = objects.map((object) => object.replace('FONT_REF', String(fontObjectNumber)))
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]
  fixedObjects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefOffset = pdf.length
  pdf += `xref\n0 ${fixedObjects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${fixedObjects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}

function downloadPdf(batch: PaymentBatchResponse, from: string, to: string) {
  const lines = [
    'Reeva - Reembolsos aprovados para financeiro',
    `Periodo: ${from || 'inicio'} ate ${to || 'hoje'}`,
    `Total geral: BRL ${Number(batch.totalAmount || 0).toFixed(2)}`,
    `Funcionarios: ${batch.employeeCount} | Notas: ${batch.expenseCount}`,
    '',
    'Nome | Pix | Valor',
    '-----------------------------------------------',
  ]

  batch.employees.forEach((employee) => {
    lines.push(`${employee.name} | ${employee.pixKey || employee.email} | BRL ${Number(employee.totalAmount || 0).toFixed(2)}`)
    employee.expenses.forEach((expense) => {
      lines.push(`  - ${expense.expenseDate} | ${expense.projectName || 'Sem projeto'} | BRL ${Number(expense.amount || 0).toFixed(2)} | ${expense.autoApproved ? 'IA' : 'Gestor'}`)
    })
    lines.push('')
  })

  const blob = makePdf(lines)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `reeva-reembolsos-${from || 'inicio'}-${to || 'hoje'}.pdf`
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

  const expenses = useMemo(() => batch?.employees.flatMap((employee) => employee.expenses.map((expense) => ({ employee, expense }))) ?? [], [batch])

  return (
    <DesktopShell
      title="Aprovados para financeiro"
      role="GERENTE"
      actions={(
        <Button variant="primary" size="sm" disabled={!batch || batch.expenseCount === 0} onClick={() => batch && downloadPdf(batch, from, to)}>
          Baixar PDF
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
          <table className="w-full text-[13px] min-w-[820px]">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {['Funcionario', 'Pix', 'Projeto', 'Nota', 'Data', 'Origem', 'Valor'].map((header) => (
                  <th key={header} className="text-left py-2.5 pr-3 text-[11px] uppercase tracking-wide text-gray-400 font-medium">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && expenses.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">Nenhum reembolso aprovado no periodo.</td></tr>
              )}
              {expenses.map(({ employee, expense }) => (
                <tr key={expense.id} className="border-b border-black/[0.04]">
                  <td className="py-3 pr-3 font-medium text-[#1a1a2e] whitespace-nowrap">{employee.name}</td>
                  <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">{employee.pixKey || employee.email}</td>
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
