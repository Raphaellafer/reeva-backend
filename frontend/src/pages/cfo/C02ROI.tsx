import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { getCfoProjectPerformance } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { HorizontalBarChart } from '../../components/ui/HorizontalBarChart'
import { MetricCard } from '../../components/ui/MetricCard'
import { fmt } from '../../data/mock'
import { getToken } from '../../session'
import type { ProjectPerformanceResponse } from '../../types'
import { formatMonthLabel, multiple } from './cfoUtils'
import { MultiSeriesTrendChart } from './cfoVisuals'

function roiColor(roi: number): string {
  if (roi > 2) return '#27500A'
  if (roi >= 1) return '#97C459'
  if (roi > 0) return '#EF9F27'
  return '#F09595'
}

function buildTrend(project: ProjectPerformanceResponse | null) {
  if (!project) return []
  return project.monthlyTrend.map((item) => ({
    label: formatMonthLabel(item.month),
    values: {
      revenue: item.revenue,
      totalCost: item.totalCost,
      profit: item.profit,
    },
  }))
}

export function C02ROI() {
  const token = getToken()
  const { projectId } = useParams()

  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ['cfo-project-performance'],
    queryFn: () => getCfoProjectPerformance(token!),
    enabled: !!token,
  })

  const project = useMemo(
    () => projects.find((item) => item.projectId === projectId) ?? null,
    [projects, projectId]
  )

  const trend = useMemo(() => buildTrend(project), [project])
  const latestTrend = trend[trend.length - 1]

  const roiDelta = useMemo(() => {
    if (trend.length < 2) return null
    const last = trend[trend.length - 1]
    const prev = trend[trend.length - 2]
    if (!last || !prev) return null
    const lastRoi = last.values.totalCost > 0 ? last.values.profit / last.values.totalCost : null
    const prevRoi = prev.values.totalCost > 0 ? prev.values.profit / prev.values.totalCost : null
    if (lastRoi === null || prevRoi === null) return null
    return { delta: lastRoi - prevRoi, prevLabel: prev.label }
  }, [trend])

  const roiBarItems = useMemo(
    () => project ? [{ label: project.projectCode ?? project.projectName, value: project.roi ?? 0, color: roiColor(project.roi ?? 0) }] : [],
    [project]
  )

  return (
    <DesktopShell title={project ? `ROI - ${project.projectName}` : 'ROI do projeto'} role="CFO">
      {error && <p className="mb-4 rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">{error instanceof Error ? error.message : 'Falha ao carregar performance.'}</p>}

      {!isLoading && !project && (
        <Card className="mb-4 border-[#FAC775] bg-[#FAEEDA]">
          <p className="text-[13px] text-[#633806]">Projeto nao encontrado. Volte ao dashboard e abra o ROI por um projeto da lista.</p>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Receita" value={isLoading ? '...' : fmt(project?.revenue ?? 0)} subtext="contexto financeiro" />
        <MetricCard label="Gastos" value={isLoading ? '...' : fmt(project?.totalCost ?? 0)} subtext="custos e reembolsos pagos" />
        <MetricCard label="ROI" value={isLoading ? '...' : multiple(project?.roi ?? null)} subtext={roiDelta ? `vs ${roiDelta.prevLabel}` : 'retorno sobre gastos'} trend={roiDelta ? (roiDelta.delta >= 0 ? 'up' : 'down') : undefined} trendValue={roiDelta ? `${roiDelta.delta >= 0 ? '+' : ''}${roiDelta.delta.toFixed(1)}x` : undefined} />
        <MetricCard label="Economia IA" value={isLoading ? '...' : fmt(project?.aiSavings ?? 0)} subtext={`compliance ${project?.complianceRate ?? 0}%`} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-medium text-[#1a1a2e]">Tendencia financeira</p>
              <p className="mt-1 text-[12px] text-gray-400">Receita e gastos por mes do projeto selecionado no dashboard.</p>
            </div>
            <Badge variant={(project?.roi ?? 0) >= 1 ? 'green' : 'amber'}>{multiple(project?.roi ?? null)} ROI</Badge>
          </div>
          <MultiSeriesTrendChart points={trend} series={[{ key: 'revenue', label: 'Receita', color: '#85B7EB' }, { key: 'totalCost', label: 'Gastos', color: '#FAC775' }]} formatValue={(value) => fmt(value)} emptyText="Nenhum mes com movimentacao financeira." />
        </Card>

        <div className="rounded-[10px] border border-[#97C459] bg-[#EAF3DE] p-4">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#27500A]">Ultimo periodo</p>
          <p className="text-[15px] font-medium text-[#27500A]">{latestTrend?.label ?? 'Sem periodo'}</p>
          <p className="my-1 text-[32px] font-medium leading-none text-[#27500A]">{fmt(latestTrend?.values.totalCost ?? 0)}</p>
          <p className="text-[12px] text-[#27500A]/60">gastos do periodo</p>
          <div className="mt-3 space-y-1.5 text-[12px]">
            <div className="flex justify-between"><span className="text-[#27500A]/60">Receita</span><span className="font-medium text-[#27500A]">{fmt(latestTrend?.values.revenue ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-[#27500A]/60">Gastos</span><span className="font-medium text-[#27500A]">{fmt(latestTrend?.values.totalCost ?? 0)}</span></div>
            {roiDelta && <div className="flex justify-between"><span className="text-[#27500A]/60">ROI vs mes anterior</span><span className={`font-medium ${roiDelta.delta >= 0 ? 'text-[#27500A]' : 'text-[#791F1F]'}`}>{roiDelta.delta >= 0 ? '+' : ''}{roiDelta.delta.toFixed(2)}x</span></div>}
            <div className="flex justify-between"><span className="text-[#27500A]/60">Compliance</span><span className="font-medium text-[#27500A]">{project?.complianceRate ?? 0}%</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-medium text-[#1a1a2e]">Detalhe do projeto</p>
              <p className="mt-1 text-[12px] text-gray-400">Resumo financeiro do projeto aberto pelo dashboard.</p>
            </div>
            <Badge variant={project ? 'purple' : 'gray'}>{project ? '1 projeto' : 'sem projeto'}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-[13px]">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  {['Projeto', 'Receita', 'Gastos', 'ROI', 'Compliance'].map((header) => (
                    <th key={header} className="py-2.5 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {project && (
                  <tr className="border-b border-black/[0.04] bg-[#F5F8FF]">
                    <td className="py-3 pr-3"><p className="whitespace-nowrap font-medium text-[#1a1a2e]">{project.projectName}</p>{project.projectCode && <p className="mt-0.5 text-[11px] text-gray-400">{project.projectCode}</p>}</td>
                    <td className="whitespace-nowrap py-3 pr-3 font-medium text-[#27500A]">{fmt(project.revenue)}</td>
                    <td className="whitespace-nowrap py-3 pr-3">{fmt(project.totalCost)}</td>
                    <td className="py-3 pr-3"><span className="font-medium" style={{ color: roiColor(project.roi ?? 0) }}>{multiple(project.roi)}</span></td>
                    <td className="py-3 pr-3"><Badge variant={project.complianceRate >= 90 ? 'green' : project.complianceRate >= 70 ? 'amber' : 'red'}>{project.complianceRate}%</Badge></td>
                  </tr>
                )}
                {!isLoading && !project && <tr><td colSpan={5} className="py-8 text-center text-gray-400">Nenhum projeto encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <p className="mb-1 text-[14px] font-medium text-[#1a1a2e]">ROI do projeto</p>
          <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-gray-500">
            {[['#27500A', '>2x'], ['#97C459', '1-2x'], ['#EF9F27', '0-1x'], ['#F09595', 'negativo']].map(([color, label]) => (
              <span key={label} className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} /> {label}</span>
            ))}
          </div>
          {roiBarItems.length > 0
            ? <HorizontalBarChart items={roiBarItems} formatValue={(value) => `${value.toFixed(1)}x`} />
            : <p className="py-4 text-[12px] text-gray-400">Nenhum dado financeiro ainda.</p>}
        </Card>
      </div>
    </DesktopShell>
  )
}
