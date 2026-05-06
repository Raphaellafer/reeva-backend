import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCfoOverview } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { HorizontalBarChart } from '../../components/ui/HorizontalBarChart'
import { MetricCard } from '../../components/ui/MetricCard'
import { fmt } from '../../data/mock'
import { getToken } from '../../session'
import type { CfoOverviewResponse, ExpenseCategory } from '../../types'

const categoryLabels: Record<ExpenseCategory, string> = {
  FOOD: 'Alimentacao',
  TRANSPORT: 'Transporte',
  LODGING: 'Hospedagem',
  PURCHASE: 'Compras',
  HARDWARE: 'Hardware',
}

const colors = ['#97C459', '#85B7EB', '#AFA9EC', '#FAC775', '#F09595']

function riskVariant(score: number) {
  if (score >= 70) return 'red' as const
  if (score >= 35) return 'amber' as const
  return 'green' as const
}

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

  return (
    <DesktopShell title="Dashboard executivo" role="CFO">
      {error && (
        <Card className="mb-4">
          <p className="text-[13px] text-[#791F1F]">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <MetricCard label="Total reembolsado" value={loading ? '...' : fmt(overview?.totalReimbursedAmount ?? 0)} />
        <MetricCard label="Economia pela IA" value={loading ? '...' : fmt(overview?.aiSavings ?? 0)} subtext="politica, duplicidade e automacao" />
        <MetricCard label="Perdas evitaveis" value={loading ? '...' : fmt(overview?.avoidableLosses ?? 0)} subtext={`${overview?.policyViolationCount ?? 0} violacoes`} />
        <MetricCard label="Compliance geral" value={loading ? '...' : `${overview?.complianceRate ?? 0}%`} subtext={`${overview?.processedExpenseCount ?? 0} notas analisadas`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4">
          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Gasto real por categoria</p>
            {(overview?.categorySpend.length ?? 0) > 0 ? (
              <HorizontalBarChart
                items={(overview?.categorySpend ?? []).map((item, index) => ({
                  label: categoryLabels[item.category] ?? item.category,
                  value: item.amount,
                  color: colors[index % colors.length],
                }))}
                formatValue={(value) => fmt(value)}
              />
            ) : (
              <p className="text-[13px] text-gray-400">Ainda nao ha notas no periodo analisado.</p>
            )}
          </Card>

          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Projetos por risco em reembolso</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[560px]">
                <thead>
                  <tr className="border-b border-black/[0.06]">
                    {['Projeto', 'Reembolsado', 'Perda evitavel', 'Compliance', 'Risco'].map((header) => (
                      <th key={header} className="text-left py-2.5 pr-3 text-[11px] uppercase tracking-wide text-gray-400 font-medium">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(overview?.projectRiskRanking ?? []).map((project) => (
                    <tr key={project.projectId} className="border-b border-black/[0.04] hover:bg-gray-50">
                      <td className="py-3 pr-3 font-medium text-[#1a1a2e] whitespace-nowrap">{project.projectName}</td>
                      <td className="py-3 pr-3 font-medium whitespace-nowrap">{fmt(project.reimbursedAmount)}</td>
                      <td className="py-3 pr-3 font-medium text-[#633806] whitespace-nowrap">{fmt(project.avoidableLosses)}</td>
                      <td className="py-3 pr-3">
                        <Badge variant={project.complianceRate >= 95 ? 'green' : project.complianceRate >= 80 ? 'amber' : 'red'}>
                          {project.complianceRate}%
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge variant={riskVariant(project.riskScore)}>{project.riskScore}</Badge>
                      </td>
                    </tr>
                  ))}
                  {!loading && (overview?.projectRiskRanking.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={5} className="py-5 text-[13px] text-gray-400">Nenhum projeto com reembolso no periodo.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="rounded-[10px] border border-[#AFA9EC] p-4" style={{ background: '#EEEDFE' }}>
            <p className="text-[11px] font-medium text-[#3C3489] uppercase tracking-wide mb-1">ROI corporativo</p>
            <p className="text-[28px] font-medium text-[#3C3489] leading-tight">Projetos</p>
            <p className="text-[12px] text-[#3C3489]/70 mt-1">Receita demo + reembolsos reais para analisar performance por projeto.</p>
            <Link to="/cfo/roi" className="mt-3 block text-[12px] font-medium text-[#3C3489]">
              Ver projetos de ROI
            </Link>
          </div>

          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Distribuicao por status</p>
            <div className="space-y-2 text-[13px]">
              {(overview?.statusDistribution ?? []).map((item) => (
                <div key={item.status} className="flex justify-between gap-3">
                  <span className="text-gray-500">{item.status}</span>
                  <span className="font-medium text-[#1a1a2e]">{item.count}</span>
                </div>
              ))}
              {!loading && (overview?.statusDistribution.length ?? 0) === 0 && (
                <p className="text-[13px] text-gray-400">Sem notas processadas.</p>
              )}
            </div>
          </Card>

          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Recomendacoes Reeva</p>
            <div className="space-y-3">
              {(overview?.recommendations ?? []).map((item) => (
                <div key={`${item.type}-${item.title}`} className="rounded-[7px] border border-black/[0.06] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-medium text-[#1a1a2e]">{item.title}</p>
                    <Badge variant={item.severity === 'HIGH' ? 'red' : item.severity === 'MEDIUM' ? 'amber' : 'green'}>
                      {item.severity}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">{item.description}</p>
                  <p className="text-[11px] text-gray-700 mt-2">{item.action}</p>
                </div>
              ))}
              {!loading && (overview?.recommendations.length ?? 0) === 0 && (
                <p className="text-[13px] text-gray-400">Sem recomendacoes criticas no periodo.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </DesktopShell>
  )
}
