import React, { useEffect, useState } from 'react'
import { getCfoCompliance } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { fmt } from '../../data/mock'
import { getToken } from '../../session'
import type { CfoComplianceResponse, ExpenseCategory } from '../../types'

const categoryLabels: Record<ExpenseCategory, string> = {
  FOOD: 'Alimentacao',
  TRANSPORT: 'Transporte',
  LODGING: 'Hospedagem',
  PURCHASE: 'Compras',
  HARDWARE: 'Hardware',
}

function riskVariant(level: string) {
  if (level === 'Alto') return 'red' as const
  if (level === 'Medio') return 'amber' as const
  return 'green' as const
}

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

  return (
    <DesktopShell title="Compliance financeiro" role="CFO">
      {error && (
        <Card className="mb-4">
          <p className="text-[13px] text-[#791F1F]">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <MetricCard label="Notas analisadas" value={loading ? '...' : data?.processedExpenseCount ?? 0} />
        <MetricCard label="Compliance geral" value={loading ? '...' : `${data?.complianceRate ?? 0}%`} />
        <MetricCard label="Duplicadas rejeitadas" value={loading ? '...' : data?.duplicateRejectedCount ?? 0} subtext="bloqueio antifraude" />
        <MetricCard label="Perda evitada" value={loading ? '...' : fmt(data?.totalAvoidedAmount ?? 0)} subtext={`${data?.policyViolationCount ?? 0} violacoes`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
        <div className="space-y-4">
          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Funcionarios por risco real</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[720px]">
                <thead>
                  <tr className="border-b border-black/[0.06]">
                    {['Funcionario', 'Depto', 'Gestor', 'Notas', 'Violacoes', 'Duplicadas', 'OCR baixo', 'Evitado', 'Risco'].map((header) => (
                      <th key={header} className="text-left py-2.5 pr-3 text-[11px] uppercase tracking-wide text-gray-400 font-medium">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.riskyEmployees ?? []).map((employee) => (
                    <tr key={employee.employeeId} className="border-b border-black/[0.04] hover:bg-gray-50">
                      <td className="py-3 pr-3 font-medium text-[#1a1a2e] whitespace-nowrap">{employee.employeeName}</td>
                      <td className="py-3 pr-3 text-gray-500">{employee.departmentName ?? '-'}</td>
                      <td className="py-3 pr-3 text-gray-500">{employee.managerName ?? '-'}</td>
                      <td className="py-3 pr-3">{employee.expenseCount}</td>
                      <td className="py-3 pr-3">{employee.policyViolationCount}</td>
                      <td className="py-3 pr-3">{employee.duplicateRejectedCount}</td>
                      <td className="py-3 pr-3">{employee.lowOcrConfidenceCount}</td>
                      <td className="py-3 pr-3 font-medium text-[#633806] whitespace-nowrap">{fmt(employee.avoidedAmount)}</td>
                      <td className="py-3">
                        <Badge variant={riskVariant(employee.riskLevel)}>{employee.riskLevel}</Badge>
                      </td>
                    </tr>
                  ))}
                  {!loading && (data?.riskyEmployees.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={9} className="py-5 text-[13px] text-gray-400">Sem funcionarios com notas no periodo.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Projetos em atencao</p>
            <div className="space-y-3">
              {(data?.riskyProjects ?? []).slice(0, 5).map((project) => (
                <div key={project.projectId} className="rounded-[7px] border border-black/[0.06] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-medium text-[#1a1a2e] truncate">{project.projectName}</p>
                    <Badge variant={riskVariant(project.riskLevel)}>{project.riskLevel}</Badge>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">{project.expenseCount} notas · {fmt(project.totalAmount)}</p>
                  <p className="text-[11px] text-[#633806] mt-1">Evitado: {fmt(project.avoidedAmount)}</p>
                </div>
              ))}
              {!loading && (data?.riskyProjects.length ?? 0) === 0 && (
                <p className="text-[13px] text-gray-400">Sem projetos com risco calculado.</p>
              )}
            </div>
          </Card>

          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Categorias sensiveis</p>
            <div className="space-y-2 text-[13px]">
              {(data?.riskyCategories ?? []).map((category) => (
                <div key={category.category} className="flex items-center justify-between gap-3 border-b border-black/[0.04] last:border-0 py-2">
                  <div>
                    <p className="font-medium text-[#1a1a2e]">{categoryLabels[category.category] ?? category.category}</p>
                    <p className="text-[11px] text-gray-400">{category.expenseCount} notas · {category.policyViolationCount} violacoes</p>
                  </div>
                  <Badge variant={riskVariant(category.riskLevel)}>{category.riskScore}</Badge>
                </div>
              ))}
              {!loading && (data?.riskyCategories.length ?? 0) === 0 && (
                <p className="text-[13px] text-gray-400">Sem categorias no periodo.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </DesktopShell>
  )
}
