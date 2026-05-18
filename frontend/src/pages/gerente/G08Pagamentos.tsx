import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApprovedPayments, getBankAccounts, getPaymentSchedule, markExpensePaid, updatePaymentSchedule } from '../../api'
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
  const rows = [['Periodo de', 'Periodo ate', 'Funcionario', 'Email', 'Pix', 'Projeto', 'Nota', 'Data da despesa', 'Origem da aprovacao', 'Valor da despesa', 'Total do funcionario', 'Total geral do lote']]
  batch.employees.forEach((employee) => {
    employee.expenses.forEach((expense) => {
      rows.push([from || 'inicio', to || 'hoje', employee.name, employee.email, employee.pixKey || '', expense.projectName || 'Sem projeto', expense.title, expense.expenseDate, expense.autoApproved ? 'IA' : 'Gestor', Number(expense.amount || 0).toFixed(2), Number(employee.totalAmount || 0).toFixed(2), Number(batch.totalAmount || 0).toFixed(2)])
    })
  })
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n')
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `reeva-pagamentos-${from || 'inicio'}-${to || 'hoje'}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function G08Pagamentos() {
  const token = getToken()
  const queryClient = useQueryClient()
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(today())
  const [queryFrom, setQueryFrom] = useState(from)
  const [queryTo, setQueryTo] = useState(to)
  const [bankAccountId, setBankAccountId] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [scheduleFrequency, setScheduleFrequency] = useState('WEEKLY')
  const [scheduleWeekday, setScheduleWeekday] = useState('4')
  const [scheduleDay, setScheduleDay] = useState('20')
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: batch, isLoading, error, refetch } = useQuery({
    queryKey: ['approved-payments', queryFrom, queryTo],
    queryFn: () => getApprovedPayments(token!, queryFrom, queryTo),
    enabled: !!token,
  })

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['manager-bank-accounts'],
    queryFn: () => getBankAccounts(token!),
    enabled: !!token,
  })

  const { data: schedule } = useQuery({
    queryKey: ['payment-schedule'],
    queryFn: () => getPaymentSchedule(token!),
    enabled: !!token,
  })

  React.useEffect(() => {
    if (!schedule) return
    setScheduleFrequency(schedule.frequency)
    setScheduleWeekday(String(schedule.weekday ?? 4))
    setScheduleDay(String(schedule.dayOfMonth ?? 20))
  }, [schedule])

  const scheduleMutation = useMutation({
    mutationFn: () => updatePaymentSchedule(token!, {
      frequency: scheduleFrequency,
      weekday: scheduleFrequency === 'WEEKLY' ? Number(scheduleWeekday) : null,
      dayOfMonth: scheduleFrequency === 'MONTHLY' ? Number(scheduleDay) : null,
    }),
    onSuccess: async () => {
      setActionError(null)
      await queryClient.invalidateQueries({ queryKey: ['payment-schedule'] })
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : 'Falha ao salvar agenda de pagamento.'),
  })

  const markPaidMutation = useMutation({
    mutationFn: (expenseId: string) => {
      if (!bankAccountId) throw new Error('Selecione a conta bancária usada no pagamento.')
      return markExpensePaid(token!, expenseId, {
        bankAccountId,
        paidDate: today(),
        paymentReference,
      })
    },
    onSuccess: async () => {
      setActionError(null)
      setPaymentReference('')
      await queryClient.invalidateQueries({ queryKey: ['approved-payments'] })
      await queryClient.invalidateQueries({ queryKey: ['manager-bank-accounts'] })
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : 'Falha ao marcar reembolso como pago.'),
  })

  const expenses = useMemo(
    () => batch?.employees.flatMap((employee) => employee.expenses.map((expense) => ({ employee, expense }))) ?? [],
    [batch]
  )

  function applyFilter() {
    setQueryFrom(from)
    setQueryTo(to)
  }

  return (
    <DesktopShell
      title="Aprovados para financeiro"
      role="GERENTE"
      actions={(
        <Button variant="primary" size="sm" disabled={!batch || batch.expenseCount === 0} onClick={() => batch && downloadCsv(batch, queryFrom, queryTo)}>
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
          <Button variant="ghost" size="sm" onClick={applyFilter} disabled={isLoading}>
            {isLoading ? 'Carregando...' : 'Filtrar'}
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(260px,1fr)_minmax(220px,1fr)]">
          <label className="text-[12px] text-gray-500">
            Conta para pagamento
            <select value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)} className="mt-1 block w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]">
              <option value="">Selecione a conta</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountName} · {fmt(account.currentBalance)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[12px] text-gray-500">
            Referência do pagamento
            <input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Pix, lote ou comprovante" className="mt-1 block w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]" />
          </label>
        </div>
      </Card>

      {error && <p className="text-[12px] text-[#791F1F] bg-[#FCEBEB] border border-[#F09595] rounded-[8px] p-3 mb-4">{error instanceof Error ? error.message : 'Falha ao carregar aprovados.'}</p>}
      {actionError && <p className="text-[12px] text-[#791F1F] bg-[#FCEBEB] border border-[#F09595] rounded-[8px] p-3 mb-4">{actionError}</p>}

      <Card className="mb-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[14px] font-medium text-[#1a1a2e]">Agenda de pagamento</p>
            <p className="mt-1 text-[12px] text-gray-400">
              {schedule?.nextPaymentDate ? `Próxima janela: ${fmtDate(schedule.nextPaymentDate)}` : schedule?.summary ?? 'Sem agenda fixa'}
            </p>
          </div>
          <Button variant="ghost" size="sm" disabled={scheduleMutation.isPending} onClick={() => scheduleMutation.mutate()}>
            {scheduleMutation.isPending ? 'Salvando...' : 'Salvar agenda'}
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="text-[12px] text-gray-500">
            Frequência
            <select value={scheduleFrequency} onChange={(event) => setScheduleFrequency(event.target.value)} className="mt-1 block w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]">
              <option value="DAILY">Diária</option>
              <option value="WEEKLY">Semanal</option>
              <option value="MONTHLY">Mensal</option>
              <option value="MANUAL">Manual</option>
            </select>
          </label>
          {scheduleFrequency === 'WEEKLY' && (
            <label className="text-[12px] text-gray-500">
              Dia da semana
              <select value={scheduleWeekday} onChange={(event) => setScheduleWeekday(event.target.value)} className="mt-1 block w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]">
                <option value="1">Segunda</option>
                <option value="2">Terça</option>
                <option value="3">Quarta</option>
                <option value="4">Quinta</option>
                <option value="5">Sexta</option>
                <option value="6">Sábado</option>
                <option value="7">Domingo</option>
              </select>
            </label>
          )}
          {scheduleFrequency === 'MONTHLY' && (
            <label className="text-[12px] text-gray-500">
              Dia do mês
              <input type="number" min={1} max={31} value={scheduleDay} onChange={(event) => setScheduleDay(event.target.value)} className="mt-1 block w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]" />
            </label>
          )}
        </div>
      </Card>

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
                {['Funcionario', 'Email', 'Pix', 'Projeto', 'Nota', 'Data', 'Origem', 'Valor', ''].map((header) => (
                  <th key={header} className="text-left py-2.5 pr-3 text-[11px] uppercase tracking-wide text-gray-400 font-medium">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!isLoading && expenses.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-gray-400">Nenhum reembolso aprovado no periodo.</td></tr>
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
                  <td className="py-3 pr-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={markPaidMutation.isPending}
                      onClick={() => markPaidMutation.mutate(expense.id)}
                    >
                      {markPaidMutation.isPending ? 'Pagando...' : 'Marcar pago'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </DesktopShell>
  )
}
