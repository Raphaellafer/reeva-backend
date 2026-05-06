import React, { useEffect, useState } from 'react'
import { getCfoPolicies } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { fmt } from '../../data/mock'
import { getToken } from '../../session'
import type { ExpenseCategory, PolicyResponse } from '../../types'

const categoryLabels: Record<ExpenseCategory, string> = {
  FOOD: 'Alimentacao',
  TRANSPORT: 'Transporte',
  LODGING: 'Hospedagem',
  PURCHASE: 'Compras',
  HARDWARE: 'Hardware',
}

export function C05Config() {
  const [policies, setPolicies] = useState<PolicyResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return

    getCfoPolicies(token)
      .then(setPolicies)
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar politicas.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <DesktopShell title="Configuracoes CFO" role="CFO">
      <div className="max-w-5xl space-y-4">
        {error && (
          <Card>
            <p className="text-[13px] text-[#791F1F]">{error}</p>
          </Card>
        )}

        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-[14px] font-medium text-[#1a1a2e]">Politicas ativas de reembolso</p>
              <p className="text-[12px] text-gray-400">Leitura executiva das regras usadas pela IA, pelo OCR e pelo gestor.</p>
            </div>
            <Badge variant="purple">{loading ? 'Carregando' : `${policies.length} politica(s)`}</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[720px]">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  {['Categoria', 'Limite por nota', 'Diario', 'Mensal', 'Recibo', 'Score IA', 'Descricao'].map((header) => (
                    <th key={header} className="text-left py-2.5 pr-3 text-[11px] uppercase tracking-wide text-gray-400 font-medium">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <tr key={policy.id} className="border-b border-black/[0.04] hover:bg-gray-50">
                    <td className="py-3 pr-3 font-medium text-[#1a1a2e] whitespace-nowrap">{categoryLabels[policy.category] ?? policy.category}</td>
                    <td className="py-3 pr-3 font-medium whitespace-nowrap">{fmt(policy.maxAmount)}</td>
                    <td className="py-3 pr-3 text-gray-600 whitespace-nowrap">{policy.dailyLimit != null ? fmt(policy.dailyLimit) : '-'}</td>
                    <td className="py-3 pr-3 text-gray-600 whitespace-nowrap">{policy.monthlyLimit != null ? fmt(policy.monthlyLimit) : '-'}</td>
                    <td className="py-3 pr-3">{policy.requiresReceipt ? <Badge variant="green">Obrigatorio</Badge> : <Badge variant="gray">Opcional</Badge>}</td>
                    <td className="py-3 pr-3 text-gray-600">{policy.autoApprovalMinScore}</td>
                    <td className="py-3 pr-3 text-gray-500 max-w-[280px] truncate">{policy.description ?? '-'}</td>
                  </tr>
                ))}
                {!loading && policies.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-5 text-[13px] text-gray-400">Nenhuma politica ativa encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-2">Como alterar regras</p>
            <p className="text-[13px] text-gray-500 leading-relaxed">
              A alteracao de politica continua no fluxo do gestor/admin para manter trilha de auditoria.
              Toda edicao salva quem alterou, quando alterou e o resumo do que mudou.
            </p>
          </Card>

          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-2">Novas categorias</p>
            <p className="text-[13px] text-gray-500 leading-relaxed">
              Categorias como Hardware podem ser ativadas como politica real. Depois disso, as notas passam a ser
              classificadas, validadas e medidas no CFO como qualquer outro tipo de reembolso.
            </p>
          </Card>
        </div>
      </div>
    </DesktopShell>
  )
}
