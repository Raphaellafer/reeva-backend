import React from 'react'
import { Link } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { getStoredUser } from '../../hooks/useAuth'
import { mockNotas, fmt, fmtDate, tipoLabels } from '../../data/mock'

const statusBorder: Record<string, string> = {
  APROVADO:   'border-l-[#97C459]',
  PENDENTE:   'border-l-[#FAC775]',
  REJEITADO:  'border-l-[#F09595]',
  ANALISE_IA: 'border-l-[#AFA9EC]',
}

const recentes = mockNotas.slice(0, 4)
const totalMes = mockNotas.filter(n => n.status === 'APROVADO').reduce((s, n) => s + n.valorElegivel, 0)
const aprovadas = mockNotas.filter(n => n.status === 'APROVADO').length
const pendentes = mockNotas.filter(n => n.status === 'PENDENTE' || n.status === 'ANALISE_IA').length
const rejeitadas = mockNotas.filter(n => n.status === 'REJEITADO').length

export function F01Home() {
  const user = getStoredUser()
  const primeiroNome = user?.name?.split(' ')[0] ?? 'Olá'
  const iniciais = user?.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? 'EU'

  return (
    <MobileShell>
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 flex items-center justify-between border-b border-black/[0.06]">
        <div>
          <p className="text-[11px] text-gray-400">Bom dia,</p>
          <p className="text-[15px] font-medium text-[#1a1a2e]">{primeiroNome}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center text-[12px] font-medium">
          {iniciais}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Hero card */}
        <div className="rounded-[10px] bg-[#1a1a2e] p-4 text-white">
          <p className="text-[11px] text-white/50 uppercase tracking-wide mb-1">Total reembolsado em abril</p>
          <p className="text-[32px] font-medium leading-none mb-1">{fmt(totalMes)}</p>
          <p className="text-[11px] text-[#97C459] mb-4">↑ 12% vs mês anterior</p>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/5 rounded-[7px] p-2.5 text-center">
              <p className="text-[20px] font-medium text-[#97C459]">{aprovadas}</p>
              <p className="text-[10px] text-white/50">Aprovadas</p>
            </div>
            <div className="bg-white/5 rounded-[7px] p-2.5 text-center">
              <p className="text-[20px] font-medium text-[#FAC775]">{pendentes}</p>
              <p className="text-[10px] text-white/50">Pendentes</p>
            </div>
            <div className="bg-white/5 rounded-[7px] p-2.5 text-center">
              <p className="text-[20px] font-medium text-[#F09595]">{rejeitadas}</p>
              <p className="text-[10px] text-white/50">Rejeitadas</p>
            </div>
          </div>
        </div>

        {/* Notas recentes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-medium text-[#1a1a2e]">Notas recentes</p>
            <Link to="/funcionario/historico" className="text-[11px] text-[#3C3489]">
              Ver tudo
            </Link>
          </div>

          <div className="space-y-2">
            {recentes.map((nota) => (
              <Link
                key={nota.id}
                to={`/funcionario/nota/${nota.id}`}
                className={`block bg-white rounded-[10px] border border-black/[0.07] border-l-4 ${statusBorder[nota.status]} p-3`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[#1a1a2e] truncate">{nota.estabelecimento}</p>
                    <p className="text-[11px] text-gray-400">{tipoLabels[nota.tipo]} · {fmtDate(nota.data)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-medium text-[#1a1a2e]">{fmt(nota.valor)}</p>
                    <StatusBadge status={nota.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </MobileShell>
  )
}
