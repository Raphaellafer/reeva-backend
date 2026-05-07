import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTeamExpenses } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { categoryLabels, fmt, fmtDate } from '../../realData'
import { getToken } from '../../session'
import type { ExpenseResponse } from '../../types'

type AlertLevel = 'CRITICO' | 'MEDIO' | 'INFORMATIVO'

interface AlertItem {
  id: string
  level: AlertLevel
  title: string
  description: string
  expense: ExpenseResponse
}

const alertConfig: Record<AlertLevel, { variant: 'red' | 'amber' | 'blue'; label: string; bg: string; border: string }> = {
  CRITICO: { variant: 'red', label: 'Crítico', bg: 'bg-[#FCEBEB]', border: 'border-[#F09595]' },
  MEDIO: { variant: 'amber', label: 'Médio', bg: 'bg-[#FAEEDA]', border: 'border-[#FAC775]' },
  INFORMATIVO: { variant: 'blue', label: 'Informativo', bg: 'bg-[#E6F1FB]', border: 'border-[#85B7EB]' },
}

export function G03Alertas() {
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    getTeamExpenses(token, undefined, 0, 100)
      .then((page) => setExpenses(page.content))
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar alertas.'))
      .finally(() => setLoading(false))
  }, [])

  const alerts = useMemo(() => buildAlerts(expenses), [expenses])
  const criticalCount = alerts.filter((alert) => alert.level === 'CRITICO').length
  const mediumCount = alerts.filter((alert) => alert.level === 'MEDIO').length
  const valueAtRisk = alerts.reduce((sum, alert) => sum + (alert.expense.amount ?? 0), 0)

  return (
    <DesktopShell title="Alertas da IA" role="GERENTE">
      {error && <p className="mb-4 rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">{error}</p>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          {loading && <Card><p className="py-8 text-center text-[13px] text-gray-400">Carregando...</p></Card>}
          {!loading && alerts.length === 0 && (
            <Card className="py-10 text-center">
              <p className="text-[15px] font-medium text-[#1a1a2e]">Nenhum alerta aberto</p>
              <p className="mx-auto mt-1 max-w-[420px] text-[13px] text-gray-400">
                Quando uma nota fugir da política, tiver score baixo ou falhar na validação fiscal, ela aparecerá aqui.
              </p>
            </Card>
          )}

          {alerts.map((alert) => {
            const config = alertConfig[alert.level]
            return (
              <div key={alert.id} className={`rounded-[10px] border p-4 md:p-5 ${config.bg} ${config.border}`}>
                <div className="mb-3 flex flex-wrap items-start gap-3">
                  <Badge variant={config.variant} className="shrink-0 mt-0.5">{config.label}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-[#1a1a2e]">{alert.title}</p>
                    <p className="mt-0.5 text-[12px] text-gray-500">
                      {alert.expense.userName} · {alert.expense.projectName} · {fmtDate(alert.expense.expenseDate)}
                    </p>
                  </div>
                  <span className="text-[13px] font-medium text-[#1a1a2e]">{fmt(alert.expense.amount)}</span>
                </div>

                <p className="mb-3 text-[13px] text-gray-700">{alert.description}</p>

                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="gray">{categoryLabels[alert.expense.category]}</Badge>
                  {alert.expense.aiScore != null && <Badge variant={alert.expense.aiScore >= 80 ? 'green' : 'amber'}>Score {alert.expense.aiScore}</Badge>}
                  {alert.expense.policyCompliant === false && <Badge variant="red">Fora da política</Badge>}
                  {alert.expense.sefazStatus === 'INVALID' && <Badge variant="red">Fiscal inválida</Badge>}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link to="/gerente/aprovacoes" className="rounded-[7px] bg-[#1a1a2e] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#2a2a4e]">
                    Abrir fila
                  </Link>
                  <Link to="/gerente/notas" className="rounded-[7px] border border-black/10 px-3 py-1.5 text-[12px] font-medium text-[#1a1a2e] hover:bg-black/5">
                    Ver notas
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        <div className="space-y-4">
          <Card>
            <p className="mb-3 text-[14px] font-medium text-[#1a1a2e]">Resumo operacional</p>
            <div className="space-y-2 text-[13px]">
              <SummaryRow label="Alertas abertos" value={alerts.length} />
              <SummaryRow label="Críticos" value={criticalCount} danger={criticalCount > 0} />
              <SummaryRow label="Médios" value={mediumCount} />
              <SummaryRow label="Valor em análise" value={fmt(valueAtRisk)} />
            </div>
          </Card>

          <Card>
            <p className="mb-3 text-[14px] font-medium text-[#1a1a2e]">Critérios de alerta</p>
            <div className="space-y-3 text-[12px] text-gray-500">
              <p><strong className="text-[#1a1a2e]">Crítico:</strong> política violada ou validação fiscal inválida.</p>
              <p><strong className="text-[#1a1a2e]">Médio:</strong> score baixo, revisão manual ou motivo de política pendente.</p>
              <p><strong className="text-[#1a1a2e]">Informativo:</strong> falha de leitura ou correção solicitada ao funcionário.</p>
            </div>
          </Card>
        </div>
      </div>
    </DesktopShell>
  )
}

function buildAlerts(expenses: ExpenseResponse[]): AlertItem[] {
  return expenses
    .map((expense): AlertItem | null => {
      if (expense.policyCompliant === false || expense.sefazStatus === 'INVALID') {
        return {
          id: `${expense.id}-critical`,
          level: 'CRITICO',
          title: 'Despesa exige decisão cuidadosa',
          description: expense.policyViolationReason
            ?? expense.sefazValidationMessage
            ?? 'A nota saiu dos critérios automáticos de conformidade.',
          expense,
        }
      }

      if ((expense.aiScore ?? 100) < 80 || expense.manualReviewReason || expense.policyViolationReason || expense.status === 'PENDING_REVIEW') {
        return {
          id: `${expense.id}-medium`,
          level: 'MEDIO',
          title: 'Revisão manual recomendada',
          description: expense.manualReviewReason
            ?? expense.policyViolationReason
            ?? expense.aiDecisionReason
            ?? 'A nota tem sinais que merecem validação do gestor.',
          expense,
        }
      }

      if (expense.status === 'OCR_FAILED' || expense.status === 'NEEDS_REVISION') {
        return {
          id: `${expense.id}-info`,
          level: 'INFORMATIVO',
          title: 'Aguardando correção do funcionário',
          description: expense.aiAnalysis ?? 'A nota precisa de uma nova leitura ou complementação de dados.',
          expense,
        }
      }

      return null
    })
    .filter(Boolean) as AlertItem[]
}

function SummaryRow({ label, value, danger = false }: { label: string; value: React.ReactNode; danger?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${danger ? 'text-[#791F1F]' : 'text-[#1a1a2e]'}`}>{value}</span>
    </div>
  )
}
