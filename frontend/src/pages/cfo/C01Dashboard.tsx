import React from 'react'
import { Link } from 'react-router-dom'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { Badge } from '../../components/ui/Badge'
import { HorizontalBarChart } from '../../components/ui/HorizontalBarChart'
import { mockAlertas, fmt } from '../../data/mock'

const deptos = [
  { label: 'Vendas', value: 6760.50, color: '#97C459' },
  { label: 'Marketing', value: 680.00, color: '#85B7EB' },
  { label: 'Produto', value: 150.00, color: '#AFA9EC' },
  { label: 'RH', value: 320.00, color: '#FAC775' },
  { label: 'TI', value: 1200.00, color: '#F09595' },
]

const gerentes = [
  { nome: 'Rafael Souza', equipe: 'Vendas', total: 6760.50, compliance: 92, alertas: 1 },
  { nome: 'Mariana Costa', equipe: 'Marketing', total: 1000.00, compliance: 100, alertas: 0 },
  { nome: 'Bruno Alves', equipe: 'TI / Produto', total: 1350.00, compliance: 88, alertas: 2 },
]

const totalEmpresa = deptos.reduce((s, d) => s + d.value, 0)

export function C01Dashboard() {
  return (
    <DesktopShell title="Dashboard executivo" role="CFO">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <MetricCard label="Total reembolsado" value={fmt(totalEmpresa)} trend="up" trendValue="11%" subtext="vs mês ant." />
        <MetricCard label="Economia pela IA" value={fmt(1240)} trend="up" trendValue="fraudes + itens" subtext="bloqueados" />
        <MetricCard label="ROI médio almoços" value="4.1×" trend="up" trendValue="0.3×" subtext="vs mês ant." />
        <MetricCard label="Compliance geral" value="94%" subtext="3 alertas abertos" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
        {/* Principal */}
        <div className="space-y-4">
          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Reembolso por departamento</p>
            <HorizontalBarChart items={deptos} formatValue={v => fmt(v)} />
          </Card>

          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Gerentes</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[400px]">
                <thead>
                  <tr className="border-b border-black/[0.06]">
                    {['Gerente', 'Equipe', 'Total', 'Compliance', 'Alertas'].map(h => (
                      <th key={h} className="text-left py-2.5 pr-3 text-[11px] uppercase tracking-wide text-gray-400 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gerentes.map(g => (
                    <tr key={g.nome} className="border-b border-black/[0.04] hover:bg-gray-50">
                      <td className="py-3 pr-3 font-medium text-[#1a1a2e] whitespace-nowrap">{g.nome}</td>
                      <td className="py-3 pr-3 text-gray-500">{g.equipe}</td>
                      <td className="py-3 pr-3 font-medium whitespace-nowrap">{fmt(g.total)}</td>
                      <td className="py-3 pr-3">
                        <Badge variant={g.compliance >= 95 ? 'green' : g.compliance >= 85 ? 'amber' : 'red'}>
                          {g.compliance}%
                        </Badge>
                      </td>
                      <td className="py-3">
                        {g.alertas > 0 ? <Badge variant="red">{g.alertas}</Badge> : <span className="text-gray-400">0</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-[10px] border border-[#AFA9EC] p-4" style={{ background: '#EEEDFE' }}>
            <p className="text-[11px] font-medium text-[#3C3489] uppercase tracking-wide mb-1">ROI almoços corporativos</p>
            <p className="text-[40px] font-medium text-[#3C3489] leading-none">4.1×</p>
            <p className="text-[12px] text-[#3C3489]/60 mt-1">Receita atribuída: {fmt(92000)}</p>
            <p className="text-[12px] text-[#3C3489]/60">Custo total: {fmt(1720)}</p>
            <Link to="/cfo/roi" className="mt-3 block text-[12px] font-medium text-[#3C3489]">
              Ver detalhes de ROI →
            </Link>
          </div>

          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Economia gerada pela IA</p>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-gray-500">Fraudes bloqueadas</span>
                <span className="font-medium text-[#791F1F]">{fmt(180)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Itens inelegíveis</span>
                <span className="font-medium text-[#633806]">{fmt(560)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Horas RH economizadas</span>
                <span className="font-medium text-[#27500A]">{fmt(500)}</span>
              </div>
              <div className="flex justify-between border-t border-black/[0.06] pt-2 mt-1">
                <span className="font-medium">Total</span>
                <span className="font-medium text-[#27500A]">{fmt(1240)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-2">Alertas críticos</p>
            {mockAlertas.filter(a => a.nivel === 'CRITICO').map(a => (
              <div key={a.id} className="p-2.5 rounded-[7px] bg-[#FCEBEB] border border-[#F09595]">
                <p className="text-[12px] font-medium text-[#791F1F]">{a.titulo}</p>
                <p className="text-[11px] text-[#791F1F]/70">{a.funcionarioNome}</p>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </DesktopShell>
  )
}
