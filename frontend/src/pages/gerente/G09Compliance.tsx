import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCfoCompliance } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { fmt } from '../../data/mock'
import { getToken, getUserName } from '../../session'

function riskVariant(level: string): 'red' | 'amber' | 'green' {
  if (level === 'Alto') return 'red'
  if (level === 'Medio') return 'amber'
  return 'green'
}

const categoryLabels: Record<string, string> = {
  FOOD: 'Alimentacao',
  TRANSPORT: 'Transporte',
  LODGING: 'Hospedagem',
  PURCHASE: 'Compras',
  HARDWARE: 'Hardware',
}

export function G09Compliance() {
  const token = getToken()
  const managerName = getUserName()

  const { data, isLoading, error } = useQuery({
    queryKey: ['cfo-compliance'],
    queryFn: () => getCfoCompliance(token!),
    enabled: !!token,
  })

  // Filtra apenas os funcionários gerenciados por este gestor
  const myEmployees = useMemo(
    () => (data?.riskyEmployees ?? []).filter((e) => e.managerName === managerName),
    [data, managerName]
  )

  const teamExpenseCount = useMemo(
    () => myEmployees.reduce((s, e) => s + e.expenseCount, 0),
    [myEmployees]
  )

  const teamViolationCount = useMemo(
    () => myEmployees.reduce((s, e) => s + e.policyViolationCount, 0),
    [myEmployees]
  )

  const teamAvoidedAmount = useMemo(
    () => myEmployees.reduce((s, e) => s + e.avoidedAmount, 0),
    [myEmployees]
  )

  const teamComplianceRate = useMemo(() => {
    if (teamExpenseCount === 0) return 100
    return Math.round(((teamExpenseCount - teamViolationCount) / teamExpenseCount) * 100)
  }, [teamExpenseCount, teamViolationCount])

  const recidivistCount = useMemo(
    () => myEmployees.filter((e) => e.policyViolationCount > 1).length,
    [myEmployees]
  )

  // Compliance por departamento (apenas dos funcionários do gestor)
  const deptCompliance = useMemo(() => {
    const map = new Map<string, { violations: number; total: number }>()
    for (const emp of myEmployees) {
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
  }, [myEmployees])

  return (
    <DesktopShell title="Compliance da equipe" role="GERENTE">
      {error && (
        <Card className="mb-4 border-[#F09595] bg-[#FCEBEB]">
          <p className="text-[13px] text-[#791F1F]">{error instanceof Error ? error.message : 'Falha ao carregar compliance.'}</p>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Notas da equipe" value={isLoading ? '...' : teamExpenseCount} subtext={`${myEmployees.length} membro(s)`} />
        <MetricCard label="Compliance" value={isLoading ? '...' : `${teamComplianceRate}%`} subtext="taxa de conformidade" trend={teamComplianceRate >= 90 ? 'up' : 'down'} trendValue={teamComplianceRate >= 90 ? 'bom' : 'atencao'} />
        <MetricCard label="Violacoes" value={isLoading ? '...' : teamViolationCount} subtext="politicas infringidas" trend={teamViolationCount > 0 ? 'down' : undefined} trendValue={teamViolationCount > 0 ? 'atencao' : undefined} />
        <MetricCard label="Valor evitado" value={isLoading ? '...' : fmt(teamAvoidedAmount)} subtext={recidivistCount > 0 ? `${recidivistCount} reincidente(s)` : 'sem reincidencias'} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Tabela de funcionários */}
        <div className="space-y-4">
          <Card>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-medium text-[#1a1a2e]">Funcionarios da equipe</p>
                <p className="mt-1 text-[12px] text-gray-400">Ordenado por valor evitado — identifica quem precisa de atencao.</p>
              </div>
              <Badge variant={myEmployees.length > 0 ? 'blue' : 'gray'}>{myEmployees.length} membro(s)</Badge>
            </div>
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
                  {[...myEmployees]
                    .sort((a, b) => b.avoidedAmount - a.avoidedAmount)
                    .map((e) => (
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
                        <td className="py-3"><Badge variant={riskVariant(e.riskLevel)}>{e.riskLevel}</Badge></td>
                      </tr>
                    ))}
                  {!isLoading && myEmployees.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-[13px] text-gray-400">
                        Nenhum funcionario da equipe com notas no periodo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Reincidentes */}
          {recidivistCount > 0 && (
            <Card className="border-[#FAC775] bg-[#FAEEDA]">
              <p className="mb-3 text-[13px] font-medium text-[#633806]">Reincidentes — 2 ou mais violacoes</p>
              <div className="space-y-2">
                {myEmployees
                  .filter((e) => e.policyViolationCount > 1)
                  .sort((a, b) => b.policyViolationCount - a.policyViolationCount)
                  .map((e) => (
                    <div key={e.employeeId} className="flex items-center justify-between gap-3 rounded-[8px] border border-[#FAC775] bg-white p-2.5">
                      <div>
                        <p className="text-[12px] font-medium text-[#1a1a2e]">{e.employeeName}</p>
                        <p className="text-[11px] text-gray-500">{e.departmentName ?? '-'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-medium text-[#633806]">{e.policyViolationCount} violacoes</p>
                        <p className="text-[11px] text-gray-500">{fmt(e.avoidedAmount)} evitado</p>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </div>

        {/* Compliance por departamento + categorias sensíveis */}
        <div className="space-y-4">
          <Card>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-medium text-[#1a1a2e]">Compliance por departamento</p>
                <p className="mt-1 text-[12px] text-gray-400">Pior departamento no topo.</p>
              </div>
              <Badge variant={deptCompliance.length > 0 ? 'blue' : 'gray'}>{deptCompliance.length} depto(s)</Badge>
            </div>
            <div className="space-y-3">
              {deptCompliance.map((dept) => (
                <div key={dept.label}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-[12px] font-medium text-[#1a1a2e]">{dept.label}</p>
                    <Badge variant={dept.compliance >= 90 ? 'green' : dept.compliance >= 70 ? 'amber' : 'red'}>{dept.compliance}%</Badge>
                  </div>
                  <div className="h-[7px] overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${dept.compliance}%`,
                        background: dept.compliance >= 90 ? '#97C459' : dept.compliance >= 70 ? '#FAC775' : '#F09595',
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400">{dept.violations} violacao(oes) em {dept.total} nota(s)</p>
                </div>
              ))}
              {!isLoading && deptCompliance.length === 0 && (
                <p className="text-[13px] text-gray-400">Sem dados de departamento.</p>
              )}
            </div>
          </Card>

          <Card>
            <p className="mb-3 text-[14px] font-medium text-[#1a1a2e]">Categorias sensiveis da empresa</p>
            <div className="space-y-2">
              {(data?.riskyCategories ?? []).slice(0, 5).map((c) => (
                <div key={c.category} className="flex items-center justify-between gap-3 rounded-[8px] border border-black/[0.06] p-2.5">
                  <div>
                    <p className="text-[12px] font-medium text-[#1a1a2e]">{categoryLabels[c.category] ?? c.category}</p>
                    <p className="text-[11px] text-gray-500">{c.expenseCount} nota(s) · {fmt(c.avoidedAmount)} evitado</p>
                  </div>
                  <Badge variant={riskVariant(c.riskLevel)}>{c.riskLevel}</Badge>
                </div>
              ))}
              {!isLoading && (data?.riskyCategories.length ?? 0) === 0 && (
                <p className="text-[13px] text-gray-400">Sem categorias em risco.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </DesktopShell>
  )
}
