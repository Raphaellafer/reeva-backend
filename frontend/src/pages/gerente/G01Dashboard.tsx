import React from 'react'
import { Link } from 'react-router-dom'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { Badge } from '../../components/ui/Badge'
import { AIPanel } from '../../components/ui/AIPanel'
import { HorizontalBarChart } from '../../components/ui/HorizontalBarChart'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { mockFuncionarios, mockNotas, mockAlertas, fmt } from '../../data/mock'

const alertaVariant: Record<string, 'red' | 'amber' | 'blue'> = {
  CRITICO: 'red', MEDIO: 'amber', INFORMATIVO: 'blue',
}

const categoriaGastos = [
  { label: 'Refeição', value: 1240, color: '#97C459' },
  { label: 'Transporte', value: 820, color: '#85B7EB' },
  { label: 'Almoço corp.', value: 760, color: '#AFA9EC' },
  { label: 'Viagem', value: 2090, color: '#FAC775' },
]

const urgentes = mockNotas.filter(n => n.status === 'PENDENTE' || n.status === 'ANALISE_IA').slice(0, 3)
const totalReembolsado = mockFuncionarios.reduce((s, f) => s + f.totalReembolsado, 0)
const totalPendentes = mockFuncionarios.reduce((s, f) => s + f.pendentes, 0)
const taxaMedia = mockFuncionarios.reduce((s, f) => s + f.taxaAprovacao, 0) / mockFuncionarios.length

export function G01Dashboard() {
  return (
    <DesktopShell title="Dashboard da equipe" role="GERENTE">
      {/* Métricas — 2 col mobile, 4 col desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <MetricCard label="Total reembolsado" value={fmt(totalReembolsado)} trendValue="8%" trend="up" subtext="vs mês ant." />
        <MetricCard label="Notas pendentes" value={totalPendentes} subtext="aguardando aprovação" />
        <MetricCard label="Taxa de aprovação" value={`${taxaMedia.toFixed(0)}%`} trend="up" trendValue="3%" subtext="vs mês ant." />
        <MetricCard label="Alertas da IA" value={mockAlertas.length} subtext={`${mockAlertas.filter(a => a.nivel === 'CRITICO').length} crítico(s)`} />
      </div>

      {/* Layout principal — empilhado no mobile, lado a lado no desktop */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        {/* Coluna principal */}
        <div className="space-y-4">
          {/* Tabela de funcionários */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-medium text-[#1a1a2e]">Funcionários da equipe</p>
              <Link to="/gerente/notas" className="text-[12px] text-[#3C3489]">Ver todas notas</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[500px]">
                <thead>
                  <tr className="border-b border-black/[0.06]">
                    {['Funcionário', 'Notas', 'Aprovadas', 'Pendentes', 'Alertas', 'Total'].map(h => (
                      <th key={h} className="text-left py-2 text-[11px] uppercase tracking-wide text-gray-400 font-medium pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mockFuncionarios.map(f => (
                    <tr key={f.id} className="border-b border-black/[0.04] hover:bg-gray-50">
                      <td className="py-3 pr-3">
                        <Link to={`/gerente/funcionario/${f.id}`} className="flex items-center gap-2 hover:text-[#3C3489]">
                          <div className="w-7 h-7 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center text-[10px] font-medium shrink-0">
                            {f.iniciais}
                          </div>
                          <span className="font-medium text-[#1a1a2e] whitespace-nowrap">{f.nome}</span>
                        </Link>
                      </td>
                      <td className="py-3 pr-3 text-gray-600">{f.notasMes}</td>
                      <td className="py-3 pr-3 text-[#27500A] font-medium">{f.aprovadas}</td>
                      <td className="py-3 pr-3">
                        {f.pendentes > 0 ? <Badge variant="amber">{f.pendentes}</Badge> : <span className="text-gray-400">0</span>}
                      </td>
                      <td className="py-3 pr-3">
                        {f.alertas > 0 ? <Badge variant="red">{f.alertas}</Badge> : <span className="text-gray-400">0</span>}
                      </td>
                      <td className="py-3 font-medium text-[#1a1a2e]">{fmt(f.totalReembolsado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Aprovações urgentes */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-medium text-[#1a1a2e]">Aprovações urgentes</p>
              <Link to="/gerente/aprovacoes" className="text-[12px] text-[#3C3489]">Ver fila completa</Link>
            </div>
            <div className="space-y-2">
              {urgentes.map(nota => (
                <div key={nota.id} className="flex items-center gap-3 p-3 rounded-[7px] border border-black/[0.06] bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1a1a2e] truncate">{nota.estabelecimento}</p>
                    <p className="text-[11px] text-gray-400">{fmt(nota.valor)}</p>
                  </div>
                  <StatusBadge status={nota.status} />
                  <div className="flex gap-1.5 shrink-0">
                    <button className="w-8 h-8 rounded-full bg-[#EAF3DE] text-[#27500A] text-[15px] flex items-center justify-center hover:bg-[#97C459]/30">✓</button>
                    <button className="w-8 h-8 rounded-full bg-[#FCEBEB] text-[#791F1F] text-[15px] flex items-center justify-center hover:bg-[#F09595]/30">✗</button>
                  </div>
                </div>
              ))}
              {urgentes.length === 0 && (
                <p className="text-[13px] text-gray-400 text-center py-4">Nenhuma pendência</p>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar direita */}
        <div className="space-y-4">
          <AIPanel title="Alertas da IA">
            {mockAlertas.slice(0, 3).map(a => (
              <div key={a.id} className="flex gap-2 p-2.5 rounded-[7px] bg-white/60">
                <Badge variant={alertaVariant[a.nivel]} className="shrink-0 mt-0.5">{a.nivel}</Badge>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-[#3C3489] truncate">{a.titulo}</p>
                  <p className="text-[11px] text-[#3C3489]/70">{a.funcionarioNome}</p>
                </div>
              </div>
            ))}
            <Link to="/gerente/alertas" className="block text-center text-[12px] text-[#3C3489] mt-1">
              Ver todos alertas →
            </Link>
          </AIPanel>

          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Gasto por categoria</p>
            <HorizontalBarChart items={categoriaGastos} formatValue={v => fmt(v)} />
          </Card>
        </div>
      </div>
    </DesktopShell>
  )
}
