import React, { useEffect, useState } from 'react'
import { getPolicies, getPolicyAuditLogs, savePolicy } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { categoryLabels, fmt } from '../../realData'
import { getToken } from '../../session'
import type { ExpenseCategory, PolicyAuditLogResponse, PolicyPayload, PolicyResponse } from '../../types'

const categories = Object.entries(categoryLabels) as Array<[ExpenseCategory, string]>

const emptyForm: PolicyPayload = {
  category: 'FOOD',
  maxAmount: '150.00',
  dailyLimit: null,
  monthlyLimit: null,
  requiresReceipt: true,
  autoApprovalMinScore: 90,
  description: '',
}

export function G06Politicas() {
  const [policies, setPolicies] = useState<PolicyResponse[]>([])
  const [auditLogs, setAuditLogs] = useState<PolicyAuditLogResponse[]>([])
  const [visibleAuditCount, setVisibleAuditCount] = useState(5)
  const [form, setForm] = useState<PolicyPayload>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const token = getToken()
    if (!token) return
    try {
      const [loadedPolicies, loadedAuditLogs] = await Promise.all([
        getPolicies(token),
        getPolicyAuditLogs(token),
      ])
      setPolicies(loadedPolicies)
      setAuditLogs(loadedAuditLogs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar politicas.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function edit(policy: PolicyResponse) {
    setForm({
      category: policy.category,
      maxAmount: String(policy.maxAmount),
      dailyLimit: policy.dailyLimit == null ? null : String(policy.dailyLimit),
      monthlyLimit: policy.monthlyLimit == null ? null : String(policy.monthlyLimit),
      requiresReceipt: policy.requiresReceipt,
      autoApprovalMinScore: policy.autoApprovalMinScore,
      description: policy.description ?? '',
    })
    setMessage(null)
    setError(null)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const token = getToken()
    if (!token) return
    setLoading(true)
    setMessage(null)
    setError(null)
    try {
      await savePolicy(token, {
        ...form,
        dailyLimit: form.dailyLimit || null,
        monthlyLimit: form.monthlyLimit || null,
      })
      setMessage('Politica salva. As proximas notas serao avaliadas com estas regras.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar politica.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DesktopShell title="Politicas de reembolso" role="GERENTE">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4">
        <Card>
          <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Politicas cadastradas</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[620px]">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  {['Categoria', 'Limite', 'Diario', 'Mensal', 'Score auto', 'Comprovante', ''].map((header) => (
                    <th key={header} className="text-left py-2 text-[11px] uppercase tracking-wide text-gray-400 font-medium pr-3">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <tr key={policy.id} className="border-b border-black/[0.04]">
                    <td className="py-3 pr-3 font-medium text-[#1a1a2e]">{categoryLabels[policy.category]}</td>
                    <td className="py-3 pr-3">{fmt(policy.maxAmount)}</td>
                    <td className="py-3 pr-3">{policy.dailyLimit == null ? '-' : fmt(policy.dailyLimit)}</td>
                    <td className="py-3 pr-3">{policy.monthlyLimit == null ? '-' : fmt(policy.monthlyLimit)}</td>
                    <td className="py-3 pr-3">{policy.autoApprovalMinScore}</td>
                    <td className="py-3 pr-3">{policy.requiresReceipt ? 'Sim' : 'Nao'}</td>
                    <td className="py-3 pr-3 text-right">
                      <button onClick={() => edit(policy)} className="text-[12px] text-[#3C3489] font-medium">Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Editar politica</p>
          <form onSubmit={(event) => void submit(event)} className="space-y-3">
            <label className="block text-[12px] text-gray-500">
              Categoria
              <select
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as ExpenseCategory }))}
                className="mt-1 w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]"
              >
                {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>

            <div className="grid grid-cols-3 gap-2">
              <label className="block text-[12px] text-gray-500">
                Por nota
                <input value={form.maxAmount} onChange={(event) => setForm((current) => ({ ...current, maxAmount: event.target.value }))} className="mt-1 w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px]" />
              </label>
              <label className="block text-[12px] text-gray-500">
                Diario
                <input value={form.dailyLimit ?? ''} onChange={(event) => setForm((current) => ({ ...current, dailyLimit: event.target.value }))} className="mt-1 w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px]" />
              </label>
              <label className="block text-[12px] text-gray-500">
                Mensal
                <input value={form.monthlyLimit ?? ''} onChange={(event) => setForm((current) => ({ ...current, monthlyLimit: event.target.value }))} className="mt-1 w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px]" />
              </label>
            </div>

            <label className="block text-[12px] text-gray-500">
              Score minimo para autoaprovar
              <input
                type="number"
                min={0}
                max={100}
                value={form.autoApprovalMinScore}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  autoApprovalMinScore: Math.max(0, Math.min(100, Number(event.target.value) || 0)),
                }))}
                className="mt-1 w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px]"
              />
              <span className="mt-1 block text-[11px] text-gray-400">
                Notas com score abaixo desse valor vao para revisao do gestor.
              </span>
            </label>

            <label className="flex items-center gap-2 text-[13px] text-[#1a1a2e]">
              <input type="checkbox" checked={form.requiresReceipt} onChange={(event) => setForm((current) => ({ ...current, requiresReceipt: event.target.checked }))} />
              Exigir comprovante
            </label>

            <label className="block text-[12px] text-gray-500">
              Regras em texto para a IA
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={8}
                placeholder="Ex: nao reembolsar bebidas alcoolicas; refeicoes somente em dias uteis; taxi apenas com justificativa."
                className="mt-1 w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]"
              />
            </label>

            {message && <p className="text-[12px] text-[#27500A] bg-[#EAF3DE] border border-[#97C459] rounded-[8px] p-3">{message}</p>}
            {error && <p className="text-[12px] text-[#791F1F] bg-[#FCEBEB] border border-[#F09595] rounded-[8px] p-3">{error}</p>}

            <Button variant="primary" className="w-full justify-center" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar politica'}
            </Button>
          </form>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-[14px] font-medium text-[#1a1a2e]">Log de alteracoes nas politicas</p>
            <p className="text-[12px] text-gray-400 mt-0.5">Registro de auditoria para controle antifraude.</p>
          </div>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-[12px] text-gray-400">Nenhuma alteracao registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] min-w-[760px]">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  {['Data', 'Usuario', 'Acao', 'Categoria', 'Resumo'].map((header) => (
                    <th key={header} className="text-left py-2 text-[11px] uppercase tracking-wide text-gray-400 font-medium pr-3">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLogs.slice(0, visibleAuditCount).map((log) => (
                  <tr key={log.id} className="border-b border-black/[0.04] align-top">
                    <td className="py-3 pr-3 whitespace-nowrap">{formatDateTime(log.changedAt)}</td>
                    <td className="py-3 pr-3">{log.changedByName ?? log.changedByUserId}</td>
                    <td className="py-3 pr-3">{actionLabel(log.action)}</td>
                    <td className="py-3 pr-3">{categoryLabels[log.category as ExpenseCategory] ?? log.category ?? '-'}</td>
                    <td className="py-3 pr-3 text-[#1a1a2e]">{changeSummary(log)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {auditLogs.length > visibleAuditCount && (
              <div className="pt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleAuditCount((current) => current + 10)}
                  className="px-3 py-1.5 rounded-[8px] border border-black/[0.08] text-[12px] text-[#3C3489] font-medium hover:bg-[#F4F2FF]"
                >
                  Ver mais {Math.min(10, auditLogs.length - visibleAuditCount)} registros
                </button>
              </div>
            )}
          </div>
        )}
      </Card>
    </DesktopShell>
  )
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function actionLabel(action: string) {
  return {
    POLICY_CREATED: 'Criacao',
    POLICY_UPDATED: 'Edicao',
    POLICY_REACTIVATED: 'Reativacao',
  }[action] ?? action
}

function snapshotSummary(snapshot: Record<string, unknown>) {
  if (!snapshot || Object.keys(snapshot).length === 0) return '-'
  const maxAmount = moneyValue(snapshot.maxAmount)
  const dailyLimit = moneyValue(snapshot.dailyLimit)
  const monthlyLimit = moneyValue(snapshot.monthlyLimit)
  const score = snapshot.autoApprovalMinScore == null ? '-' : String(snapshot.autoApprovalMinScore)
  const receipt = snapshot.requiresReceipt === true ? 'sim' : snapshot.requiresReceipt === false ? 'nao' : '-'
  return `Limite ${maxAmount}; diario ${dailyLimit}; mensal ${monthlyLimit}; score ${score}; comprovante ${receipt}`
}

function changeSummary(log: PolicyAuditLogResponse) {
  if (log.action === 'POLICY_CREATED') {
    return `Criou politica: ${snapshotSummary(log.after)}`
  }
  if (!log.before || Object.keys(log.before).length === 0) {
    return 'Registro legado sem detalhamento do antes/depois.'
  }

  const changes = [
    diffMoney('limite por nota', log.before.maxAmount, log.after.maxAmount),
    diffMoney('limite diario', log.before.dailyLimit, log.after.dailyLimit),
    diffMoney('limite mensal', log.before.monthlyLimit, log.after.monthlyLimit),
    diffValue('score auto', log.before.autoApprovalMinScore, log.after.autoApprovalMinScore),
    diffValue('comprovante', receiptLabel(log.before.requiresReceipt), receiptLabel(log.after.requiresReceipt)),
    diffText('regras', log.before.description, log.after.description),
  ].filter(Boolean)

  return changes.length > 0 ? changes.join('; ') : 'Salvou sem mudancas materiais.'
}

function diffMoney(label: string, before: unknown, after: unknown) {
  if (String(before ?? '') === String(after ?? '')) return null
  return `${label}: ${moneyValue(before)} -> ${moneyValue(after)}`
}

function diffValue(label: string, before: unknown, after: unknown) {
  if (String(before ?? '') === String(after ?? '')) return null
  return `${label}: ${before ?? '-'} -> ${after ?? '-'}`
}

function diffText(label: string, before: unknown, after: unknown) {
  if (String(before ?? '') === String(after ?? '')) return null
  return `${label}: alteradas`
}

function receiptLabel(value: unknown) {
  return value === true ? 'sim' : value === false ? 'nao' : '-'
}

function moneyValue(value: unknown) {
  if (value == null || value === '') return '-'
  const numeric = Number(value)
  return Number.isFinite(numeric) ? fmt(numeric) : String(value)
}
