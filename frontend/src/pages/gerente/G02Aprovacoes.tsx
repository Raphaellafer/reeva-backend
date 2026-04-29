import React, { useState } from 'react'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { AIPanel } from '../../components/ui/AIPanel'
import { Button } from '../../components/ui/Button'
import { mockNotas, mockItensNota, fmt, fmtDate, tipoLabels } from '../../data/mock'
import type { Nota } from '../../types/index'

const riskLevel = (nota: Nota): { label: string; variant: 'green' | 'amber' | 'red' } => {
  if (!nota.sefazOk) return { label: 'Alto', variant: 'red' }
  if (nota.itensElegiveis < nota.itensTotais) return { label: 'Médio', variant: 'amber' }
  return { label: 'Baixo', variant: 'green' }
}

const riskRowBg: Record<string, string> = {
  Alto: 'bg-[#FCEBEB]/30',
  Médio: 'bg-[#FAEEDA]/30',
  Baixo: '',
}

export function G02Aprovacoes() {
  const [selected, setSelected] = useState<Nota | null>(mockNotas[1])

  return (
    <DesktopShell title="Fila de aprovações" role="GERENTE">
      <div className="flex flex-col xl:flex-row gap-4">
        {/* Tabela */}
        <div className="flex-1 min-w-0">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[600px]">
                <thead>
                  <tr className="border-b border-black/[0.06]">
                    {['Funcionário', 'Estabelecimento', 'Valor', 'Status IA', 'Risco', 'Ações'].map(h => (
                      <th key={h} className="text-left py-2.5 pr-3 text-[11px] uppercase tracking-wide text-gray-400 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mockNotas.map(nota => {
                    const risk = riskLevel(nota)
                    return (
                      <tr
                        key={nota.id}
                        onClick={() => setSelected(nota)}
                        className={`border-b border-black/[0.04] cursor-pointer transition-colors ${riskRowBg[risk.label]} ${selected?.id === nota.id ? 'ring-1 ring-inset ring-[#1a1a2e]/20' : 'hover:bg-gray-50'}`}
                      >
                        <td className="py-3 pr-3 font-medium text-[#1a1a2e] whitespace-nowrap">Ana Beatriz</td>
                        <td className="py-3 pr-3 text-gray-700 max-w-[160px] truncate">{nota.estabelecimento}</td>
                        <td className="py-3 pr-3 font-medium whitespace-nowrap">{fmt(nota.valor)}</td>
                        <td className="py-3 pr-3">
                          <Badge variant={nota.sefazOk ? 'green' : 'red'}>
                            {nota.sefazOk ? 'Aprovada' : 'Reprovada'}
                          </Badge>
                        </td>
                        <td className="py-3 pr-3">
                          <Badge variant={risk.variant}>{risk.label}</Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-1.5">
                            <button className="px-2.5 py-1 rounded bg-[#EAF3DE] text-[#27500A] text-[11px] font-medium hover:bg-[#97C459]/30 whitespace-nowrap">✓ Aprovar</button>
                            <button className="px-2.5 py-1 rounded bg-[#FCEBEB] text-[#791F1F] text-[11px] font-medium hover:bg-[#F09595]/30 whitespace-nowrap">✗ Recusar</button>
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

        {/* Painel de detalhe */}
        <div className="xl:w-[320px] space-y-3">
          {selected ? (
            <>
              <Card>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-[14px] font-medium text-[#1a1a2e]">{selected.estabelecimento}</p>
                    <p className="text-[12px] text-gray-400">{tipoLabels[selected.tipo]} · {fmtDate(selected.data)}</p>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[12px] mb-3">
                  <div><p className="text-gray-400">Valor total</p><p className="font-medium">{fmt(selected.valor)}</p></div>
                  <div><p className="text-gray-400">Elegível</p><p className="font-medium text-[#27500A]">{fmt(selected.valorElegivel)}</p></div>
                  <div><p className="text-gray-400">SEFAZ</p><p className={`font-medium ${selected.sefazOk ? 'text-[#27500A]' : 'text-[#791F1F]'}`}>{selected.sefazOk ? '✓ OK' : '✗ Inativo'}</p></div>
                  <div><p className="text-gray-400">Itens</p><p className="font-medium">{selected.itensElegiveis}/{selected.itensTotais}</p></div>
                </div>

                {selected.clienteVinculado && (
                  <div className="p-2.5 rounded-[7px] bg-[#EAF3DE] border border-[#97C459] text-[12px] mb-3">
                    <p className="font-medium text-[#27500A]">Alta prioridade — ROI corporativo</p>
                    <p className="text-[#27500A]/70">Cliente: {selected.clienteVinculado}</p>
                    {selected.roiEstimado && <p className="text-[#27500A]/70">ROI estimado: {selected.roiEstimado}×</p>}
                  </div>
                )}

                <div className="space-y-1.5 mb-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">Itens</p>
                  {mockItensNota.slice(0, selected.itensTotais).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-[12px]">
                      <span className="text-gray-700 truncate mr-2">{item.nome}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={item.elegivel ? 'green' : 'amber'}>{item.elegivel ? '✓' : '✗'}</Badge>
                        <span className="font-medium">{fmt(item.valor)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button variant="primary" size="sm" className="flex-1 justify-center">✓ Aprovar</Button>
                  <Button variant="ghost" size="sm" className="flex-1 justify-center text-[#791F1F] border-[#F09595]">✗ Recusar</Button>
                </div>
              </Card>

              <AIPanel>
                <p className="text-[12px] text-[#3C3489]/80">
                  Taxa de aprovação histórica: <strong>87.5%</strong>
                </p>
                <p className="text-[12px] text-[#3C3489]/80 mt-1">
                  Nenhum alerta de fraude associado a este funcionário.
                </p>
              </AIPanel>
            </>
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
