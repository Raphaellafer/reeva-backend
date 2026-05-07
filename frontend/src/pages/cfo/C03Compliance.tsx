import React, { useEffect, useMemo, useState } from 'react'
import { getCfoCompliance } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { fmt } from '../../data/mock'
import { getToken } from '../../session'
import type { CfoComplianceResponse } from '../../types'
import { categoryLabels, riskVariantByLevel } from './cfoUtils'
import { ExecutiveBarList } from './cfoVisuals'

export function C03Compliance() {
  const [data, setData] = useState<CfoComplianceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return

    setLoading(true)
    getCfoCompliance(token)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar compliance.'))
      .finally(() => setLoading(false))
  }, [])

  const employeeImpact = useMemo(
    () => [...(data?.riskyEmployees ?? [])]
      .sort((a, b) => (b.avoidedAmount - a.avoidedAmount) || (b.riskScore - a.riskScore))
      .slice(0, 6)
      .map((e) => ({
        label: e.employeeName,
        value: e.avoidedAmount,
        secondaryValue: e.totalAmount,
        secondaryLabel: 'Gasto',
        color: e.riskLevel === 'Alto' ? '#F09595' : e.riskLevel === 'Medio' ? '#FAC775' : '#97C459',
        description: `${e.expenseCount} nota(s), ${e.policyViolationCount} violacao(oes)`,
        badge: <Badge variant={riskVariantByLevel(e.riskLevel)}>{e.riskLevel}</Badge>,
      })),
    [data]
  )

  const categoryImpact = useMemo(
    () => [...(data?.riskyCategories ?? [])]
      .sort((a, b) => (b.avoidedAmount - a.avoidedAmount) || (b.riskScore - a.riskScore))
      .map((c) => ({
        label: categoryLabels[c.category] ?? c.category,
        value: c.avoidedAmount,
        secondaryValue: c.totalAmount,
        secondaryLabel: 'Gasto',
        color: c.riskLevel === 'Alto' ? '#F09595' : c.riskLevel === 'Medio' ? '#FAC775' : '#97C459',
        description: `${c.expenseCount} nota(s), ${c.policyViolationCount} violacao(oes)`,
        badge: <Badge variant={riskVariantByLevel(c.riskLevel)}>{c.riskScore}</Badge>,
      })),
    [data]
  )

  // Compliance por departamento — calculado a partir dos dados de funcionários
  const deptCompliance = useMemo(() => {
    const map = new Map<string, { violations: number; total: number }>()
    for (const emp of data?.riskyEmployees ?? []) {
      const dept = emp.departmentName ?? 'Sem departamento'
      const existing = map.get(dept) ?? { violations: 0, total: 0 }
      map.set(dept, {
        violations: existing.violations + emp.policyViolationCount,
        total: existing.total + emp.expenseCount,
      })
    }
    return Array.from(map.entries())
      .map(([dept, stats]) => ({
        label: dept,
        compliance: stats.total > 0 ? Math.round(((stats.total - stats.violations) / stats.total) * 100) : 100,
        violations: stats.violations,
        total: stats.total,
      }))
      .sort((a, b) => a.compliance - b.compliance)
  }, [data])

  // Funcionários com mais de uma violação no período
  const recidivistCount = useMemo(
    () => (data?.riskyEmployees ?? []).filter((e) => e.policyViolationCount > 1).length,
    [data]
  )

  const deptBarItems = useMemo(
    () => deptCompliance.map((d) => ({
      label: d.label,
      value: d.compliance,
      color: d.compliance >= 90 ? '#97C459' : d.compliance >= 70 ? '#FAC775' : '#F09595',
      description: `${d.violations} violacao(oes) em ${d.total} nota(s)`,
      badge: <Badge variant={d.compliance >= 90 ? 'green' : d.compliance >= 70 ? 'amber' : 'red'}>{d.compliance}%</Badge>,
    })),
    [deptCompliance]
  )

  return (
    <DesktopShell title="Compliance financeiro" role="CFO">
      {error && (
        <Card className="mb-4 border-[#F09595] bg-[#FCEBEB]">
          <p className="text-[13px] text-[#791F1F]">{error}</p>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Notas analisadas" value={loading ? '...' : data?.processedExpenseCount ?? 0} />
        <MetricCard label="Compliance geral" value={loading ? '...' : `${data?.complianceRate ?? 0}%`} />
        <MetricCard label="Duplicadas rejeitadas" value={loading ? '...' : data?.duplicateRejectedCount ?? 0} subtext="bloqueio antifraude" />
        <MetricCard
          label="Reincidentes"
          value={loading ? '...' : recidivistCount}
          subtext={recidivistCount > 0 ? 'funcionarios c/ 2+ violacoes' : 'sem reincidencias no periodo'}
          trend={recidivistCount > 0 ? 'down' : undefined}
          trendValue={recidivistCount > 0 ? 'atencao' : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-medium text-[#1a1a2e]">Prioridade por impacto financeiro</p>
                <p className="mt-1 text-[12px] text-gray-400">Ordenado por valor evitado, nao apenas por quantidade de notas.</p>
              </div>
              <Badge variant="purple">investigacao CFO</Badge>
            </div>
            <ExecutiveBarList
              items={employeeImpact}
              formatValue={(value) => fmt(value)}
              emptyText="Sem funcionarios com impacto financeiro no periodo."
            />
          </Card>

          <Card>
            <p className="mb-3 text-[14px] font-medium text-[#1a1a2e]">Funcionarios por risco real</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-[13px]">
                <thead>
                  <tr className="border-b border-black/[0.06]">
                    {['Funcionario', 'Depto', 'Notas', 'Violacoes', 'Evitado', 'Risco'].map((header) => (
                      <th key={header} className="py-2.5 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.riskyEmployees ?? []).map((e) => (
                    <tr key={e.employeeId} className="border-b border-black/[0.04] hover:bg-gray-50">
                      <td className="whitespace-nowrap py-3 pr-3 font-medium text-[#1a1a2e]">{e.employeeName}</td>
                      <td className="py-3 pr-3 text-gray-500">{e.departmentName ?? '-'}</td>
                      <td className="py-3 pr-3">{e.expenseCount}</td>
                      <td className="py-3 pr-3">
                        {e.policyViolationCount > 0
                          ? <span className="font-medium text-[#633806]">{e.policyViolationCount}</span>
                          : <span className="text-gray-400">0</span>}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-3 font-medium text-[#633806]">{fmt(e.avoidedAmount)}</td>
                      <td className="py-3">
                        <Badge variant={riskVariantByLevel(e.riskLevel)}>{e.riskLevel}</Badge>
                      </td>
                    </tr>
                  ))}
                  {!loading && (data?.riskyEmployees.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={6} className="py-5 text-[13px] text-gray-400">Sem funcionarios com notas no periodo.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-medium text-[#1a1a2e]">Compliance por departamento</p>
                <p className="mt-1 text-[12px] text-gray-400">Pior departamento no topo. Baseado em violacoes dos colaboradores.</p>
              </div>
              <Badge variant={deptCompliance.length > 0 ? 'blue' : 'gray'}>{deptCompliance.length} depto(s)</Badge>
            </div>
            <ExecutiveBarList
              items={deptBarItems}
              formatValue={(value) => `${value}%`}
              emptyText="Sem dados de departamento no periodo."
            />
          </Card>

          <Card>
            <p className="mb-3 text-[14px] font-medium text-[#1a1a2e]">Categorias sensiveis</p>
            <ExecutiveBarList
              items={categoryImpact}
              formatValue={(value) => fmt(value)}
              emptyText="Sem categorias no periodo."
            />
          </Card>

          <Card>
            <p className="mb-3 text-[14px] font-medium text-[#1a1a2e]">Projetos em atencao</p>
            <div className="space-y-2 text-[13px]">
              {(data?.riskyProjects ?? []).slice(0, 5).map((p) => (
                <div key={p.projectId} className="flex items-center justify-between gap-3 rounded-[8px] border border-black/[0.06] p-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-[#1a1a2e]">{p.projectName}</p>
                    <p className="text-[11px] text-gray-500">{p.expenseCount} notas · {fmt(p.avoidedAmount)} evitado</p>
                  </div>
                  <Badge variant={riskVariantByLevel(p.riskLevel)}>{p.riskLevel}</Badge>
                </div>
              ))}
              {!loading && (data?.riskyProjects.length ?? 0) === 0 && (
                <p className="text-[13px] text-gray-400">Sem projetos com risco calculado.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </DesktopShell>
  )
}
