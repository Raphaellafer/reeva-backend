import React, { useState } from 'react'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { Badge } from '../../components/ui/Badge'
import { fmt } from '../../data/mock'

const funcionariosRisco = [
  { nome: 'Diego Souza', depto: 'Produto', notas: 3, fraudes: 1, inelegiveis: 2, recuperado: 180, risco: 'Alto' },
  { nome: 'Carlos Menezes', depto: 'Vendas', notas: 12, fraudes: 0, inelegiveis: 5, recuperado: 340, risco: 'Médio' },
  { nome: 'Ana Beatriz', depto: 'Vendas', notas: 8, fraudes: 0, inelegiveis: 0, recuperado: 0, risco: 'Baixo' },
  { nome: 'Priscila Rocha', depto: 'Marketing', notas: 5, fraudes: 0, inelegiveis: 0, recuperado: 0, risco: 'Baixo' },
  { nome: 'Fernanda Lima', depto: 'Vendas', notas: 9, fraudes: 0, inelegiveis: 0, recuperado: 0, risco: 'Baixo' },
]

const riscoVariant: Record<string, 'red' | 'amber' | 'green'> = {
  Alto: 'red', Médio: 'amber', Baixo: 'green',
}

export function C03Compliance() {
  const [relatorios, setRelatorios] = useState({
    executivoMensal: true, alertaImediato: true, resumoSemanal: false, benchmark: false,
  })

  return (
    <DesktopShell title="Compliance financeiro" role="CFO">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <MetricCard label="Total processado" value={fmt(10110.50)} />
        <MetricCard label="Aprovadas pela IA" value="84%" trend="up" trendValue="2%" subtext="taxa automação" />
        <MetricCard label="Fraudes bloqueadas" value={1} subtext={fmt(180) + ' recuperado'} />
        <MetricCard label="Compliance geral" value="94%" trend="up" trendValue="1%" subtext="vs mês ant." />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4">
        <div className="space-y-4">
          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Funcionários por nível de risco</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[560px]">
                <thead>
                  <tr className="border-b border-black/[0.06]">
                    {['Funcionário', 'Depto', 'Notas', 'Fraudes', 'Inelegíveis', 'Recuperado', 'Risco'].map(h => (
                      <th key={h} className="text-left py-2.5 pr-3 text-[11px] uppercase tracking-wide text-gray-400 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {funcionariosRisco.map(f => (
                    <tr key={f.nome} className="border-b border-black/[0.04] hover:bg-gray-50">
                      <td className="py-3 pr-3 font-medium text-[#1a1a2e] whitespace-nowrap">{f.nome}</td>
                      <td className="py-3 pr-3 text-gray-500">{f.depto}</td>
                      <td className="py-3 pr-3 text-gray-600">{f.notas}</td>
                      <td className="py-3 pr-3">
                        {f.fraudes > 0 ? <Badge variant="red">{f.fraudes}</Badge> : <span className="text-gray-400">0</span>}
                      </td>
                      <td className="py-3 pr-3">
                        {f.inelegiveis > 0 ? <Badge variant="amber">{f.inelegiveis}</Badge> : <span className="text-gray-400">0</span>}
                      </td>
                      <td className="py-3 pr-3 font-medium text-[#27500A] whitespace-nowrap">
                        {f.recuperado > 0 ? fmt(f.recuperado) : '—'}
                      </td>
                      <td className="py-3">
                        <Badge variant={riscoVariant[f.risco]}>{f.risco}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Relatórios automáticos</p>
            <div className="space-y-4">
              {[
                { key: 'executivoMensal', label: 'Relatório executivo mensal', desc: 'Enviado ao board no início de cada mês' },
                { key: 'alertaImediato', label: 'Alerta crítico imediato', desc: 'E-mail + WhatsApp ao detectar fraude' },
                { key: 'resumoSemanal', label: 'Resumo semanal para gerentes', desc: 'Toda segunda-feira às 8h' },
                { key: 'benchmark', label: 'Benchmark departamental', desc: 'Comparativo mensal entre equipes' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between gap-4 py-2 border-b border-black/[0.04] last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1a1a2e]">{label}</p>
                    <p className="text-[12px] text-gray-400">{desc}</p>
                  </div>
                  <button
                    onClick={() => setRelatorios(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                    className={`shrink-0 rounded-full transition-colors relative ${relatorios[key as keyof typeof relatorios] ? 'bg-[#1a1a2e]' : 'bg-gray-200'}`}
                    style={{ width: 40, height: 22 }}
                  >
                    <span className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform ${relatorios[key as keyof typeof relatorios] ? 'translate-x-[20px]' : 'translate-x-[3px]'}`} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Economia total</p>
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
                <span className="text-gray-500">Automação RH</span>
                <span className="font-medium">{fmt(500)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-1 font-medium">
                <span>Total</span>
                <span className="text-[#27500A]">{fmt(1240)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Integrações CRM</p>
            <div className="space-y-3">
              {[
                { nome: 'Salesforce', status: true },
                { nome: 'HubSpot', status: true },
                { nome: 'Pipedrive', status: false },
              ].map(({ nome, status }) => (
                <div key={nome} className="flex items-center justify-between text-[13px]">
                  <span className="text-gray-700">{nome}</span>
                  <Badge variant={status ? 'green' : 'gray'}>{status ? '● Conectado' : '○ Desconectado'}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DesktopShell>
  )
}
