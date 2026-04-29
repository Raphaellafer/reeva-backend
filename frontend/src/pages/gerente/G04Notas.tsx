import React, { useState } from 'react'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { mockNotas, fmt, fmtDate, tipoLabels } from '../../data/mock'
import type { NotaStatus, NotaTipo } from '../../types/index'

type FiltroStatus = 'TODOS' | NotaStatus
type FiltroTipo = 'TODOS' | NotaTipo

export function G04Notas() {
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('TODOS')
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('TODOS')

  const filtered = mockNotas.filter(n => {
    if (filtroStatus !== 'TODOS' && n.status !== filtroStatus) return false
    if (filtroTipo !== 'TODOS' && n.tipo !== filtroTipo) return false
    return true
  })

  return (
    <DesktopShell title="Todas as notas" role="GERENTE">
      {/* Filtros responsivos */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['TODOS', 'PENDENTE', 'APROVADO', 'REJEITADO', 'ANALISE_IA'] as FiltroStatus[]).map(f => (
          <button
            key={f}
            onClick={() => setFiltroStatus(f)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${filtroStatus === f ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'text-gray-500 border-gray-200 hover:border-gray-400 bg-white'}`}
          >
            {f === 'TODOS' ? 'Todos' : f === 'ANALISE_IA' ? 'Análise IA' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
        <span className="self-center text-[11px] text-gray-300">|</span>
        {(['TODOS', 'REFEICAO', 'ALMOCO_CORPORATIVO', 'TRANSPORTE', 'VIAGEM'] as FiltroTipo[]).map(f => (
          <button
            key={f}
            onClick={() => setFiltroTipo(f)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${filtroTipo === f ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'text-gray-500 border-gray-200 hover:border-gray-400 bg-white'}`}
          >
            {f === 'TODOS' ? 'Todos tipos' : tipoLabels[f]}
          </button>
        ))}
      </div>

      <Card>
        <p className="text-[12px] text-gray-500 mb-3">{filtered.length} nota(s) encontrada(s)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[600px]">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {['Funcionário', 'Estabelecimento', 'Tipo', 'Data', 'Valor', 'Status', 'SEFAZ'].map(h => (
                  <th key={h} className="text-left py-2.5 pr-3 text-[11px] uppercase tracking-wide text-gray-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(nota => (
                <tr key={nota.id} className="border-b border-black/[0.04] hover:bg-gray-50">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center text-[10px] font-medium">AB</div>
                      <span className="text-[#1a1a2e] font-medium whitespace-nowrap">Ana Beatriz</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-gray-700 max-w-[140px] truncate">{nota.estabelecimento}</td>
                  <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">{tipoLabels[nota.tipo]}</td>
                  <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">{fmtDate(nota.data)}</td>
                  <td className="py-3 pr-3 font-medium text-[#1a1a2e] whitespace-nowrap">{fmt(nota.valor)}</td>
                  <td className="py-3 pr-3"><StatusBadge status={nota.status} /></td>
                  <td className="py-3">
                    <Badge variant={nota.sefazOk ? 'green' : 'red'}>{nota.sefazOk ? '✓ OK' : '✗ Inativo'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </DesktopShell>
  )
}
