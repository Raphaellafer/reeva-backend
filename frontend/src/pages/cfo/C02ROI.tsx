import React, { useEffect, useMemo, useState } from 'react'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { Badge } from '../../components/ui/Badge'
import { HorizontalBarChart } from '../../components/ui/HorizontalBarChart'
import { fmt } from '../../data/mock'
import { getCfoProjectPerformance } from '../../api'
import { getToken } from '../../session'
import type { ProjectPerformanceResponse } from '../../types'

function roiColor(roi: number): string {
  if (roi > 2) return '#27500A'
  if (roi >= 1) return '#97C459'
  if (roi > 0) return '#EF9F27'
  return '#F09595'
}

function pct(value: number | null) {
  return value == null ? 'N/A' : `${Math.round(value * 100)}%`
}

function multiple(value: number | null) {
  return value == null ? 'N/A' : `${value.toFixed(1)}x`
}

function latestTrend(projects: ProjectPerformanceResponse[]) {
  const months = projects.flatMap((project) => project.monthlyTrend.map((item) => item.month)).sort()
  const latest = months[months.length - 1]
  if (!latest) return null
  const revenue = projects.reduce((sum, project) => {
    const row = project.monthlyTrend.find((item) => item.month === latest)
    return sum + (row?.revenue ?? 0)
  }, 0)
  const totalCost = projects.reduce((sum, project) => {
    const row = project.monthlyTrend.find((item) => item.month === latest)
    return sum + (row?.totalCost ?? 0)
  }, 0)
  const profit = projects.reduce((sum, project) => {
    const row = project.monthlyTrend.find((item) => item.month === latest)
    return sum + (row?.profit ?? 0)
  }, 0)
  return { month: latest, revenue, totalCost, profit }
}

export function C02ROI() {
  const [projects, setProjects] = useState<ProjectPerformanceResponse[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      setError('Sessao expirada. Faca login novamente.')
      return
    }
    getCfoProjectPerformance(token)
      .then((items) => setProjects(items))
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar performance.'))
      .finally(() => setLoading(false))
  }, [])

  const selectedProject = useMemo(
    () => projects.find((project) => project.projectId === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  )

  const detailProjects = selectedProject ? [selectedProject] : projects

  const totals = useMemo(() => {
    const revenue = detailProjects.reduce((sum, project) => sum + project.revenue, 0)
    const totalCost = detailProjects.reduce((sum, project) => sum + project.totalCost, 0)
    const profit = detailProjects.reduce((sum, project) => sum + project.profit, 0)
    const aiSavings = detailProjects.reduce((sum, project) => sum + project.aiSavings, 0)
    const avoidableLosses = detailProjects.reduce((sum, project) => sum + project.avoidableLosses, 0)
    const margin = revenue > 0 ? profit / revenue : null
    const roi = totalCost > 0 ? profit / totalCost : null
    return { revenue, totalCost, profit, aiSavings, avoidableLosses, margin, roi }
  }, [detailProjects])

  const roiBarItems = detailProjects
    .map((project) => ({
      label: project.projectCode ? project.projectCode : project.projectName,
      value: project.roi ?? 0,
      color: roiColor(project.roi ?? 0),
    }))
    .sort((a, b) => b.value - a.value)

  const lossBarItems = detailProjects
    .filter((project) => project.avoidableLosses > 0)
    .map((project) => ({
      label: project.projectCode ? project.projectCode : project.projectName,
      value: project.avoidableLosses,
      color: '#F09595',
    }))
    .sort((a, b) => b.value - a.value)

  const trend = latestTrend(detailProjects)

  return (
    <DesktopShell title="Performance por projeto" role="CFO">
      {error && <p className="text-[12px] text-[#791F1F] bg-[#FCEBEB] border border-[#F09595] rounded-[8px] p-3 mb-4">{error}</p>}
      {loading && <p className="text-[13px] text-gray-400 mb-4">Carregando performance financeira...</p>}

      {!selectedProject && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <MetricCard label="Projetos" value={projects.length} subtext="centros de analise" />
            <MetricCard label="Receita demo" value={fmt(totals.revenue)} subtext="contexto financeiro" />
            <MetricCard label="Lucro total" value={fmt(totals.profit)} subtext={`margem ${pct(totals.margin)}`} />
            <MetricCard label="Economia IA" value={fmt(totals.aiSavings)} subtext={`${fmt(totals.avoidableLosses)} evitaveis`} />
          </div>

          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-[14px] font-medium text-[#1a1a2e]">Projetos</p>
                <p className="text-[12px] text-gray-400 mt-1">Clique em um projeto para abrir a performance detalhada.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[760px]">
                <thead>
                  <tr className="border-b border-black/[0.06]">
                    {['Projeto', 'Receita demo', 'Custo', 'Lucro', 'Margem', 'ROI', 'Economia IA', 'Compliance', ''].map(h => (
                      <th key={h} className="text-left py-2.5 pr-3 text-[11px] uppercase tracking-wide text-gray-400 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr
                      key={project.projectId}
                      className="border-b border-black/[0.04] hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedProjectId(project.projectId)}
                    >
                      <td className="py-3 pr-3">
                        <p className="font-medium text-[#1a1a2e] whitespace-nowrap">{project.projectName}</p>
                        {project.projectCode && <p className="text-[11px] text-gray-400 mt-0.5">{project.projectCode}</p>}
                      </td>
                      <td className="py-3 pr-3 font-medium text-[#27500A] whitespace-nowrap">{fmt(project.revenue)}</td>
                      <td className="py-3 pr-3 whitespace-nowrap">{fmt(project.totalCost)}</td>
                      <td className="py-3 pr-3 whitespace-nowrap">{fmt(project.profit)}</td>
                      <td className="py-3 pr-3 whitespace-nowrap">{pct(project.margin)}</td>
                      <td className="py-3 pr-3">
                        <span className="font-medium" style={{ color: roiColor(project.roi ?? 0) }}>{multiple(project.roi)}</span>
                      </td>
                      <td className="py-3 pr-3 text-[#27500A] font-medium whitespace-nowrap">{fmt(project.aiSavings)}</td>
                      <td className="py-3 pr-3"><Badge variant={project.complianceRate >= 90 ? 'green' : project.complianceRate >= 70 ? 'amber' : 'red'}>{project.complianceRate}%</Badge></td>
                      <td className="py-3 text-right text-[12px] font-medium text-[#3C3489] whitespace-nowrap">Abrir</td>
                    </tr>
                  ))}
                  {!loading && projects.length === 0 && (
                    <tr><td colSpan={9} className="py-8 text-center text-gray-400">Nenhum projeto encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {selectedProject && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[12px] text-gray-400">Projeto selecionado</p>
              <h2 className="text-[20px] font-medium text-[#1a1a2e]">{selectedProject.projectName}</h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedProjectId(null)}
              className="rounded-[7px] border border-black/10 bg-white px-3 py-2 text-[13px] font-medium text-[#1a1a2e] hover:border-[#3C3489] hover:text-[#3C3489]"
            >
              Voltar para projetos
            </button>
          </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <MetricCard label="Receita demo" value={fmt(totals.revenue)} subtext="contexto por projeto" />
        <MetricCard label="Lucro" value={fmt(totals.profit)} subtext={`margem ${pct(totals.margin)}`} />
        <MetricCard label="ROI" value={multiple(totals.roi)} subtext="lucro sobre custo" />
        <MetricCard label="Economia IA" value={fmt(totals.aiSavings)} subtext={`${fmt(totals.avoidableLosses)} evitaveis`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
        <div className="space-y-4">
          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-1">ROI por projeto</p>
            <div className="flex flex-wrap gap-3 mb-3 text-[11px] text-gray-500">
              {[['#27500A','>2x'],['#97C459','1-2x'],['#EF9F27','0-1x'],['#F09595','negativo']].map(([c,l]) => (
                <span key={l} className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: c }} /> {l}
                </span>
              ))}
            </div>
            {roiBarItems.length > 0
              ? <HorizontalBarChart items={roiBarItems} formatValue={v => `${v.toFixed(1)}x`} />
              : <p className="text-[12px] text-gray-400 py-4">Nenhum projeto com dados financeiros ainda.</p>}
          </Card>

          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Projetos</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[720px]">
                <thead>
                  <tr className="border-b border-black/[0.06]">
                    {['Projeto', 'Receita', 'Custo', 'Lucro', 'Margem', 'ROI', 'IA', 'Compliance'].map(h => (
                      <th key={h} className="text-left py-2.5 pr-3 text-[11px] uppercase tracking-wide text-gray-400 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detailProjects.map((project) => (
                    <tr key={project.projectId} className="border-b border-black/[0.04] hover:bg-gray-50">
                      <td className="py-3 pr-3 font-medium text-[#1a1a2e] whitespace-nowrap">{project.projectName}</td>
                      <td className="py-3 pr-3 font-medium text-[#27500A] whitespace-nowrap">{fmt(project.revenue)}</td>
                      <td className="py-3 pr-3 whitespace-nowrap">{fmt(project.totalCost)}</td>
                      <td className="py-3 pr-3 whitespace-nowrap">{fmt(project.profit)}</td>
                      <td className="py-3 pr-3 whitespace-nowrap">{pct(project.margin)}</td>
                      <td className="py-3 pr-3">
                        <span className="font-medium" style={{ color: roiColor(project.roi ?? 0) }}>{multiple(project.roi)}</span>
                      </td>
                      <td className="py-3 pr-3 text-[#27500A] font-medium whitespace-nowrap">{fmt(project.aiSavings)}</td>
                      <td className="py-3"><Badge variant={project.complianceRate >= 90 ? 'green' : project.complianceRate >= 70 ? 'amber' : 'red'}>{project.complianceRate}%</Badge></td>
                    </tr>
                  ))}
                  {!loading && detailProjects.length === 0 && (
                    <tr><td colSpan={8} className="py-8 text-center text-gray-400">Nenhuma performance encontrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="rounded-[10px] border border-[#97C459] p-4 bg-[#EAF3DE]">
            <p className="text-[11px] font-medium text-[#27500A] uppercase tracking-wide mb-1">Ultima tendencia</p>
            <p className="text-[15px] font-medium text-[#27500A]">{trend?.month ?? 'Sem periodo'}</p>
            <p className="text-[32px] font-medium text-[#27500A] leading-none my-1">{fmt(trend?.profit ?? 0)}</p>
            <p className="text-[12px] text-[#27500A]/60">lucro demo no periodo</p>
            <div className="mt-3 space-y-1.5 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[#27500A]/60">Receita</span>
                <span className="font-medium text-[#27500A]">{fmt(trend?.revenue ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#27500A]/60">Custo</span>
                <span className="font-medium text-[#27500A]">{fmt(trend?.totalCost ?? 0)}</span>
              </div>
            </div>
          </div>

          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-2">Controle Reeva</p>
            <div className="space-y-2 text-[13px]">
              <div className="p-2.5 rounded-[7px] bg-[#EAF3DE] border border-[#97C459]">
                <p className="font-medium text-[#27500A]">Manter automacao onde houver baixo risco</p>
                <p className="text-[#27500A]/70">A taxa de conformidade e a economia IA ajudam a escolher politicas mais automaticas por projeto.</p>
              </div>
              <div className="p-2.5 rounded-[7px] bg-[#FCEBEB] border border-[#F09595]">
                <p className="font-medium text-[#791F1F]">Investigar perdas evitaveis</p>
                <p className="text-[#791F1F]/70">Projetos com perdas elevadas devem ter limites e categorias revisados antes do proximo quarter.</p>
              </div>
            </div>
          </Card>

          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Perdas evitaveis</p>
            {lossBarItems.length > 0
              ? <HorizontalBarChart items={lossBarItems} formatValue={v => fmt(v)} />
              : <p className="text-[12px] text-gray-400 py-4">Nenhuma perda evitavel detectada no periodo.</p>}
          </Card>
        </div>
      </div>
        </>
      )}
    </DesktopShell>
  )
}
