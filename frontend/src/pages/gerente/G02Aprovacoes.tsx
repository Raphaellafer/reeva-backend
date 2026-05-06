import React, { useEffect, useState } from 'react'
import { approveExpense, getTeamExpenses, rejectExpense, requestRevision } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { ExpenseDetailPanel } from '../../components/manager/ExpenseDetailPanel'
import { fmt } from '../../realData'
import { getToken } from '../../session'
import type { ExpenseResponse } from '../../types'

const reviewable = ['SUBMITTED', 'PENDING_REVIEW']

function risk(expense: ExpenseResponse): { label: string; variant: 'green' | 'amber' | 'red' } {
  if (expense.policyCompliant === false || expense.sefazStatus === 'INVALID') return { label: 'Alto', variant: 'red' }
  if ((expense.aiScore ?? 0) < 80 || expense.status === 'PENDING_REVIEW') return { label: 'Medio', variant: 'amber' }
  return { label: 'Baixo', variant: 'green' }
}

export function G02Aprovacoes() {
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([])
  const [selected, setSelected] = useState<ExpenseResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const token = getToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const page = await getTeamExpenses(token, undefined, 0, 50)
      const rows = page.content.filter((expense) => reviewable.includes(expense.status))
      setExpenses(rows)
      setSelected((current) => rows.find((item) => item.id === current?.id) ?? rows[0] ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar aprovacoes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function runAction(kind: 'approve' | 'reject' | 'revision', expenseId: string) {
    const token = getToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      if (kind === 'approve') await approveExpense(token, expenseId)
      if (kind === 'reject') await rejectExpense(token, expenseId, 'Recusado pelo gestor')
      if (kind === 'revision') await requestRevision(token, expenseId, 'Corrigir informacoes da nota')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Acao nao concluida.')
      setLoading(false)
    }
  }

  const token = getToken()

  return (
    <DesktopShell title="Fila de aprovacoes" role="GERENTE">
      {error && <p className="text-[12px] text-[#791F1F] bg-[#FCEBEB] border border-[#F09595] rounded-[8px] p-3 mb-4">{error}</p>}
      <div className="flex flex-col xl:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[700px]">
                <thead>
                  <tr className="border-b border-black/[0.06]">
                    {['Funcionario', 'Projeto', 'Nota', 'Valor', 'Status', 'Risco', 'Acoes'].map((header) => (
                      <th key={header} className="text-left py-2.5 pr-3 text-[11px] uppercase tracking-wide text-gray-400 font-medium">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && expenses.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-400">Carregando...</td></tr>
                  )}
                  {!loading && expenses.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-400">Nenhuma aprovacao pendente.</td></tr>
                  )}
                  {expenses.map((expense) => {
                    const r = risk(expense)
                    return (
                      <tr
                        key={expense.id}
                        onClick={() => setSelected(expense)}
                        className={`border-b border-black/[0.04] cursor-pointer ${selected?.id === expense.id ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                      >
                        <td className="py-3 pr-3 font-medium text-[#1a1a2e] whitespace-nowrap">{expense.userName}</td>
                        <td className="py-3 pr-3 text-gray-700 max-w-[140px] truncate">{expense.projectName}</td>
                        <td className="py-3 pr-3 text-gray-700 max-w-[180px] truncate">{expense.title}</td>
                        <td className="py-3 pr-3 font-medium whitespace-nowrap">{fmt(expense.amount)}</td>
                        <td className="py-3 pr-3"><StatusBadge status={expense.status} /></td>
                        <td className="py-3 pr-3"><Badge variant={r.variant}>{r.label}</Badge></td>
                        <td className="py-3">
                          <div className="flex gap-1.5">
                            <button onClick={(event) => { event.stopPropagation(); void runAction('approve', expense.id) }} className="px-2.5 py-1 rounded bg-[#EAF3DE] text-[#27500A] text-[11px] font-medium hover:bg-[#97C459]/30 whitespace-nowrap">Aprovar</button>
                            <button onClick={(event) => { event.stopPropagation(); void runAction('revision', expense.id) }} className="px-2.5 py-1 rounded bg-[#FAEEDA] text-[#633806] text-[11px] font-medium hover:bg-[#FAC775]/30 whitespace-nowrap">Corrigir</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="xl:w-[520px] space-y-3">
          {selected && token ? (
            <ExpenseDetailPanel
              expense={selected}
              token={token}
              actions={(
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" className="flex-1 justify-center" onClick={() => void runAction('approve', selected.id)}>Aprovar</Button>
                  <Button variant="ghost" size="sm" className="flex-1 justify-center text-[#791F1F] border-[#F09595]" onClick={() => void runAction('reject', selected.id)}>Recusar</Button>
                </div>
              )}
            />
          ) : (
            <Card className="flex items-center justify-center h-32">
              <p className="text-[13px] text-gray-400">Selecione uma nota para ver detalhes</p>
            </Card>
          )}
        </div>
      </div>
    </DesktopShell>
  )
}
