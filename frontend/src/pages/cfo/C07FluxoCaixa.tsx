import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCashTransaction, getCfoCashFlow, getCfoProjectPerformance } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { fmt, fmtDate } from '../../realData'
import { getToken } from '../../session'

function yearStart() {
  const now = new Date()
  return new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

const categoryLabels: Record<string, string> = {
  REVENUE: 'Receita',
  SUPPLIER: 'Fornecedor',
  REIMBURSEMENT: 'Reembolso',
  SOFTWARE: 'Software',
  TAX: 'Imposto',
  PAYROLL: 'Folha',
  ADJUSTMENT: 'Ajuste',
  OTHER: 'Outro',
}

export function C07FluxoCaixa() {
  const token = getToken()
  const queryClient = useQueryClient()
  const [from, setFrom] = useState(yearStart())
  const [to, setTo] = useState(today())
  const [queryFrom, setQueryFrom] = useState(from)
  const [queryTo, setQueryTo] = useState(to)
  const [form, setForm] = useState({
    bankAccountId: '',
    projectId: '',
    transactionDate: today(),
    description: '',
    type: 'INFLOW' as 'INFLOW' | 'OUTFLOW',
    category: 'REVENUE',
    amount: '',
    externalReference: '',
  })
  const [formError, setFormError] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['cfo-cash-flow', queryFrom, queryTo],
    queryFn: () => getCfoCashFlow(token!, queryFrom, queryTo),
    enabled: !!token,
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['cfo-project-performance-options'],
    queryFn: () => getCfoProjectPerformance(token!),
    enabled: !!token,
  })

  const createMutation = useMutation({
    mutationFn: () => {
      if (!form.bankAccountId) throw new Error('Selecione a conta bancária.')
      if (!form.description.trim()) throw new Error('Informe a descrição.')
      if (!form.amount || Number(form.amount) <= 0) throw new Error('Informe um valor maior que zero.')
      return createCashTransaction(token!, {
        ...form,
        projectId: form.projectId || null,
        description: form.description.trim(),
      })
    },
    onSuccess: async () => {
      setFormError(null)
      setForm((current) => ({ ...current, description: '', amount: '', externalReference: '' }))
      await queryClient.invalidateQueries({ queryKey: ['cfo-cash-flow'] })
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : 'Falha ao criar lançamento.'),
  })

  const sortedProjects = useMemo(
    () => [...(data?.projectCashFlows ?? [])].sort((a, b) => b.netCashFlow - a.netCashFlow),
    [data]
  )
  const openingBalance = useMemo(
    () => (data?.accounts ?? []).reduce((sum, account) => sum + account.openingBalance, 0),
    [data]
  )

  return (
    <DesktopShell title="Fluxo de caixa" role="CFO">
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[12px] text-gray-500">
            De
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 block rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]" />
          </label>
          <label className="text-[12px] text-gray-500">
            Ate
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 block rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]" />
          </label>
          <button onClick={() => { setQueryFrom(from); setQueryTo(to) }} className="rounded-[8px] border border-black/[0.08] bg-white px-3 py-2 text-[13px] font-medium text-[#1a1a2e] hover:bg-gray-50">
            Filtrar
          </button>
        </div>
      </Card>

      {error && (
        <Card className="mb-4 border-[#F09595] bg-[#FCEBEB]">
          <p className="text-[13px] text-[#791F1F]">{error instanceof Error ? error.message : 'Falha ao carregar fluxo de caixa.'}</p>
        </Card>
      )}
      {formError && (
        <Card className="mb-4 border-[#F09595] bg-[#FCEBEB]">
          <p className="text-[13px] text-[#791F1F]">{formError}</p>
        </Card>
      )}

      <Card className="mb-4">
        <div className="mb-4">
          <p className="text-[14px] font-medium text-[#1a1a2e]">Novo lançamento manual</p>
          <p className="mt-1 text-[12px] text-gray-400">Use para receitas, fornecedores, impostos, ajustes e outros movimentos não ligados a reembolso.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <label className="text-[12px] text-gray-500">
            Conta
            <select value={form.bankAccountId} onChange={(event) => setForm((current) => ({ ...current, bankAccountId: event.target.value }))} className="mt-1 block w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]">
              <option value="">Selecione</option>
              {(data?.accounts ?? []).map((account) => <option key={account.id} value={account.id}>{account.accountName}</option>)}
            </select>
          </label>
          <label className="text-[12px] text-gray-500">
            Projeto
            <select value={form.projectId} onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value }))} className="mt-1 block w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]">
              <option value="">Sem projeto</option>
              {projects.map((project) => <option key={project.projectId} value={project.projectId}>{project.projectName}</option>)}
            </select>
          </label>
          <label className="text-[12px] text-gray-500">
            Data
            <input type="date" value={form.transactionDate} onChange={(event) => setForm((current) => ({ ...current, transactionDate: event.target.value }))} className="mt-1 block w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]" />
          </label>
          <label className="text-[12px] text-gray-500">
            Tipo
            <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as 'INFLOW' | 'OUTFLOW', category: event.target.value === 'INFLOW' ? 'REVENUE' : 'SUPPLIER' }))} className="mt-1 block w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]">
              <option value="INFLOW">Entrada</option>
              <option value="OUTFLOW">Saída</option>
            </select>
          </label>
          <label className="text-[12px] text-gray-500">
            Categoria
            <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="mt-1 block w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]">
              {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-[12px] text-gray-500">
            Valor
            <input value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="0.00" className="mt-1 block w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]" />
          </label>
          <label className="text-[12px] text-gray-500 lg:col-span-2">
            Descrição
            <input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Ex: recebimento de cliente, fornecedor, imposto" className="mt-1 block w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]" />
          </label>
          <label className="text-[12px] text-gray-500 lg:col-span-3">
            Referência
            <input value={form.externalReference} onChange={(event) => setForm((current) => ({ ...current, externalReference: event.target.value }))} placeholder="NF, contrato, comprovante ou observação" className="mt-1 block w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]" />
          </label>
          <button disabled={createMutation.isPending} onClick={() => createMutation.mutate()} className="self-end rounded-[8px] bg-[#1a1a2e] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50">
            {createMutation.isPending ? 'Salvando...' : 'Adicionar lançamento'}
          </button>
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard label="Saldo atual" value={isLoading ? '...' : fmt(data?.totalBalance ?? 0)} subtext={`saldo inicial ${fmt(openingBalance)}`} />
        <MetricCard label="Entradas" value={isLoading ? '...' : fmt(data?.periodInflow ?? 0)} subtext="no periodo" />
        <MetricCard label="Saidas" value={isLoading ? '...' : fmt(data?.periodOutflow ?? 0)} subtext="no periodo" />
        <MetricCard label="Fluxo liquido" value={isLoading ? '...' : fmt(data?.netCashFlow ?? 0)} subtext="entradas - saidas" trend={(data?.netCashFlow ?? 0) >= 0 ? 'up' : 'down'} />
        <MetricCard label="A pagar" value={isLoading ? '...' : fmt(data?.pendingReimbursementAmount ?? 0)} subtext={`${data?.pendingReimbursementCount ?? 0} reembolso(s)`} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-medium text-[#1a1a2e]">Fluxo por projeto</p>
              <p className="mt-1 text-[12px] text-gray-400">Entradas, saidas e caixa liquido no periodo selecionado. O saldo atual tambem inclui o saldo inicial das contas.</p>
            </div>
            <Badge variant="blue">{sortedProjects.length} projeto(s)</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-[13px]">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  {['Projeto', 'Entradas', 'Saidas', 'Liquido'].map((header) => (
                    <th key={header} className="py-2.5 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedProjects.map((project) => (
                  <tr key={project.projectId} className="border-b border-black/[0.04]">
                    <td className="py-3 pr-3 font-medium text-[#1a1a2e]">{project.projectName}</td>
                    <td className="py-3 pr-3 text-[#27500A]">{fmt(project.inflow)}</td>
                    <td className="py-3 pr-3 text-[#791F1F]">{fmt(project.outflow)}</td>
                    <td className="py-3 pr-3 font-medium">{fmt(project.netCashFlow)}</td>
                  </tr>
                ))}
                {!isLoading && sortedProjects.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-gray-400">Nenhum lancamento por projeto no periodo.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <p className="mb-3 text-[14px] font-medium text-[#1a1a2e]">Contas bancarias</p>
          <div className="space-y-2">
            {(data?.accounts ?? []).map((account) => (
              <div key={account.id} className="rounded-[8px] border border-black/[0.06] p-3">
                <p className="text-[13px] font-medium text-[#1a1a2e]">{account.accountName}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">{account.bankName}{account.projectName ? ` · ${account.projectName}` : ''}</p>
                <p className="mt-2 text-[20px] font-semibold text-[#1a1a2e]">{fmt(account.currentBalance)}</p>
                <p className="mt-1 text-[11px] text-gray-400">Saldo inicial {fmt(account.openingBalance)} em {fmtDate(account.openingBalanceDate)}</p>
              </div>
            ))}
            {!isLoading && (data?.accounts.length ?? 0) === 0 && <p className="text-[13px] text-gray-400">Nenhuma conta bancaria ativa.</p>}
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[14px] font-medium text-[#1a1a2e]">Lancamentos recentes</p>
            <p className="mt-1 text-[12px] text-gray-400">Reembolsos pagos e movimentacoes financeiras do periodo.</p>
          </div>
          <Badge variant="green">Reembolsos pagos: {fmt(data?.paidReimbursementAmount ?? 0)}</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-[13px]">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {['Data', 'Descricao', 'Conta', 'Projeto', 'Categoria', 'Tipo', 'Valor', 'Saldo apos'].map((header) => (
                  <th key={header} className="py-2.5 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.recentTransactions ?? []).map((transaction) => (
                <tr key={transaction.id} className="border-b border-black/[0.04]">
                  <td className="whitespace-nowrap py-3 pr-3 text-gray-500">{fmtDate(transaction.transactionDate)}</td>
                  <td className="max-w-[260px] truncate py-3 pr-3 font-medium text-[#1a1a2e]">{transaction.description}</td>
                  <td className="whitespace-nowrap py-3 pr-3 text-gray-500">{transaction.bankAccountName}</td>
                  <td className="py-3 pr-3 text-gray-500">{transaction.projectName ?? '-'}</td>
                  <td className="py-3 pr-3">{categoryLabels[transaction.category] ?? transaction.category}</td>
                  <td className="py-3 pr-3"><Badge variant={transaction.type === 'INFLOW' ? 'green' : 'red'}>{transaction.type === 'INFLOW' ? 'Entrada' : 'Saida'}</Badge></td>
                  <td className="whitespace-nowrap py-3 pr-3 font-medium">{fmt(transaction.amount)}</td>
                  <td className="whitespace-nowrap py-3 pr-3 text-gray-500">{fmt(transaction.balanceAfter)}</td>
                </tr>
              ))}
              {!isLoading && (data?.recentTransactions.length ?? 0) === 0 && (
                <tr><td colSpan={8} className="py-6 text-center text-gray-400">Nenhum lancamento no periodo.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </DesktopShell>
  )
}
