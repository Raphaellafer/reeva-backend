import React, { useEffect, useState } from 'react'
import { getPolicies, getPolicyAuditLogs, savePolicy } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SideDrawer } from '../../components/ui/SideDrawer'
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

const fieldClass = 'mt-1 w-full rounded-[8px] border border-black/[0.08] bg-white px-3 py-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#3C3489] focus:ring-2 focus:ring-[#3C3489]/15'
const labelClass = 'block text-[12px] font-medium text-gray-500'
const sectionTitleClass = 'text-[11px] font-semibold uppercase tracking-wide text-gray-400'

export function G06Politicas() {
  const [policies, setPolicies] = useState<PolicyResponse[]>([])
  const [auditLogs, setAuditLogs] = useState<PolicyAuditLogResponse[]>([])
  const [visibleAuditCount, setVisibleAuditCount] = useState(5)
  const [drawerOpen, setDrawerOpen] = useState(false)
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
    setDrawerOpen(true)
  }

  function closeDrawer() {
    if (loading) return
    setDrawerOpen(false)
    setForm(emptyForm)
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
      setMessage('Politica salva.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar politica.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DesktopShell title="Politicas de reembolso" role="GERENTE">
      <Card>
        <div className="mb-4 flex flex-col gap-1">
          <p className="text-[14px] font-medium text-[#1a1a2e]">Politicas cadastradas</p>
          <p className="text-[12px] text-gray-400">{policies.length} categorias configuradas</p>
        </div>

        {error && !drawerOpen && (
          <p className="mb-3 rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">{error}</p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {['Categoria', 'Limite', 'Diario', 'Mensal', 'Score auto', 'Comprovante', ''].map((header) => (
                  <th key={header} className="py-2.5 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {policies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[13px] text-gray-400">Nenhuma politica cadastrada.</td>
                </tr>
              ) : (
                policies.map((policy) => (
                  <tr key={policy.id} className="border-b border-black/[0.04] hover:bg-gray-50">
                    <td className="py-4 pr-3 font-medium text-[#1a1a2e]">{categoryLabels[policy.category]}</td>
                    <td className="py-4 pr-3 whitespace-nowrap">{fmt(policy.maxAmount)}</td>
                    <td className="py-4 pr-3 whitespace-nowrap">{policy.dailyLimit == null ? '-' : fmt(policy.dailyLimit)}</td>
                    <td className="py-4 pr-3 whitespace-nowrap">{policy.monthlyLimit == null ? '-' : fmt(policy.monthlyLimit)}</td>
                    <td className="py-4 pr-3">
                      <span className="rounded-full bg-[#EEEDFE] px-2.5 py-1 text-[12px] font-medium text-[#3C3489]">
                        {policy.autoApprovalMinScore}
                      </span>
                    </td>
                    <td className="py-4 pr-3">{policy.requiresReceipt ? 'Sim' : 'Nao'}</td>
                    <td className="py-4 pr-3 text-right">
                      <button onClick={() => edit(policy)} className="text-[12px] font-medium text-[#3C3489]">Editar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-medium text-[#1a1a2e]">Log de alteracoes nas politicas</p>
            <p className="mt-0.5 text-[12px] text-gray-400">Registro de auditoria para controle antifraude.</p>
          </div>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-[12px] text-gray-400">Nenhuma alteracao registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[12px]">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  {['Data', 'Usuario', 'Acao', 'Categoria', 'Resumo'].map((header) => (
                    <th key={header} className="py-2 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400 pr-3">{header}</th>
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
              <div className="flex justify-center pt-3">
                <button
                  type="button"
                  onClick={() => setVisibleAuditCount((current) => current + 10)}
                  className="rounded-[8px] border border-black/[0.08] px-3 py-1.5 text-[12px] font-medium text-[#3C3489] hover:bg-[#F4F2FF]"
                >
                  Ver mais {Math.min(10, auditLogs.length - visibleAuditCount)} registros
                </button>
              </div>
            )}
          </div>
        )}
      </Card>

      <SideDrawer
        open={drawerOpen}
        title="Editar politica"
        onClose={closeDrawer}
        footer={
          <div className="space-y-3">
            {message && <p className="rounded-[8px] border border-[#97C459] bg-[#EAF3DE] p-3 text-[12px] text-[#27500A]">{message}</p>}
            {error && <p className="rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">{error}</p>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={closeDrawer} disabled={loading} className="justify-center">Cancelar</Button>
              <Button type="submit" form="policy-drawer-form" disabled={loading} className="justify-center">
                {loading ? 'Salvando...' : 'Salvar politica'}
              </Button>
            </div>
          </div>
        }
      >
        <form id="policy-drawer-form" onSubmit={(event) => void submit(event)} className="space-y-6">
          <section className="space-y-3">
            <p className={sectionTitleClass}>Categoria</p>
            <label className={labelClass}>
              Categoria
              <select
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as ExpenseCategory }))}
                className={fieldClass}
              >
                {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </section>

          <section className="space-y-3">
            <p className={sectionTitleClass}>Limites</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className={labelClass}>
                Por nota
                <input value={form.maxAmount} onChange={(event) => setForm((current) => ({ ...current, maxAmount: event.target.value }))} className={fieldClass} />
              </label>
              <label className={labelClass}>
                Diario
                <input value={form.dailyLimit ?? ''} onChange={(event) => setForm((current) => ({ ...current, dailyLimit: event.target.value }))} className={fieldClass} />
              </label>
              <label className={labelClass}>
                Mensal
                <input value={form.monthlyLimit ?? ''} onChange={(event) => setForm((current) => ({ ...current, monthlyLimit: event.target.value }))} className={fieldClass} />
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <p className={sectionTitleClass}>Autoaprovacao</p>
            <label className={labelClass}>
              Score minimo
              <input
                type="number"
                min={0}
                max={100}
                value={form.autoApprovalMinScore}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  autoApprovalMinScore: Math.max(0, Math.min(100, Number(event.target.value) || 0)),
                }))}
                className={fieldClass}
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-[8px] border border-black/[0.08] px-3 py-2 text-[13px] font-medium text-[#1a1a2e]">
              <span>Exigir comprovante</span>
              <input
                type="checkbox"
                checked={form.requiresReceipt}
                onChange={(event) => setForm((current) => ({ ...current, requiresReceipt: event.target.checked }))}
                className="h-4 w-4"
              />
            </label>
          </section>

          <section className="space-y-3">
            <p className={sectionTitleClass}>Regras para IA</p>
            <label className={labelClass}>
              Regras em texto
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={7}
                placeholder="Ex: nao reembolsar bebidas alcoolicas; refeicoes somente em dias uteis; taxi apenas com justificativa."
                className={fieldClass}
              />
            </label>
          </section>
        </form>
      </SideDrawer>
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
