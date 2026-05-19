import React, { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
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

function buildTrend(projects: ProjectPerformanceResponse[]) {
  const months = Array.from(new Set(projects.flatMap((p) => p.monthlyTrend.map((t) => t.month)))).sort()
  return months.map((month) => ({
    label: formatMonthLabel(month),
    values: {
      revenue: projects.reduce((sum, p) => sum + (p.monthlyTrend.find((t) => t.month === month)?.revenue ?? 0), 0),
      totalCost: projects.reduce((sum, p) => sum + (p.monthlyTrend.find((t) => t.month === month)?.totalCost ?? 0), 0),
      profit: projects.reduce((sum, p) => sum + (p.monthlyTrend.find((t) => t.month === month)?.profit ?? 0), 0),
    },
  }))
}

export function C02ROI() {
  const token = getToken()
  const location = useLocation()
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    (location.state as { projectId?: string } | null)?.projectId ?? null
  )

  useEffect(() => {
    const id = (location.state as { projectId?: string } | null)?.projectId
    if (id) setSelectedProjectId(id)
  }, [location.state])

  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ['cfo-project-performance'],
    queryFn: () => getCfoProjectPerformance(token!),
    enabled: !!token,
  })

  const selectedProject = useMemo(
    () => projects.find((p) => p.projectId === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  )

  const detailProjects = selectedProject ? [selectedProject] : projects

  const totals = useMemo(() => {
    const revenue = detailProjects.reduce((sum, p) => sum + p.revenue, 0)
    const totalCost = detailProjects.reduce((sum, p) => sum + p.totalCost, 0)
    const profit = detailProjects.reduce((sum, p) => sum + p.profit, 0)
    const aiSavings = detailProjects.reduce((sum, p) => sum + p.aiSavings, 0)
    const roi = totalCost > 0 ? profit / totalCost : null
    const compliance = detailProjects.length > 0
      ? Math.round(detailProjects.reduce((sum, p) => sum + p.complianceRate, 0) / detailProjects.length)
      : 0
    return { revenue, totalCost, profit, aiSavings, roi, compliance }
  }, [detailProjects])

  const trend = useMemo(() => buildTrend(detailProjects), [detailProjects])
  const latestTrend = trend[trend.length - 1]

  const roiDelta = useMemo(() => {
    if (trend.length < 2) return null
    const last = trend[trend.length - 1]
    const prev = trend[trend.length - 2]
    if (!last || !prev) return null
    const lastRoi = last.values.totalCost > 0 ? last.values.profit / last.values.totalCost : null
    const prevRoi = prev.values.totalCost > 0 ? prev.values.profit / prev.values.totalCost : null
    if (lastRoi === null || prevRoi === null) return null
    return { current: lastRoi, delta: lastRoi - prevRoi, prevLabel: prev.label }
  }, [trend])

  const roiBarItems = useMemo(
    () => detailProjects.map((p) => ({ label: p.projectCode ?? p.projectName, value: p.roi ?? 0, color: roiColor(p.roi ?? 0) })).sort((a, b) => b.value - a.value),
    [detailProjects]
  )

  return (
    <DesktopShell title="Performance por projeto" role="CFO">
      {error && <p className="mb-4 rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">{error instanceof Error ? error.message : 'Falha ao carregar performance.'}</p>}

      {/* Seletor de projeto */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[220px]">
            <p className="mb-1 text-[12px] text-gray-500">Projeto</p>
            <select
              value={selectedProjectId ?? ''}
              onChange={(e) => setSelectedProjectId(e.target.value || null)}
              className="block w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e] focus:outline-none"
            >
              <option value="">Todos os projetos (visao geral)</option>
              {projects.map((p) => (
                <option key={p.projectId} value={p.projectId}>
                  {p.projectName}{p.projectCode ? ` (${p.projectCode})` : ''}
                </option>
              ))}
            </select>
          </div>
          {selectedProjectId && (
            <button
              onClick={() => setSelectedProjectId(null)}
              className="rounded-[8px] border border-black/[0.08] bg-white px-3 py-2 text-[12px] font-medium text-[#1a1a2e] hover:bg-gray-50"
            >
              Ver todos
            </button>
          )}
          <div className="text-right text-[12px] text-gray-400">
            {selectedProject
              ? <span><span className="font-medium text-[#1a1a2e]">{selectedProject.projectName}</span> · performance individual</span>
              : <span><span className="font-medium text-[#1a1a2e]">{projects.length} projeto(s)</span> · visao consolidada</span>
            }
          </div>
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Receita" value={fmt(totals.revenue)} subtext="contexto financeiro" />
        <MetricCard label="Gastos" value={fmt(totals.totalCost)} subtext="custos e reembolsos pagos" />
        <MetricCard label="ROI" value={multiple(totals.roi)} subtext={roiDelta ? `vs ${roiDelta.prevLabel}` : 'retorno sobre gastos'} trend={roiDelta ? (roiDelta.delta >= 0 ? 'up' : 'down') : undefined} trendValue={roiDelta ? `${roiDelta.delta >= 0 ? '+' : ''}${roiDelta.delta.toFixed(1)}x` : undefined} />
        <MetricCard label="Economia IA" value={fmt(totals.aiSavings)} subtext={`compliance medio ${totals.compliance}%`} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-medium text-[#1a1a2e]">Tendencia financeira</p>
              <p className="mt-1 text-[12px] text-gray-400">Receita e gastos por mes para acompanhar o consumo financeiro dos projetos.</p>
            </div>
            <Badge variant={totals.roi != null && totals.roi >= 1 ? 'green' : 'amber'}>{multiple(totals.roi)} ROI</Badge>
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
            <div className="flex justify-between"><span className="text-[#27500A]/60">Compliance medio</span><span className="font-medium text-[#27500A]">{totals.compliance}%</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-medium text-[#1a1a2e]">{selectedProject ? 'Detalhe do projeto' : 'Projetos'}</p>
              <p className="mt-1 text-[12px] text-gray-400">Clique em um projeto para abrir a performance detalhada.</p>
            </div>
            <Badge variant="purple">{detailProjects.length} projeto(s)</Badge>
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
                {detailProjects.map((p) => (
                  <tr key={p.projectId} className={`border-b border-black/[0.04] ${p.projectId === selectedProjectId ? 'bg-[#F5F8FF]' : ''}`}>
                    <td className="py-3 pr-3"><p className="whitespace-nowrap font-medium text-[#1a1a2e]">{p.projectName}</p>{p.projectCode && <p className="mt-0.5 text-[11px] text-gray-400">{p.projectCode}</p>}</td>
                    <td className="whitespace-nowrap py-3 pr-3 font-medium text-[#27500A]">{fmt(p.revenue)}</td>
                    <td className="whitespace-nowrap py-3 pr-3">{fmt(p.totalCost)}</td>
                    <td className="py-3 pr-3"><span className="font-medium" style={{ color: roiColor(p.roi ?? 0) }}>{multiple(p.roi)}</span></td>
                    <td className="py-3 pr-3"><Badge variant={p.complianceRate >= 90 ? 'green' : p.complianceRate >= 70 ? 'amber' : 'red'}>{p.complianceRate}%</Badge></td>
                  </tr>
                ))}
                {!isLoading && detailProjects.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-gray-400">Nenhum projeto encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <p className="mb-1 text-[14px] font-medium text-[#1a1a2e]">Ranking de ROI</p>
          <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-gray-500">
            {[['#27500A', '>2x'], ['#97C459', '1-2x'], ['#EF9F27', '0-1x'], ['#F09595', 'negativo']].map(([color, label]) => (
              <span key={label} className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} /> {label}</span>
            ))}
          </div>
          {roiBarItems.length > 0
            ? <HorizontalBarChart items={roiBarItems} formatValue={(value) => `${value.toFixed(1)}x`} />
            : <p className="py-4 text-[12px] text-gray-400">Nenhum projeto com dados financeiros ainda.</p>}
        </Card>
      </div>
    </DesktopShell>
  )
}
