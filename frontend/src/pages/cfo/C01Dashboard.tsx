import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getCfoOverview, getCfoProjectPerformance } from '../../api'

function yearStart() {
  return `${new Date().getFullYear()}-01-01`
}

function today() {
  return new Date().toISOString().slice(0, 10)
}
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { fmt } from '../../data/mock'
import { getToken } from '../../session'
import {
  categoryColors,
  categoryLabels,
  formatMonthLabel,
  severityRank,
  severityVariant,
} from './cfoUtils'
import { CompliancePieChart, ExecutiveBarList, MultiSeriesTrendChart } from './cfoVisuals'
import type { PieSegment } from './cfoVisuals'

const PROJECT_PALETTE = [
  '#85B7EB', '#AFA9EC', '#FAC775', '#7EC8C8',
  '#F4A86B', '#B0D9B1', '#E8A4C9', '#A0C4FF',
  '#FFD6A5', '#CAFFBF',
]

type SortKey = 'percent-desc' | 'percent-asc' | 'reimbursed-desc' | 'reimbursed-asc' | 'revenue-desc'

const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'percent-desc',    label: 'Maior percentual' },
  { value: 'percent-asc',     label: 'Menor percentual' },
  { value: 'reimbursed-desc', label: 'Maior reembolsado' },
  { value: 'reimbursed-asc',  label: 'Menor reembolsado' },
  { value: 'revenue-desc',    label: 'Maior receita estimada' },
]

export function C01Dashboard() {
  const token = getToken()
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<SortKey>('percent-desc')
  const [from, setFrom] = useState(yearStart())
  const [to, setTo] = useState(today())
  const [queryFrom, setQueryFrom] = useState(from)
  const [queryTo, setQueryTo] = useState(to)

  const { data: overview, isLoading: loadingOverview, error } = useQuery({
    queryKey: ['cfo-overview', queryFrom, queryTo],
    queryFn: () => getCfoOverview(token!, queryFrom, queryTo),
    enabled: !!token,
  })

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['cfo-project-performance', queryFrom, queryTo],
    queryFn: () => getCfoProjectPerformance(token!, queryFrom, queryTo),
    enabled: !!token,
  })

  const isLoading = loadingOverview || loadingProjects

  const sortedProjects = useMemo(() => {
    const list = [...projects]
    const reimbursedPercent = (project: typeof projects[number]) =>
      project.totalSubmittedAmount > 0 ? project.reimbursableExpenses / project.totalSubmittedAmount : 0
    switch (sortKey) {
      case 'percent-desc':    return list.sort((a, b) => reimbursedPercent(b) - reimbursedPercent(a))
      case 'percent-asc':     return list.sort((a, b) => reimbursedPercent(a) - reimbursedPercent(b))
      case 'reimbursed-desc': return list.sort((a, b) => b.reimbursableExpenses - a.reimbursableExpenses)
      case 'reimbursed-asc':  return list.sort((a, b) => a.reimbursableExpenses - b.reimbursableExpenses)
      case 'revenue-desc':    return list.sort((a, b) => b.revenue - a.revenue)
      default:             return list
    }
  }, [projects, sortKey])

  const monthlyTrend = useMemo(
    () => (overview?.monthlyReimbursementTrend ?? []).map((item) => ({
      label: formatMonthLabel(item.month),
      values: { submitted: item.submittedAmount, reimbursed: item.reimbursedAmount },
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
  const openReimbursementAmount = Math.max(
    0,
    (overview?.totalSubmittedAmount ?? 0) - (overview?.totalReimbursedAmount ?? 0)
  )

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
    return { projected, current: currentData.reimbursedAmount, daysRemaining: remainingDays, label: formatMonthLabel(currentMonth) }
  }, [overview])

  // Pie charts — cores distintas por fatia (paleta por projeto, categoryColors por categoria)
  const projectPieSegments = useMemo((): PieSegment[] =>
    projects
      .filter((p) => p.totalExpenseCount > 0)
      .sort((a, b) => b.totalExpenseCount - a.totalExpenseCount)
      .map((p, i) => ({
        label: p.projectCode ?? p.projectName,
        value: p.totalExpenseCount,
        color: PROJECT_PALETTE[i % PROJECT_PALETTE.length],
        sublabel: `${p.complianceRate}% compliance · ${p.totalExpenseCount} notas`,
      })),
    [projects]
  )

  const categoryPieSegments = useMemo((): PieSegment[] =>
    (overview?.categorySpend ?? [])
      .filter((c) => c.expenseCount > 0)
      .sort((a, b) => b.expenseCount - a.expenseCount)
      .map((c) => {
        const ratio = c.amount > 0 ? c.avoidableLosses / c.amount : 0
        const pct = Math.round((1 - ratio) * 100)
        const risk = ratio === 0 ? 'ok' : ratio < 0.15 ? 'revisar' : 'alto risco'
        return {
          label: categoryLabels[c.category] ?? c.category,
          value: c.expenseCount,
          color: categoryColors[c.category] ?? '#85B7EB',
          sublabel: `${pct}% compliance · ${risk} · ${c.expenseCount} notas`,
        }
      }),
    [overview]
  )

  return (
    <DesktopShell title="Dashboard" role="CFO">
      {/* Filtro de período */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[12px] text-gray-500">
            De
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]"
            />
          </label>
          <label className="text-[12px] text-gray-500">
            Ate
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]"
            />
          </label>
          <button
            onClick={() => { setQueryFrom(from); setQueryTo(to) }}
            className="rounded-[8px] bg-[#1a1a2e] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#2a2a4e]"
          >
            Aplicar filtro
          </button>
          <span className="ml-auto text-[12px] text-gray-400">
            Periodo: <span className="font-medium text-[#1a1a2e]">{queryFrom}</span> até <span className="font-medium text-[#1a1a2e]">{queryTo}</span>
          </span>
        </div>
      </Card>

      {error && (
        <Card className="mb-4 border-[#F09595] bg-[#FCEBEB]">
          <p className="text-[13px] text-[#791F1F]">{error instanceof Error ? error.message : 'Falha ao carregar dashboard CFO.'}</p>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard label="Total geral de reembolsos" value={isLoading ? '...' : fmt(overview?.totalSubmittedAmount ?? 0)} subtext="base do fechamento" />
        <MetricCard label="Total ja reembolsado" value={isLoading ? '...' : fmt(overview?.totalReimbursedAmount ?? 0)} subtext={`${reimbursedRatio}% do total geral`} />
        <MetricCard label="Total em aberto" value={isLoading ? '...' : fmt(openReimbursementAmount)} subtext="a ser reembolsado" />
        <MetricCard label="Economia pela IA" value={isLoading ? '...' : fmt(overview?.aiSavings ?? 0)} subtext="politica, OCR e duplicidade" />
        <MetricCard
          label="Percentual ja reembolsado"
          value={isLoading ? '...' : `${reimbursedRatio}%`}
          subtext="sobre o total geral de reembolsos"
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
              {isLoading ? '...' : fmt(forecast?.projected ?? overview?.totalReimbursedAmount ?? 0)}
            </p>
            <p className="text-[12px] text-[#27500A]/60">{forecast ? 'projecao com base no ritmo atual' : 'total reembolsado no periodo'}</p>
            <div className="mt-3 space-y-1.5 text-[12px]">
              <div className="flex justify-between"><span className="text-[#27500A]/60">Reembolsado ate hoje</span><span className="font-medium text-[#27500A]">{fmt(forecast?.current ?? overview?.totalReimbursedAmount ?? 0)}</span></div>
              {forecast && <div className="flex justify-between"><span className="text-[#27500A]/60">Dias restantes no mes</span><span className="font-medium text-[#27500A]">{forecast.daysRemaining}</span></div>}
              <div className="flex justify-between"><span className="text-[#27500A]/60">Autoaprovacao</span><span className="font-medium text-[#27500A]">{overview?.autoApprovalRate ?? 0}%</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-medium text-[#1a1a2e]">Composicao de gastos por categoria</p>
                <p className="mt-1 text-[12px] text-gray-400">Gasto total com camada de valor evitavel para priorizar revisao.</p>
              </div>
              <Badge variant="blue">{overview?.categorySpend.length ?? 0} categorias</Badge>
            </div>
            <ExecutiveBarList items={categoryBars} formatValue={(value) => fmt(value)} emptyText="Ainda nao ha notas no periodo analisado." />
          </Card>

          {/* Painel de projetos com ordenação */}
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-medium text-[#1a1a2e]">Projetos</p>
                <p className="mt-1 text-[12px] text-gray-400">Clique para ver a performance completa do projeto.</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="purple">{projects.length} projeto(s)</Badge>
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="rounded-[8px] border border-black/[0.08] bg-white px-2 py-1.5 text-[12px] text-[#1a1a2e] focus:outline-none"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] text-[13px]">
                <thead>
                  <tr className="border-b border-black/[0.06]">
                    {['Projeto', 'Receita estimada', 'Total ja reembolsado', '% ja reembolsado', 'Compliance', ''].map((header) => (
                      <th key={header} className="py-2.5 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedProjects.map((p) => (
                    <tr
                      key={p.projectId}
                      className="cursor-pointer border-b border-black/[0.04] hover:bg-gray-50"
                      onClick={() => navigate(`/cfo/roi/${p.projectId}`)}
                    >
                      <td className="py-3 pr-3">
                        <p className="whitespace-nowrap font-medium text-[#1a1a2e]">{p.projectName}</p>
                        {p.projectCode && <p className="mt-0.5 text-[11px] text-gray-400">{p.projectCode}</p>}
                        {p.revenue > 0 && p.reimbursableExpenses / p.revenue > 0.05 && (
                          <p className="mt-1 text-[11px] font-medium text-[#791F1F]">Alerta: reembolso acima de 5% da receita</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-3 font-medium text-[#27500A]">{fmt(p.revenue)}</td>
                      <td className="whitespace-nowrap py-3 pr-3">{fmt(p.reimbursableExpenses)}</td>
                      <td className="py-3 pr-3">
                        <Badge variant={p.totalSubmittedAmount > 0 && p.reimbursableExpenses / p.totalSubmittedAmount >= 0.8 ? 'green' : 'amber'}>
                          {p.totalSubmittedAmount > 0 ? Math.round((p.reimbursableExpenses / p.totalSubmittedAmount) * 100) : 0}%
                        </Badge>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge variant={p.complianceRate >= 90 ? 'green' : p.complianceRate >= 70 ? 'amber' : 'red'}>{p.complianceRate}%</Badge>
                      </td>
                      <td className="whitespace-nowrap py-3 text-right text-[12px] font-medium text-[#3C3489]">Abrir →</td>
                    </tr>
                  ))}
                  {!loadingProjects && projects.length === 0 && (
                    <tr><td colSpan={6} className="py-5 text-[13px] text-gray-400">Nenhum projeto encontrado.</td></tr>
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
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1a1a2e] text-[11px] font-medium text-white">{index + 1}</span>
                    <p className="text-[12px] font-medium leading-snug text-[#1a1a2e]">{item.title}</p>
                  </div>
                  <Badge variant={severityVariant(item.severity)}>{item.severity}</Badge>
                </div>
                <p className="text-[11px] leading-relaxed text-gray-500">{item.description}</p>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-black/[0.05] pt-2">
                  <p className="text-[11px] text-gray-700">{item.action}</p>
                  {item.estimatedImpact > 0 && <span className="shrink-0 text-[12px] font-medium text-[#27500A]">{fmt(item.estimatedImpact)}</span>}
                </div>
              </div>
            ))}
            {!loadingOverview && recommendations.length === 0 && <p className="text-[13px] text-gray-400">Sem acoes criticas no periodo.</p>}
          </div>
        </Card>
      </div>

      {/* Gráficos de pizza de compliance */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <div className="mb-5">
            <p className="text-[14px] font-medium text-[#1a1a2e]">Compliance por projeto</p>
            <p className="mt-1 text-[12px] text-gray-400">Volume de notas por projeto · compliance % e status na legenda</p>
          </div>
          <CompliancePieChart segments={projectPieSegments} emptyText="Sem projetos com notas no periodo." />
        </Card>

        <Card>
          <div className="mb-5">
            <p className="text-[14px] font-medium text-[#1a1a2e]">Compliance por categoria</p>
            <p className="mt-1 text-[12px] text-gray-400">Volume de notas por categoria · compliance % e nivel de risco na legenda</p>
          </div>
          <CompliancePieChart segments={categoryPieSegments} emptyText="Sem categorias com notas no periodo." />
        </Card>
      </div>
    </DesktopShell>
  )
}
