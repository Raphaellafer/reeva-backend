import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { getCfoProjectPerformance } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { fmt } from '../../data/mock'
import { getToken } from '../../session'
import type { ProjectPerformanceResponse } from '../../types'
import { formatMonthLabel } from './cfoUtils'
import { MultiSeriesTrendChart } from './cfoVisuals'

function buildTrend(project: ProjectPerformanceResponse | null) {
  if (!project) return []
  return project.monthlyTrend.map((item) => ({
    label: formatMonthLabel(item.month),
    values: {
      submitted: item.submittedAmount,
      reimbursed: item.reimbursableExpenses,
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
  const estimatedProjectRevenue = project?.revenue ?? 0
  const submittedAmount = project?.totalSubmittedAmount ?? 0
  const reimbursedAmount = project?.reimbursableExpenses ?? 0
  const reimbursedRatio = submittedAmount > 0
    ? Math.round((reimbursedAmount / submittedAmount) * 100)
    : 0
  const reimbursementRevenueRatio = estimatedProjectRevenue > 0
    ? (reimbursedAmount / estimatedProjectRevenue) * 100
    : 0
  const reimbursementRevenueAlert = reimbursementRevenueRatio > 5

  const forecast = useMemo(() => {
    const rows = project?.monthlyTrend ?? []
    if (rows.length === 0) return null
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const currentData = rows.find((item) => item.month === currentMonth)
    if (!currentData) return null
    const dayOfMonth = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const remainingDays = daysInMonth - dayOfMonth
    const projected = currentData.reimbursableExpenses + (currentData.reimbursableExpenses / dayOfMonth) * remainingDays
    return {
      current: currentData.reimbursableExpenses,
      projected,
      daysRemaining: remainingDays,
      label: formatMonthLabel(currentMonth),
    }
  }, [project])

  return (
    <DesktopShell title={project ? `Dashboard - ${project.projectName}` : 'Dashboard do projeto'} role="CFO">
      {error && <p className="mb-4 rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">{error instanceof Error ? error.message : 'Falha ao carregar performance.'}</p>}

      {!isLoading && !project && (
        <Card className="mb-4 border-[#FAC775] bg-[#FAEEDA]">
          <p className="text-[13px] text-[#633806]">Projeto nao encontrado. Volte ao dashboard e abra um projeto da lista.</p>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard label="Receita estimada do projeto" value={isLoading ? '...' : fmt(estimatedProjectRevenue)} subtext="definida na criacao do projeto" />
        <MetricCard label="Total ja reembolsado" value={isLoading ? '...' : fmt(reimbursedAmount)} subtext={`${reimbursedRatio}% do total enviado`} />
        <MetricCard
          label="Reembolso sobre receita"
          value={isLoading ? '...' : `${reimbursementRevenueRatio.toFixed(1)}%`}
          subtext={reimbursementRevenueAlert ? 'acima dos 5% esperados' : 'dentro dos 5% esperados'}
          className={reimbursementRevenueAlert ? 'border-[#F09595] bg-[#FCEBEB]' : ''}
        />
        <MetricCard label="Economia pela IA" value={isLoading ? '...' : fmt(project?.aiSavings ?? 0)} subtext={`compliance ${project?.complianceRate ?? 0}%`} />
        <MetricCard label="Percentual ja reembolsado" value={isLoading ? '...' : `${reimbursedRatio}%`} subtext="sobre o total enviado para reembolso" />
      </div>

      {reimbursementRevenueAlert && (
        <Card className="mb-4 border-[#F09595] bg-[#FCEBEB]">
          <p className="text-[13px] font-medium text-[#791F1F]">
            Alerta: o gasto em reembolso ultrapassou os 5% em media esperados para este projeto.
          </p>
          <p className="mt-1 text-[12px] text-[#791F1F]/70">
            Total ja reembolsado representa {reimbursementRevenueRatio.toFixed(1)}% da receita estimada do projeto.
          </p>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-medium text-[#1a1a2e]">Evolucao mensal dos reembolsos</p>
              <p className="mt-1 text-[12px] text-gray-400">Enviado vs reembolsado por mes do projeto.</p>
            </div>
            <Badge variant={reimbursedRatio >= 80 ? 'green' : 'amber'}>{reimbursedRatio}% reembolsado</Badge>
          </div>
          <MultiSeriesTrendChart
            points={trend}
            series={[
              { key: 'submitted', label: 'Enviado', color: '#85B7EB' },
              { key: 'reimbursed', label: 'Reembolsado', color: '#97C459' },
            ]}
            formatValue={(value) => fmt(value)}
            emptyText="Nenhum mes com reembolso pago."
          />
        </Card>

        <div className="rounded-[10px] border border-[#97C459] bg-[#EAF3DE] p-4">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#27500A]">Previsao de fechamento do mes</p>
          <p className="text-[15px] font-medium text-[#27500A]">{forecast?.label ?? 'Periodo atual'}</p>
          <p className="my-1 text-[32px] font-medium leading-none text-[#27500A]">
            {isLoading ? '...' : fmt(forecast?.projected ?? reimbursedAmount)}
          </p>
          <p className="text-[12px] text-[#27500A]/60">{forecast ? 'projecao com base no ritmo atual do projeto' : 'total ja reembolsado no projeto'}</p>
          <div className="mt-3 space-y-1.5 text-[12px]">
            <div className="flex justify-between"><span className="text-[#27500A]/60">Reembolsado ate hoje</span><span className="font-medium text-[#27500A]">{fmt(forecast?.current ?? reimbursedAmount)}</span></div>
            {forecast && <div className="flex justify-between"><span className="text-[#27500A]/60">Dias restantes no mes</span><span className="font-medium text-[#27500A]">{forecast.daysRemaining}</span></div>}
            <div className="flex justify-between"><span className="text-[#27500A]/60">Reembolso/receita</span><span className={`font-medium ${reimbursementRevenueAlert ? 'text-[#791F1F]' : 'text-[#27500A]'}`}>{reimbursementRevenueRatio.toFixed(1)}%</span></div>
            <div className="flex justify-between"><span className="text-[#27500A]/60">Compliance</span><span className="font-medium text-[#27500A]">{project?.complianceRate ?? 0}%</span></div>
          </div>
        </div>
      </div>
    </DesktopShell>
  )
}
