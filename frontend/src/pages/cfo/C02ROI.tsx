import React from 'react'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { Badge } from '../../components/ui/Badge'
import { HorizontalBarChart } from '../../components/ui/HorizontalBarChart'
import { mockRoiClientes, fmt, fmtDate } from '../../data/mock'

const statusRoiVariant: Record<string, 'green' | 'amber' | 'red'> = {
  FECHADO: 'green', EM_NEGOCIACAO: 'amber', PERDIDO: 'red',
}
const statusRoiLabel: Record<string, string> = {
  FECHADO: 'Fechado', EM_NEGOCIACAO: 'Em negociação', PERDIDO: 'Perdido',
}

function roiColor(roi: number): string {
  if (roi > 5) return '#27500A'
  if (roi >= 3) return '#97C459'
  if (roi > 0) return '#EF9F27'
  return '#F09595'
}

const roiBarItems = mockRoiClientes.map(c => ({
  label: c.cliente,
  value: c.roi,
  color: roiColor(c.roi),
}))

const totalReceita = mockRoiClientes.reduce((s, c) => s + c.receita, 0)
const totalInvestido = mockRoiClientes.reduce((s, c) => s + c.investido, 0)
const roiMedio = totalInvestido > 0 ? totalReceita / totalInvestido : 0
const reunioesFechadas = mockRoiClientes.filter(c => c.status === 'FECHADO').length

export function C02ROI() {
  return (
    <DesktopShell title="ROI Corporativo" role="CFO">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <MetricCard label="ROI médio" value={`${roiMedio.toFixed(1)}×`} trend="up" trendValue="0.5×" subtext="vs mês ant." />
        <MetricCard label="Receita atribuída" value={fmt(totalReceita)} />
        <MetricCard label="Reuniões rastreadas" value={mockRoiClientes.length} subtext={`${reunioesFechadas} fechadas`} />
        <MetricCard label="Custo total" value={fmt(totalInvestido)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
        <div className="space-y-4">
          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-1">ROI por cliente</p>
            <div className="flex flex-wrap gap-3 mb-3 text-[11px] text-gray-500">
              {[['#27500A','>5×'],['#97C459','3–5×'],['#EF9F27','<3×'],['#F09595','0×']].map(([c,l]) => (
                <span key={l} className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: c }} /> {l}
                </span>
              ))}
            </div>
            <HorizontalBarChart items={roiBarItems} formatValue={v => `${v.toFixed(1)}×`} />
          </Card>

          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Melhores reuniões</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[580px]">
                <thead>
                  <tr className="border-b border-black/[0.06]">
                    {['Cliente', 'Vendedor', 'Data', 'Investido', 'Receita', 'ROI', 'Status'].map(h => (
                      <th key={h} className="text-left py-2.5 pr-3 text-[11px] uppercase tracking-wide text-gray-400 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mockRoiClientes.map((c, i) => (
                    <tr key={i} className="border-b border-black/[0.04] hover:bg-gray-50">
                      <td className="py-3 pr-3 font-medium text-[#1a1a2e] whitespace-nowrap">{c.cliente}</td>
                      <td className="py-3 pr-3 text-gray-600 whitespace-nowrap">{c.vendedor}</td>
                      <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">{fmtDate(c.data)}</td>
                      <td className="py-3 pr-3 whitespace-nowrap">{fmt(c.investido)}</td>
                      <td className="py-3 pr-3 font-medium text-[#27500A] whitespace-nowrap">{fmt(c.receita)}</td>
                      <td className="py-3 pr-3">
                        <span className="font-medium" style={{ color: roiColor(c.roi) }}>{c.roi.toFixed(1)}×</span>
                      </td>
                      <td className="py-3">
                        <Badge variant={statusRoiVariant[c.status]}>{statusRoiLabel[c.status]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="rounded-[10px] border border-[#97C459] p-4 bg-[#EAF3DE]">
            <p className="text-[11px] font-medium text-[#27500A] uppercase tracking-wide mb-1">Melhor cliente</p>
            <p className="text-[15px] font-medium text-[#27500A]">{mockRoiClientes[0].cliente}</p>
            <p className="text-[36px] font-medium text-[#27500A] leading-none my-1">{mockRoiClientes[0].roi.toFixed(1)}×</p>
            <p className="text-[12px] text-[#27500A]/60">ROI sobre o investimento</p>
            <div className="mt-3 space-y-1.5 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[#27500A]/60">Almoço</span>
                <span className="font-medium text-[#27500A]">{fmtDate(mockRoiClientes[0].data)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#27500A]/60">Proposta enviada</span>
                <span className="font-medium text-[#27500A]">2 dias depois</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#27500A]/60">Contrato assinado</span>
                <span className="font-medium text-[#27500A]">12 dias depois</span>
              </div>
            </div>
          </div>

          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-2">Recomendação da IA</p>
            <div className="space-y-2 text-[13px]">
              <div className="p-2.5 rounded-[7px] bg-[#EAF3DE] border border-[#97C459]">
                <p className="font-medium text-[#27500A]">Aumentar investimento em</p>
                <p className="text-[#27500A]/70">Empresa ABC Ltda — ROI 5.5× consistente</p>
              </div>
              <div className="p-2.5 rounded-[7px] bg-[#FCEBEB] border border-[#F09595]">
                <p className="font-medium text-[#791F1F]">Revisar relacionamento com</p>
                <p className="text-[#791F1F]/70">Distribuidora Norte — 0 receita gerada</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DesktopShell>
  )
}
