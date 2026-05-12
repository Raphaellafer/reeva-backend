import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPolicies, getPolicyAuditLogs, savePolicy } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SideDrawer } from '../../components/ui/SideDrawer'
import { getStoredUser } from '../../hooks/useAuth'
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
  const token = getToken()
  const queryClient = useQueryClient()
  const [visibleAuditCount, setVisibleAuditCount] = useState(5)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<PolicyResponse | null>(null)
  const [form, setForm] = useState<PolicyPayload>(emptyForm)
  const [message, setMessage] = useState<string | null>(null)
  const [drawerError, setDrawerError] = useState<string | null>(null)
  const managerName = getStoredUser()?.name ?? 'Gestor responsável'

  const { data: policies = [], error: policiesError } = useQuery({
    queryKey: ['policies'],
    queryFn: () => getPolicies(token!),
    enabled: !!token,
  })

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['policy-audit-logs'],
    queryFn: () => getPolicyAuditLogs(token!),
    enabled: !!token,
  })

  const saveMutation = useMutation({
    mutationFn: (payload: PolicyPayload) => savePolicy(token!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['policies'] })
      void queryClient.invalidateQueries({ queryKey: ['policy-audit-logs'] })
      setMessage('Política salva.')
      setDrawerError(null)
    },
    onError: (err) => setDrawerError(err instanceof Error ? err.message : 'Falha ao salvar política.'),
  })

  function edit(policy: PolicyResponse) {
    setEditingPolicy(policy)
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
    setDrawerError(null)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    if (saveMutation.isPending) return
    setDrawerOpen(false)
    setEditingPolicy(null)
    setForm(emptyForm)
    setMessage(null)
    setDrawerError(null)
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setMessage(null)
    setDrawerError(null)
    saveMutation.mutate({
      ...form,
      dailyLimit: form.dailyLimit || null,
      monthlyLimit: form.monthlyLimit || null,
    })
  }

  return (
    <DesktopShell title="Políticas de reembolso" role="GERENTE">
      <Card>
        <div className="mb-4 flex flex-col gap-1">
          <p className="text-[14px] font-medium text-[#1a1a2e]">Políticas cadastradas</p>
          <p className="text-[12px] text-gray-400">{policies.length} categorias configuradas</p>
        </div>

        {policiesError && !drawerOpen && (
          <p className="mb-3 rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">{policiesError instanceof Error ? policiesError.message : 'Falha ao carregar políticas.'}</p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {['Categoria', 'Limite', 'Diário', 'Mensal', 'Score auto', 'Comprovante', ''].map((header) => (
                  <th key={header} className="py-2.5 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {policies.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-[13px] text-gray-400">Nenhuma política cadastrada.</td></tr>
              ) : (
                policies.map((policy) => (
                  <tr key={policy.id} className="border-b border-black/[0.04] hover:bg-gray-50">
                    <td className="py-4 pr-3 font-medium text-[#1a1a2e]">{categoryLabels[policy.category]}</td>
                    <td className="py-4 pr-3 whitespace-nowrap">{fmt(policy.maxAmount)}</td>
                    <td className="py-4 pr-3 whitespace-nowrap">{policy.dailyLimit == null ? '-' : fmt(policy.dailyLimit)}</td>
                    <td className="py-4 pr-3 whitespace-nowrap">{policy.monthlyLimit == null ? '-' : fmt(policy.monthlyLimit)}</td>
                    <td className="py-4 pr-3">
                      <span className="rounded-full bg-[#EEEDFE] px-2.5 py-1 text-[12px] font-medium text-[#3C3489]">{policy.autoApprovalMinScore}</span>
                    </td>
                    <td className="py-4 pr-3">{policy.requiresReceipt ? 'Sim' : 'Não'}</td>
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
            <p className="text-[14px] font-medium text-[#1a1a2e]">Log de alterações nas políticas</p>
            <p className="mt-0.5 text-[12px] text-gray-400">Registro de auditoria para controle antifraude.</p>
          </div>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-[12px] text-gray-400">Nenhuma alteração registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[12px]">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  {['Data', 'Usuário', 'Ação', 'Categoria', 'Resumo'].map((header) => (
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
                <button type="button" onClick={() => setVisibleAuditCount((current) => current + 10)} className="rounded-[8px] border border-black/[0.08] px-3 py-1.5 text-[12px] font-medium text-[#3C3489] hover:bg-[#F4F2FF]">
                  Ver mais {Math.min(10, auditLogs.length - visibleAuditCount)} registros
                </button>
              </div>
            )}
          </div>
        )}
      </Card>

      <SideDrawer
        open={drawerOpen}
        title="Editar política"
        onClose={closeDrawer}
        footer={
          <div className="space-y-3">
            {message && <p className="rounded-[8px] border border-[#97C459] bg-[#EAF3DE] p-3 text-[12px] text-[#27500A]">{message}</p>}
            {drawerError && <p className="rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">{drawerError}</p>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={closeDrawer} disabled={saveMutation.isPending} className="justify-center">Cancelar</Button>
              <Button type="submit" form="policy-drawer-form" disabled={saveMutation.isPending} className="justify-center">
                {saveMutation.isPending ? 'Salvando...' : 'Salvar política'}
              </Button>
            </div>
          </div>
        }
      >
        <form id="policy-drawer-form" onSubmit={submit} className="space-y-6">
          <section className="space-y-3">
            <p className={sectionTitleClass}>Categoria</p>
            <label className={labelClass}>
              Categoria
              <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as ExpenseCategory }))} className={fieldClass}>
                {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <div className="rounded-[8px] border border-dashed border-black/[0.10] bg-[#F8F8FC] p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Responsável pela alteração</p>
              <p className="mt-1 text-[13px] font-medium text-[#1a1a2e]">{managerName}</p>
            </div>
          </section>

          <section className="space-y-3">
            <p className={sectionTitleClass}>Limites</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className={labelClass}>Por nota<input value={form.maxAmount} onChange={(event) => setForm((current) => ({ ...current, maxAmount: event.target.value }))} className={fieldClass} /></label>
              <label className={labelClass}>Diário<input value={form.dailyLimit ?? ''} onChange={(event) => setForm((current) => ({ ...current, dailyLimit: event.target.value }))} className={fieldClass} /></label>
              <label className={labelClass}>Mensal<input value={form.monthlyLimit ?? ''} onChange={(event) => setForm((current) => ({ ...current, monthlyLimit: event.target.value }))} className={fieldClass} /></label>
            </div>
          </section>

          <section className="space-y-3">
            <p className={sectionTitleClass}>Autoaprovação</p>
            <label className={labelClass}>
              Score mínimo
              <input type="number" min={0} max={100} value={form.autoApprovalMinScore} onChange={(event) => setForm((current) => ({ ...current, autoApprovalMinScore: Math.max(0, Math.min(100, Number(event.target.value) || 0)) }))} className={fieldClass} />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-[8px] border border-black/[0.08] px-3 py-2 text-[13px] font-medium text-[#1a1a2e]">
              <span>Exigir comprovante</span>
              <input type="checkbox" checked={form.requiresReceipt} onChange={(event) => setForm((current) => ({ ...current, requiresReceipt: event.target.checked }))} className="h-4 w-4" />
            </label>
          </section>

          <section className="space-y-3">
            <p className={sectionTitleClass}>Resumo de impacto</p>
            <div className="rounded-[8px] border border-[#AFA9EC]/40 bg-[#F4F2FF] p-3 text-[12px] text-[#3C3489]">
              {buildPolicyImpact(editingPolicy, form).map((item) => <p key={item}>{item}</p>)}
            </div>
          </section>

          <section className="space-y-3">
            <p className={sectionTitleClass}>Regras para IA</p>
            <label className={labelClass}>
              Regras em texto
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={7} placeholder="Ex: não reembolsar bebidas alcoólicas; refeições somente em dias úteis; táxi apenas com justificativa." className={fieldClass} />
            </label>
          </section>
        </form>
      </SideDrawer>
    </DesktopShell>
  )
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function actionLabel(action: string) {
  return { POLICY_CREATED: 'Criação', POLICY_UPDATED: 'Edição', POLICY_REACTIVATED: 'Reativação' }[action] ?? action
}

function snapshotSummary(snapshot: Record<string, unknown>) {
  if (!snapshot || Object.keys(snapshot).length === 0) return '-'
  const maxAmount = moneyValue(snapshot.maxAmount)
  const dailyLimit = moneyValue(snapshot.dailyLimit)
  const monthlyLimit = moneyValue(snapshot.monthlyLimit)
  const score = snapshot.autoApprovalMinScore == null ? '-' : String(snapshot.autoApprovalMinScore)
  const receipt = snapshot.requiresReceipt === true ? 'sim' : snapshot.requiresReceipt === false ? 'não' : '-'
  return `Limite ${maxAmount}; diário ${dailyLimit}; mensal ${monthlyLimit}; score ${score}; comprovante ${receipt}`
}

function changeSummary(log: PolicyAuditLogResponse) {
  if (log.action === 'POLICY_CREATED') return `Criou política: ${snapshotSummary(log.after)}`
  if (!log.before || Object.keys(log.before).length === 0) return 'Registro legado sem detalhamento do antes/depois.'
  const changes = [
    diffMoney('limite por nota', log.before.maxAmount, log.after.maxAmount),
    diffMoney('limite diário', log.before.dailyLimit, log.after.dailyLimit),
    diffMoney('limite mensal', log.before.monthlyLimit, log.after.monthlyLimit),
    diffValue('score auto', log.before.autoApprovalMinScore, log.after.autoApprovalMinScore),
    diffValue('comprovante', receiptLabel(log.before.requiresReceipt), receiptLabel(log.after.requiresReceipt)),
    diffText('regras', log.before.description, log.after.description),
  ].filter(Boolean)
  return changes.length > 0 ? changes.join('; ') : 'Salvou sem mudanças materiais.'
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
  return value === true ? 'sim' : value === false ? 'não' : '-'
}

function moneyValue(value: unknown) {
  if (value == null || value === '') return '-'
  const numeric = Number(value)
  return Number.isFinite(numeric) ? fmt(numeric) : String(value)
}

function buildPolicyImpact(policy: PolicyResponse | null, form: PolicyPayload) {
  if (!policy) return ['Selecione uma política para ver o impacto da alteração.']
  const changes = [
    impactMoney('Limite por nota', policy.maxAmount, form.maxAmount),
    impactMoney('Limite diário', policy.dailyLimit, form.dailyLimit),
    impactMoney('Limite mensal', policy.monthlyLimit, form.monthlyLimit),
    impactNumber('Score mínimo', policy.autoApprovalMinScore, form.autoApprovalMinScore),
    policy.requiresReceipt !== form.requiresReceipt ? `Comprovante: ${policy.requiresReceipt ? 'obrigatório' : 'opcional'} -> ${form.requiresReceipt ? 'obrigatório' : 'opcional'}` : null,
    String(policy.description ?? '') !== String(form.description ?? '') ? 'Regras para IA serão atualizadas.' : null,
  ].filter(Boolean) as string[]
  return changes.length > 0 ? changes : ['Nenhuma mudança material em relação à política atual.']
}

function impactMoney(label: string, before: number | null, after: string | null) {
  const beforeNumber = before == null ? null : Number(before)
  const afterNumber = after == null || after === '' ? null : Number(after)
  if (beforeNumber === afterNumber) return null
  return `${label}: ${beforeNumber == null ? '-' : fmt(beforeNumber)} -> ${afterNumber == null || Number.isNaN(afterNumber) ? '-' : fmt(afterNumber)}`
}

function impactNumber(label: string, before: number, after: number) {
  if (before === after) return null
  return `${label}: ${before} -> ${after}`
}
