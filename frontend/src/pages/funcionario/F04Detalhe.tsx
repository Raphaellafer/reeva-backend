import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import { AIPanel } from '../../components/ui/AIPanel'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Timeline } from '../../components/ui/Timeline'
import { Badge } from '../../components/ui/Badge'
import { mockNotas, mockItensNota, fmt, fmtDate, tipoLabels } from '../../data/mock'
import type { TimelineItem } from '../../components/ui/Timeline'

const LIMITE_MENSAL = 300

const timelineByStatus: Record<string, TimelineItem[]> = {
  APROVADO: [
    { label: 'IA validou', date: 'há 2 dias', color: 'purple' },
    { label: 'Enviado para gerente', date: 'há 2 dias', color: 'blue' },
    { label: 'Aprovado pelo gerente', date: 'há 1 dia', color: 'green' },
  ],
  PENDENTE: [
    { label: 'IA validou', date: 'há 3h', color: 'purple' },
    { label: 'Enviado para gerente', date: 'há 3h', color: 'blue' },
    { label: 'Aguardando aprovação', color: 'amber' },
  ],
  REJEITADO: [
    { label: 'IA detectou anomalia', date: 'há 5 dias', color: 'purple' },
    { label: 'Enviado para revisão', date: 'há 5 dias', color: 'amber' },
    { label: 'Rejeitado: CNPJ inativo', date: 'há 4 dias', color: 'red' },
  ],
  ANALISE_IA: [
    { label: 'Recebido pelo sistema', date: 'há 1h', color: 'gray' },
    { label: 'Em análise pela IA', color: 'purple' },
  ],
}

export function F04Detalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const nota = mockNotas.find(n => n.id === id) ?? mockNotas[0]
  const itens = mockItensNota.slice(0, nota.itensTotais)
  const timeline = timelineByStatus[nota.status] ?? timelineByStatus.APROVADO
  const usadoMes = nota.valorElegivel

  return (
    <MobileShell>
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 flex items-center gap-3 border-b border-black/[0.06]">
        <button onClick={() => navigate(-1)} className="text-gray-400 text-xl leading-none">←</button>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-gray-400 truncate font-mono">{nota.nfe.slice(0, 24)}…</p>
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-medium text-[#1a1a2e]">{nota.estabelecimento}</p>
            <StatusBadge status={nota.status} />
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* AI Panel */}
        <AIPanel title="Análise da IA">
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <p className="text-[#3C3489]/60">Estabelecimento</p>
              <p className="font-medium text-[#3C3489]">{nota.estabelecimento}</p>
            </div>
            <div>
              <p className="text-[#3C3489]/60">Tipo</p>
              <p className="font-medium text-[#3C3489]">{tipoLabels[nota.tipo]}</p>
            </div>
            <div>
              <p className="text-[#3C3489]/60">SEFAZ</p>
              <p className={`font-medium ${nota.sefazOk ? 'text-[#27500A]' : 'text-[#791F1F]'}`}>
                {nota.sefazOk ? '✓ CNPJ ativo' : '✗ CNPJ inativo'}
              </p>
            </div>
            <div>
              <p className="text-[#3C3489]/60">Data</p>
              <p className="font-medium text-[#3C3489]">{fmtDate(nota.data)}</p>
            </div>
            <div>
              <p className="text-[#3C3489]/60">Valor total</p>
              <p className="font-medium text-[#3C3489]">{fmt(nota.valor)}</p>
            </div>
            <div>
              <p className="text-[#3C3489]/60">Valor elegível</p>
              <p className="font-medium text-[#27500A]">{fmt(nota.valorElegivel)}</p>
            </div>
          </div>
          {nota.clienteVinculado && (
            <div className="mt-2 pt-2 border-t border-[#AFA9EC]/30">
              <p className="text-[10px] text-[#3C3489]/60">Cliente vinculado (CRM)</p>
              <p className="text-[12px] font-medium text-[#3C3489]">{nota.clienteVinculado}</p>
              {nota.roiEstimado && (
                <p className="text-[11px] text-[#27500A]">ROI estimado: {nota.roiEstimado}×</p>
              )}
            </div>
          )}
        </AIPanel>

        {/* Itens */}
        <div>
          <p className="text-[13px] font-medium text-[#1a1a2e] mb-2">
            Itens ({nota.itensElegiveis}/{nota.itensTotais} elegíveis)
          </p>
          <div className="bg-white rounded-[10px] border border-black/[0.07] overflow-hidden divide-y divide-black/[0.06]">
            {itens.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2.5 gap-2">
                <div className="min-w-0">
                  <p className="text-[12px] text-[#1a1a2e] truncate">{item.nome}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={item.elegivel ? 'green' : 'amber'}>
                    {item.elegivel ? 'Elegível' : 'Inelegível'}
                  </Badge>
                  <p className="text-[12px] font-medium text-[#1a1a2e]">{fmt(item.valor)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Limite mensal */}
        <div className="bg-white rounded-[10px] border border-black/[0.07] p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-medium text-[#1a1a2e]">Limite mensal — {tipoLabels[nota.tipo]}</p>
            <p className="text-[11px] text-gray-400">{fmt(usadoMes)} / {fmt(LIMITE_MENSAL)}</p>
          </div>
          <ProgressBar
            value={usadoMes}
            max={LIMITE_MENSAL}
            color={usadoMes / LIMITE_MENSAL > 0.8 ? '#F09595' : '#97C459'}
          />
          <p className="text-[10px] text-gray-400 mt-1">
            {Math.round((usadoMes / LIMITE_MENSAL) * 100)}% do limite utilizado
          </p>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-[10px] border border-black/[0.07] p-3">
          <p className="text-[13px] font-medium text-[#1a1a2e] mb-3">Linha do tempo</p>
          <Timeline items={timeline} />
        </div>
      </div>
    </MobileShell>
  )
}
