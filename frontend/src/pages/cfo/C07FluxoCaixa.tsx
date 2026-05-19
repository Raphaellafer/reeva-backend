import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { createCashTransaction, getCfoCashFlow, getCfoProjectPerformance } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { fmt, fmtDate } from '../../realData'
import { getToken } from '../../session'
import { multiple } from './cfoUtils'

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
  const location = useLocation()
  const [from, setFrom] = useState(yearStart())
  const [to, setTo] = useState(today())
  const [queryFrom, setQueryFrom] = useState(from)
  const [queryTo, setQueryTo] = useState(to)
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    (location.state as { projectId?: string } | null)?.projectId ?? ''
  )

  useEffect(() => {
    const id = (location.state as { projectId?: string } | null)?.projectId
    if (id) setSelectedProjectId(id)
  }, [location.state])
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
    queryKey: ['cfo-project-performance'],
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

  const openingBalance = useMemo(
    () => (data?.accounts ?? []).reduce((sum, account) => sum + account.openingBalance, 0),
    [data]
  )

  // Projeto selecionado — dados do fluxo de caixa
  const selectedProjectFlow = useMemo(() => {
    if (!selectedProjectId) return null
    return (data?.projectCashFlows ?? []).find((p) => p.projectId === selectedProjectId) ?? null
  }, [data, selectedProjectId])

  // Projeto selecionado — dados de performance (ROI, receita, etc.)
  const selectedProjectPerf = useMemo(() => {
    if (!selectedProjectId) return null
    return projects.find((p) => p.projectId === selectedProjectId) ?? null
  }, [projects, selectedProjectId])

  // Tabela de fluxo por projeto — ordenada por custo descrescente + coluna ROI
  const sortedProjects = useMemo(() => {
    const flows = data?.projectCashFlows ?? []
    return [...flows]
      .filter((pf) => !selectedProjectId || pf.projectId === selectedProjectId)
      .sort((a, b) => b.outflow - a.outflow)
      .map((pf) => {
        const perf = projects.find((p) => p.projectId === pf.projectId)
        return { ...pf, roi: perf?.roi ?? null }
      })
  }, [data, projects, selectedProjectId])

  // Lançamentos filtrados pelo projeto selecionado
  const filteredTransactions = useMemo(() => {
    const transactions = data?.recentTransactions ?? []
    if (!selectedProjectId) return transactions
    return transactions.filter((t) => t.projectId === selectedProjectId)
  }, [data, selectedProjectId])

  // Métricas — quando projeto selecionado mostra dados do projeto
  const metrics = useMemo(() => {
    if (selectedProjectFlow && selectedProjectPerf) {
      const roi = selectedProjectPerf.totalCost > 0
        ? selectedProjectPerf.profit / selectedProjectPerf.totalCost
        : null
      return {
        inflow: selectedProjectFlow.inflow,
        outflow: selectedProjectFlow.outflow,
        net: selectedProjectFlow.netCashFlow,
        roi,
        label: selectedProjectPerf.projectName,
      }
    }
    return {
      inflow: data?.periodInflow ?? 0,
      outflow: data?.periodOutflow ?? 0,
      net: data?.netCashFlow ?? 0,
      roi: null,
      label: null,
    }
  }, [data, selectedProjectFlow, selectedProjectPerf])

  const projectOptions = useMemo(
    () => projects.map((p) => ({ id: p.projectId, name: p.projectName, code: p.projectCode })),
    [projects]
  )

  return (
    <DesktopShell title="Fluxo de caixa" role="CFO">
      {/* Filtros: período + projeto */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[12px] text-gray-500">
            De
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]" />
          </label>
          <label className="text-[12px] text-gray-500">
            Ate
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]" />
          </label>
          <button onClick={() => { setQueryFrom(from); setQueryTo(to) }} className="rounded-[8px] border border-black/[0.08] bg-white px-3 py-2 text-[13px] font-medium text-[#1a1a2e] hover:bg-gray-50">
            Filtrar periodo
          </button>
          <div className="border-l border-black/[0.08] pl-3">
            <label className="text-[12px] text-gray-500">
              Projeto
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="mt-1 block rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]"
              >
                <option value="">Todos os projetos</option>
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ''}</option>
                ))}
              </select>
            </label>
          </div>
          {selectedProjectId && (
            <button onClick={() => setSelectedProjectId('')} className="rounded-[8px] border border-[#F09595] bg-[#FCEBEB] px-3 py-2 text-[12px] font-medium text-[#791F1F] hover:bg-[#fad5d5]">
              Limpar filtro
            </button>
          )}
        </div>
        {selectedProjectId && metrics.label && (
          <div className="mt-3 flex items-center gap-2 border-t border-black/[0.05] pt-3">
            <Badge variant="blue">Projeto selecionado</Badge>
            <span className="text-[13px] font-medium text-[#1a1a2e]">{metrics.label}</span>
          </div>
        )}
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

      {/* Métricas — gerais ou por projeto */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {selectedProjectId && metrics.label ? (
          <>
            <MetricCard label="Entradas do projeto" value={isLoading ? '...' : fmt(metrics.inflow)} subtext={metrics.label} />
            <MetricCard label="Saidas do projeto" value={isLoading ? '...' : fmt(metrics.outflow)} subtext="custos e reembolsos" />
            <MetricCard label="Fluxo liquido" value={isLoading ? '...' : fmt(metrics.net)} subtext="entradas - saidas" trend={metrics.net >= 0 ? 'up' : 'down'} />
            <MetricCard label="ROI do projeto" value={isLoading ? '...' : multiple(metrics.roi)} subtext={selectedProjectPerf ? `margem ${selectedProjectPerf.margin != null ? `${Math.round(selectedProjectPerf.margin * 100)}%` : 'N/A'}` : ''} />
            <MetricCard label="A pagar" value={isLoading ? '...' : fmt(data?.pendingReimbursementAmount ?? 0)} subtext={`${data?.pendingReimbursementCount ?? 0} reembolso(s)`} />
          </>
        ) : (
          <>
            <MetricCard label="Saldo atual" value={isLoading ? '...' : fmt(data?.totalBalance ?? 0)} subtext={`saldo inicial ${fmt(openingBalance)}`} />
            <MetricCard label="Entradas" value={isLoading ? '...' : fmt(metrics.inflow)} subtext="no periodo" />
            <MetricCard label="Saidas" value={isLoading ? '...' : fmt(metrics.outflow)} subtext="no periodo" />
            <MetricCard label="Fluxo liquido" value={isLoading ? '...' : fmt(metrics.net)} subtext="entradas - saidas" trend={metrics.net >= 0 ? 'up' : 'down'} />
            <MetricCard label="A pagar" value={isLoading ? '...' : fmt(data?.pendingReimbursementAmount ?? 0)} subtext={`${data?.pendingReimbursementCount ?? 0} reembolso(s)`} />
          </>
        )}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Novo lançamento */}
        <Card>
          <div className="mb-4">
            <p className="text-[14px] font-medium text-[#1a1a2e]">Novo lançamento manual</p>
            <p className="mt-1 text-[12px] text-gray-400">Use para receitas, fornecedores, impostos, ajustes e outros movimentos não ligados a reembolso.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <label className="text-[12px] text-gray-500">
              Conta
              <select value={form.bankAccountId} onChange={(e) => setForm((c) => ({ ...c, bankAccountId: e.target.value }))} className="mt-1 block w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]">
                <option value="">Selecione</option>
                {(data?.accounts ?? []).map((a) => <option key={a.id} value={a.id}>{a.accountName}</option>)}
              </select>
            </label>
            <label className="text-[12px] text-gray-500">
              Projeto
              <select value={form.projectId} onChange={(e) => setForm((c) => ({ ...c, projectId: e.target.value }))} className="mt-1 block w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]">
                <option value="">Sem projeto</option>
                {projects.map((p) => <option key={p.projectId} value={p.projectId}>{p.projectName}</option>)}
              </select>
            </label>
            <label className="text-[12px] text-gray-500">
              Data
              <input type="date" value={form.transactionDate} onChange={(e) => setForm((c) => ({ ...c, transactionDate: e.target.value }))} className="mt-1 block w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]" />
            </label>
            <label className="text-[12px] text-gray-500">
              Tipo
              <select value={form.type} onChange={(e) => setForm((c) => ({ ...c, type: e.target.value as 'INFLOW' | 'OUTFLOW', category: e.target.value === 'INFLOW' ? 'REVENUE' : 'SUPPLIER' }))} className="mt-1 block w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]">
                <option value="INFLOW">Entrada</option>
                <option value="OUTFLOW">Saída</option>
              </select>
            </label>
            <label className="text-[12px] text-gray-500">
              Categoria
              <select value={form.category} onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))} className="mt-1 block w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]">
                {Object.entries(categoryLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="text-[12px] text-gray-500">
              Valor
              <input value={form.amount} onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))} placeholder="0.00" className="mt-1 block w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]" />
            </label>
            <label className="text-[12px] text-gray-500 lg:col-span-2">
              Descrição
              <input value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} placeholder="Ex: recebimento de cliente, fornecedor, imposto" className="mt-1 block w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]" />
            </label>
            <label className="text-[12px] text-gray-500 lg:col-span-3">
              Referência
              <input value={form.externalReference} onChange={(e) => setForm((c) => ({ ...c, externalReference: e.target.value }))} placeholder="NF, contrato, comprovante ou observação" className="mt-1 block w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]" />
            </label>
            <button disabled={createMutation.isPending} onClick={() => createMutation.mutate()} className="self-end rounded-[8px] bg-[#1a1a2e] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50">
              {createMutation.isPending ? 'Salvando...' : 'Adicionar lançamento'}
            </button>
          </div>
        </Card>

        {/* Contas bancárias */}
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

      {/* Fluxo por projeto — com ROI e ordenado por maior custo */}
      <Card className="mb-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[14px] font-medium text-[#1a1a2e]">Fluxo por projeto</p>
            <p className="mt-1 text-[12px] text-gray-400">
              {selectedProjectId ? 'Projeto filtrado · ' : 'Todos os projetos · '}
              entradas, saidas, liquido e ROI. Ordenado por maior custo.
            </p>
          </div>
          <Badge variant="blue">{sortedProjects.length} projeto(s)</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-[13px]">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {['Projeto', 'Entradas', 'Saidas', 'Liquido', 'ROI'].map((header) => (
                  <th key={header} className="py-2.5 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map((project) => {
                const roi = project.roi
                const roiColor = roi == null ? 'text-gray-400' : roi > 2 ? 'text-[#27500A]' : roi >= 1 ? 'text-[#97C459]' : roi > 0 ? 'text-[#EF9F27]' : 'text-[#F09595]'
                return (
                  <tr key={project.projectId} className="border-b border-black/[0.04]">
                    <td className="py-3 pr-3 font-medium text-[#1a1a2e]">{project.projectName}</td>
                    <td className="py-3 pr-3 text-[#27500A]">{fmt(project.inflow)}</td>
                    <td className="py-3 pr-3 text-[#791F1F]">{fmt(project.outflow)}</td>
                    <td className="py-3 pr-3 font-medium">{fmt(project.netCashFlow)}</td>
                    <td className={`py-3 pr-3 font-medium ${roiColor}`}>{multiple(roi)}</td>
                  </tr>
                )
              })}
              {!isLoading && sortedProjects.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-gray-400">Nenhum lancamento por projeto no periodo.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Lançamentos recentes — filtrados pelo projeto selecionado */}
      <Card>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[14px] font-medium text-[#1a1a2e]">Lancamentos recentes</p>
            <p className="mt-1 text-[12px] text-gray-400">
              {selectedProjectId && metrics.label ? `Filtrado por: ${metrics.label} · ` : ''}
              Reembolsos pagos e movimentacoes financeiras do periodo.
            </p>
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
              {filteredTransactions.map((transaction) => (
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
              {!isLoading && filteredTransactions.length === 0 && (
                <tr><td colSpan={8} className="py-6 text-center text-gray-400">Nenhum lancamento no periodo{selectedProjectId ? ' para este projeto' : ''}.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </DesktopShell>
  )
}
