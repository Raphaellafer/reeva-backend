import React, { useEffect, useMemo, useState } from 'react'
import { getCfoOverview } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { fmt } from '../../data/mock'
import { getToken } from '../../session'
import type { CfoOverviewResponse } from '../../types'
import {
  categoryColors,
  categoryLabels,
  formatMonthLabel,
  severityRank,
  severityVariant,
} from './cfoUtils'
import { ExecutiveBarList, MultiSeriesTrendChart, RiskMeter } from './cfoVisuals'

export function C01Dashboard() {
  const [overview, setOverview] = useState<CfoOverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return

    setLoading(true)
    getCfoOverview(token)
      .then(setOverview)
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar dashboard CFO.'))
      .finally(() => setLoading(false))
  }, [])

  const monthlyTrend = useMemo(
    () => (overview?.monthlyReimbursementTrend ?? []).map((item) => ({
      label: formatMonthLabel(item.month),
      values: {
        submitted: item.submittedAmount,
        reimbursed: item.reimbursedAmount,
      },
    })),
    [overview]
  )

  const categoryBars = useMemo(
    () => (overview?.categorySpend ?? []).map((item) => ({
      label: categoryLabels[item.category] ?? item.category,
      value: item.amount,
      secondaryValue: item.avoidableLosses,
      secondaryLabel: 'Evitavel',
      color: categoryColors[item.category] ?? '#1a1a2e',
      description: `${item.expenseCount} nota(s) no periodo`,
      badge: item.avoidableLosses > 0 ? <Badge variant="amber">revisar</Badge> : <Badge variant="green">ok</Badge>,
    })),
    [overview]
  )

  const recommendations = useMemo(
    () => [...(overview?.recommendations ?? [])].sort((a, b) => {
      const severity = severityRank(b.severity) - severityRank(a.severity)
      if (severity !== 0) return severity
      return b.estimatedImpact - a.estimatedImpact
    }).slice(0, 3),
    [overview]
  )

  const reimbursedRatio = overview && overview.totalSubmittedAmount > 0
    ? Math.round((overview.totalReimbursedAmount / overview.totalSubmittedAmount) * 100)
    : 0

  // Extrapola o ritmo do mês corrente para projetar o fechamento
  const forecast = useMemo(() => {
    const trend = overview?.monthlyReimbursementTrend ?? []
    if (trend.length === 0) return null

    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const currentData = trend.find((t) => t.month === currentMonth)
    if (!currentData) return null

    const dayOfMonth = now.getDate()
    if (dayOfMonth === 0) return null
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const remainingDays = daysInMonth - dayOfMonth
    const projected = currentData.reimbursedAmount + (currentData.reimbursedAmount / dayOfMonth) * remainingDays

    return {
      projected,
      current: currentData.reimbursedAmount,
      daysRemaining: remainingDays,
      label: formatMonthLabel(currentMonth),
    }
  }, [overview])

  // Compara ratio de perdas/submetido nos últimos dois meses para indicar tendência
  const complianceTrend = useMemo((): 'up' | 'down' | null => {
    const trend = overview?.monthlyReimbursementTrend ?? []
    if (trend.length < 2) return null
    const last = trend[trend.length - 1]
    const prev = trend[trend.length - 2]
    if (!last || !prev || prev.submittedAmount === 0 || last.submittedAmount === 0) return null
    const lastRatio = last.avoidableLosses / last.submittedAmount
    const prevRatio = prev.avoidableLosses / prev.submittedAmount
    return lastRatio <= prevRatio ? 'up' : 'down'
  }, [overview])

  return (
    <DesktopShell title="Dashboard executivo" role="CFO">
      {error && (
        <Card className="mb-4 border-[#F09595] bg-[#FCEBEB]">
          <p className="text-[13px] text-[#791F1F]">{error}</p>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Total submetido"
          value={loading ? '...' : fmt(overview?.totalSubmittedAmount ?? 0)}
          subtext="base do fechamento"
        />
        <MetricCard
          label="Total reembolsado"
          value={loading ? '...' : fmt(overview?.totalReimbursedAmount ?? 0)}
          subtext={`${reimbursedRatio}% do submetido`}
        />
        <MetricCard
          label="Economia pela IA"
          value={loading ? '...' : fmt(overview?.aiSavings ?? 0)}
          subtext="politica, OCR e duplicidade"
        />
        <MetricCard
          label="Compliance geral"
          value={loading ? '...' : `${overview?.complianceRate ?? 0}%`}
          subtext={`${overview?.processedExpenseCount ?? 0} notas`}
          trend={complianceTrend ?? undefined}
          trendValue={complianceTrend === 'up' ? 'melhorou' : complianceTrend === 'down' ? 'piorou' : undefined}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-medium text-[#1a1a2e]">Evolucao mensal do fechamento</p>
              <p className="mt-1 text-[12px] text-gray-400">Submetido vs reembolsado no periodo.</p>
            </div>
            <Badge variant={reimbursedRatio >= 80 ? 'green' : 'amber'}>{reimbursedRatio}% reembolsado</Badge>
          </div>
          <MultiSeriesTrendChart
            points={monthlyTrend}
            series={[
              { key: 'submitted', label: 'Submetido', color: '#85B7EB' },
              { key: 'reimbursed', label: 'Reembolsado', color: '#97C459' },
            ]}
            formatValue={(value) => fmt(value)}
          />
        </Card>

        <div className="space-y-3">
          <div className="rounded-[10px] border border-[#97C459] bg-[#EAF3DE] p-4">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#27500A]">Previsao de fechamento</p>
            <p className="text-[15px] font-medium text-[#27500A]">{forecast?.label ?? 'Periodo atual'}</p>
            <p className="my-1 text-[32px] font-medium leading-none text-[#27500A]">
              {loading ? '...' : fmt(forecast?.projected ?? overview?.totalReimbursedAmount ?? 0)}
            </p>
            <p className="text-[12px] text-[#27500A]/60">
              {forecast ? 'projecao com base no ritmo atual' : 'total reembolsado no periodo'}
            </p>
            <div className="mt-3 space-y-1.5 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[#27500A]/60">Reembolsado ate hoje</span>
                <span className="font-medium text-[#27500A]">{fmt(forecast?.current ?? overview?.totalReimbursedAmount ?? 0)}</span>
              </div>
              {forecast && (
                <div className="flex justify-between">
                  <span className="text-[#27500A]/60">Dias restantes no mes</span>
                  <span className="font-medium text-[#27500A]">{forecast.daysRemaining}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#27500A]/60">Autoaprovacao</span>
                <span className="font-medium text-[#27500A]">{overview?.autoApprovalRate ?? 0}%</span>
              </div>
            </div>
          </div>

          <div className="rounded-[10px] border border-black/[0.07] bg-white p-4">
            <p className="mb-3 text-[13px] font-medium text-[#1a1a2e]">Sinais de controle</p>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3">
                <p className="text-[22px] font-medium text-[#791F1F]">{overview?.duplicateRejectedCount ?? 0}</p>
                <p className="text-[11px] text-[#791F1F]/70">duplicadas</p>
              </div>
              <div className="rounded-[8px] border border-[#FAC775] bg-[#FAEEDA] p-3">
                <p className="text-[22px] font-medium text-[#633806]">{overview?.policyViolationCount ?? 0}</p>
                <p className="text-[11px] text-[#633806]/70">violacoes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-medium text-[#1a1a2e]">Composicao de gastos por categoria</p>
                <p className="mt-1 text-[12px] text-gray-400">Gasto total com camada de valor evitavel para priorizar revisao.</p>
              </div>
              <Badge variant="blue">{overview?.categorySpend.length ?? 0} categorias</Badge>
            </div>
            <ExecutiveBarList
              items={categoryBars}
              formatValue={(value) => fmt(value)}
              emptyText="Ainda nao ha notas no periodo analisado."
            />
          </Card>

          <Card>
            <p className="mb-3 text-[14px] font-medium text-[#1a1a2e]">Projetos por risco em reembolso</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-[13px]">
                <thead>
                  <tr className="border-b border-black/[0.06]">
                    {['Projeto', 'Reembolsado', 'Compliance', 'Risco'].map((header) => (
                      <th key={header} className="py-2.5 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(overview?.projectRiskRanking ?? []).map((project) => (
                    <tr key={project.projectId} className="border-b border-black/[0.04] hover:bg-gray-50">
                      <td className="py-3 pr-3 font-medium text-[#1a1a2e]">
                        <p className="whitespace-nowrap">{project.projectName}</p>
                        {project.projectCode && <p className="text-[11px] text-gray-400">{project.projectCode}</p>}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-3 font-medium">{fmt(project.reimbursedAmount)}</td>
                      <td className="py-3 pr-3">
                        <Badge variant={project.complianceRate >= 95 ? 'green' : project.complianceRate >= 80 ? 'amber' : 'red'}>
                          {project.complianceRate}%
                        </Badge>
                      </td>
                      <td className="py-3">
                        <RiskMeter score={project.riskScore} />
                      </td>
                    </tr>
                  ))}
                  {!loading && (overview?.projectRiskRanking.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={4} className="py-5 text-[13px] text-gray-400">Nenhum projeto com reembolso no periodo.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Card>
          <p className="mb-3 text-[14px] font-medium text-[#1a1a2e]">Acoes necessarias</p>
          <div className="space-y-3">
            {recommendations.map((item, index) => (
              <div key={`${item.type}-${item.title}`} className="rounded-[8px] border border-black/[0.06] p-3">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="flex gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1a1a2e] text-[11px] font-medium text-white">
                      {index + 1}
                    </span>
                    <p className="text-[12px] font-medium leading-snug text-[#1a1a2e]">{item.title}</p>
                  </div>
                  <Badge variant={severityVariant(item.severity)}>{item.severity}</Badge>
                </div>
                <p className="text-[11px] leading-relaxed text-gray-500">{item.description}</p>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-black/[0.05] pt-2">
                  <p className="text-[11px] text-gray-700">{item.action}</p>
                  {item.estimatedImpact > 0 && (
                    <span className="shrink-0 text-[12px] font-medium text-[#27500A]">{fmt(item.estimatedImpact)}</span>
                  )}
                </div>
              </div>
            ))}
            {!loading && recommendations.length === 0 && (
              <p className="text-[13px] text-gray-400">Sem acoes criticas no periodo.</p>
            )}
          </div>
        </Card>
      </div>
    </DesktopShell>
  )
}
