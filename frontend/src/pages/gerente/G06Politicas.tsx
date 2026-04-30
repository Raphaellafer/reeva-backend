import React, { useEffect, useState } from 'react'
import { getPolicies, savePolicy } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { categoryLabels, fmt } from '../../realData'
import { getToken } from '../../session'
import type { ExpenseCategory, PolicyPayload, PolicyResponse } from '../../types'

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
  const [form, setForm] = useState<PolicyPayload>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const token = getToken()
    if (!token) return
    try {
      setPolicies(await getPolicies(token))
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
    </DesktopShell>
  )
}
