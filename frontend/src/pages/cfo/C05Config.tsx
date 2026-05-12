import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCfoCompliance, getCfoOverview, getCfoPolicies } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Badge, type BadgeVariant } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { fmt } from '../../data/mock'
import { getToken } from '../../session'
import type { CfoComplianceResponse, CfoOverviewResponse, ExpenseCategory, PolicyResponse } from '../../types'
import { categoryLabels, riskVariantByScore } from './cfoUtils'
import { RiskMeter } from './cfoVisuals'

interface GovernanceRow {
  policy: PolicyResponse
  spent: number
  avoidableLosses: number
  expenseCount: number
  policyViolationCount: number
  riskScore: number
  signal: string
  signalVariant: BadgeVariant
  recommendation: string
}

function buildSignal(row: Omit<GovernanceRow, 'signal' | 'signalVariant' | 'recommendation'>) {
  if (row.riskScore >= 70 || row.avoidableLosses > 0) return { label: 'Revisar agora', variant: 'red' as const }
  if (row.riskScore >= 35 || row.policyViolationCount > 0) return { label: 'Monitorar', variant: 'amber' as const }
  if (row.expenseCount === 0) return { label: 'Sem amostra', variant: 'gray' as const }
  return { label: 'Controlada', variant: 'green' as const }
}

function buildRecommendation(row: Omit<GovernanceRow, 'signal' | 'signalVariant' | 'recommendation'>) {
  if (row.avoidableLosses > 0) return 'Revisar limite e exigir justificativa para excecoes desta categoria.'
  if (row.policyViolationCount > 0) return 'Ajustar comunicacao da politica e manter revisao manual ate estabilizar.'
  if (row.policy.autoApprovalMinScore >= 90) return 'Score conservador: avaliar automacao se o historico continuar limpo.'
  if (!row.policy.requiresReceipt) return 'Confirmar se recibo opcional ainda faz sentido para auditoria.'
  return 'Manter regra atual e acompanhar no fechamento mensal.'
}

export function C05Config() {
  const token = getToken()

  const { data: policies = [], isLoading: policiesLoading } = useQuery({
    queryKey: ['cfo-policies'],
    queryFn: () => getCfoPolicies(token!),
    enabled: !!token,
  })

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['cfo-overview'],
    queryFn: () => getCfoOverview(token!),
    enabled: !!token,
  })

  const { data: compliance, isLoading: complianceLoading, error } = useQuery({
    queryKey: ['cfo-compliance'],
    queryFn: () => getCfoCompliance(token!),
    enabled: !!token,
  })

  const isLoading = policiesLoading || overviewLoading || complianceLoading

  const rows = useMemo<GovernanceRow[]>(() => policies.map((policy) => {
    const spend = overview?.categorySpend.find((item) => item.category === policy.category)
    const risk = compliance?.riskyCategories.find((item) => item.category === policy.category)
    const base = { policy, spent: spend?.amount ?? 0, avoidableLosses: spend?.avoidableLosses ?? risk?.avoidedAmount ?? 0, expenseCount: spend?.expenseCount ?? risk?.expenseCount ?? 0, policyViolationCount: risk?.policyViolationCount ?? 0, riskScore: risk?.riskScore ?? 0 }
    const signal = buildSignal(base)
    return { ...base, signal: signal.label, signalVariant: signal.variant, recommendation: buildRecommendation(base) }
  }), [policies, overview, compliance])

  const totals = useMemo(() => {
    const spent = rows.reduce((sum, row) => sum + row.spent, 0)
    const avoidable = rows.reduce((sum, row) => sum + row.avoidableLosses, 0)
    const withSample = rows.filter((row) => row.expenseCount > 0)
    const controlled = withSample.filter((row) => row.signalVariant === 'green').length
    const efetividade = withSample.length > 0 ? Math.round((controlled / withSample.length) * 100) : null
    const reviewed = rows.filter((row) => row.signalVariant === 'red' || row.signalVariant === 'amber').length
    return { spent, avoidable, reviewed, efetividade, controlled, withSample: withSample.length }
  }, [rows])

  const signalCounts = useMemo(() => ({
    red: rows.filter((row) => row.signalVariant === 'red').length,
    amber: rows.filter((row) => row.signalVariant === 'amber').length,
    green: rows.filter((row) => row.signalVariant === 'green').length,
  }), [rows])

  return (
    <DesktopShell title="Governanca de politicas" role="CFO">
      <div className="space-y-4">
        {error && <Card className="border-[#F09595] bg-[#FCEBEB]"><p className="text-[13px] text-[#791F1F]">{error instanceof Error ? error.message : 'Falha ao carregar governanca CFO.'}</p></Card>}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Politicas ativas" value={isLoading ? '...' : policies.length} subtext="categorias monitoradas" />
          <MetricCard label="Gasto monitorado" value={isLoading ? '...' : fmt(totals.spent)} subtext="periodo CFO" />
          <MetricCard label="Valor evitavel" value={isLoading ? '...' : fmt(totals.avoidable)} subtext={`${totals.reviewed} regra(s) em atencao`} />
          <MetricCard label="Efetividade" value={isLoading ? '...' : totals.efetividade != null ? `${totals.efetividade}%` : 'N/A'} subtext={totals.withSample > 0 ? `${totals.controlled} de ${totals.withSample} regras controladas` : 'sem dados de gasto'} trend={totals.efetividade != null ? (totals.efetividade >= 70 ? 'up' : 'down') : undefined} trendValue={totals.efetividade != null ? (totals.efetividade >= 70 ? 'saudavel' : 'atencao') : undefined} />
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-black/[0.07] bg-white px-4 py-3">
          <p className="text-[12px] font-medium text-gray-500">Distribuicao de sinais:</p>
          <span className="flex items-center gap-1.5 text-[12px]"><span className="h-2.5 w-2.5 rounded-full bg-[#F09595]" /><span className="font-medium text-[#791F1F]">{signalCounts.red}</span><span className="text-gray-400">Revisar agora</span></span>
          <span className="flex items-center gap-1.5 text-[12px]"><span className="h-2.5 w-2.5 rounded-full bg-[#FAC775]" /><span className="font-medium text-[#633806]">{signalCounts.amber}</span><span className="text-gray-400">Monitorar</span></span>
          <span className="flex items-center gap-1.5 text-[12px]"><span className="h-2.5 w-2.5 rounded-full bg-[#97C459]" /><span className="font-medium text-[#27500A]">{signalCounts.green}</span><span className="text-gray-400">Controlada</span></span>
        </div>

        <Card>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-medium text-[#1a1a2e]">Politicas ativas de reembolso</p>
              <p className="mt-1 text-[12px] text-gray-400">Contrato atual mais leitura de desempenho para decisao executiva.</p>
            </div>
            <Badge variant={isLoading ? 'gray' : 'purple'}>{isLoading ? 'Carregando' : `${policies.length} politica(s)`}</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-[13px]">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  {['Categoria', 'Limite', 'Recibo', 'Gasto', 'Evitavel', 'Risco', 'Sinal', 'Recomendacao'].map((header) => (
                    <th key={header} className="py-2.5 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.policy.id} className="border-b border-black/[0.04] hover:bg-gray-50">
                    <td className="whitespace-nowrap py-3 pr-3 font-medium text-[#1a1a2e]">{categoryLabels[row.policy.category] ?? row.policy.category}</td>
                    <td className="whitespace-nowrap py-3 pr-3 font-medium">{fmt(row.policy.maxAmount)}</td>
                    <td className="py-3 pr-3">{row.policy.requiresReceipt ? <Badge variant="green">Obrigatorio</Badge> : <Badge variant="gray">Opcional</Badge>}</td>
                    <td className="whitespace-nowrap py-3 pr-3 font-medium">{fmt(row.spent)}</td>
                    <td className="whitespace-nowrap py-3 pr-3 font-medium text-[#633806]">{fmt(row.avoidableLosses)}</td>
                    <td className="py-3 pr-3"><RiskMeter score={row.riskScore} /></td>
                    <td className="py-3 pr-3"><Badge variant={row.signalVariant}>{row.signal}</Badge></td>
                    <td className="max-w-[260px] py-3 pr-3 text-[12px] leading-snug text-gray-500">{row.recommendation}</td>
                  </tr>
                ))}
                {!isLoading && rows.length === 0 && <tr><td colSpan={8} className="py-5 text-[13px] text-gray-400">Nenhuma politica ativa encontrada.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DesktopShell>
  )
}
