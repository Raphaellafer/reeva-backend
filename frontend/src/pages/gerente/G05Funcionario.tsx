import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { Badge } from '../../components/ui/Badge'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { mockFuncionarios, mockNotas, mockAlertas, fmt, fmtDate, tipoLabels } from '../../data/mock'

export function G05Funcionario() {
  const { id } = useParams()
  const funcionario = mockFuncionarios.find(f => f.id === id) ?? mockFuncionarios[0]
  const alertasFuncionario = mockAlertas.filter(a => a.funcionarioNome === funcionario.nome)

  return (
    <DesktopShell title={`Perfil: ${funcionario.nome}`} role="GERENTE">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4">
        {/* Principal */}
        <div className="space-y-4">
          {/* Cabeçalho */}
          <Card>
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center text-[18px] font-medium shrink-0">
                {funcionario.iniciais}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[17px] font-medium text-[#1a1a2e]">{funcionario.nome}</p>
                <p className="text-[13px] text-gray-400">Departamento: {funcionario.departamento}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {funcionario.alertas > 0 && <Badge variant="red">{funcionario.alertas} alerta(s)</Badge>}
                <Badge variant="green">{funcionario.taxaAprovacao.toFixed(0)}% aprovação</Badge>
              </div>
            </div>
          </Card>

          {/* Métricas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard label="Total reembolsado" value={fmt(funcionario.totalReembolsado)} />
            <MetricCard label="Notas no mês" value={funcionario.notasMes} />
            <MetricCard label="Aprovadas" value={funcionario.aprovadas} />
            <MetricCard label="Pendentes" value={funcionario.pendentes} />
          </div>

          {/* Histórico */}
          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Histórico de notas</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[480px]">
                <thead>
                  <tr className="border-b border-black/[0.06]">
                    {['Estabelecimento', 'Tipo', 'Data', 'Valor', 'Status'].map(h => (
                      <th key={h} className="text-left py-2.5 pr-3 text-[11px] uppercase tracking-wide text-gray-400 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mockNotas.map(nota => (
                    <tr key={nota.id} className="border-b border-black/[0.04] hover:bg-gray-50">
                      <td className="py-3 pr-3 font-medium text-[#1a1a2e]">{nota.estabelecimento}</td>
                      <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">{tipoLabels[nota.tipo]}</td>
                      <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">{fmtDate(nota.data)}</td>
                      <td className="py-3 pr-3 font-medium whitespace-nowrap">{fmt(nota.valor)}</td>
                      <td className="py-3"><StatusBadge status={nota.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Limites mensais</p>
            {[
              { label: 'Refeição', usado: 113, limite: 300 },
              { label: 'Transporte', usado: 246, limite: 300 },
              { label: 'Viagem', usado: 0, limite: 1500 },
            ].map(({ label, usado, limite }) => (
              <div key={label} className="mb-3">
                <div className="flex justify-between text-[12px] mb-1">
                  <span className="text-gray-600">{label}</span>
                  <span className="text-gray-400">{fmt(usado)}/{fmt(limite)}</span>
                </div>
                <ProgressBar value={usado} max={limite} color={usado / limite > 0.8 ? '#F09595' : '#97C459'} />
              </div>
            ))}
          </Card>

          {alertasFuncionario.length > 0 && (
            <Card>
              <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Alertas da IA</p>
              <div className="space-y-2">
                {alertasFuncionario.map(a => (
                  <div key={a.id} className="p-2.5 rounded-[7px] bg-[#FCEBEB] border border-[#F09595]">
                    <p className="text-[12px] font-medium text-[#791F1F]">{a.titulo}</p>
                    <p className="text-[11px] text-[#791F1F]/70 mt-0.5">{a.descricao.slice(0, 60)}…</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Link to="/gerente/aprovacoes">
            <Card className="text-center cursor-pointer hover:bg-gray-50">
              <p className="text-[13px] font-medium text-[#3C3489]">Ver notas pendentes →</p>
            </Card>
          </Link>
        </div>
      </div>
    </DesktopShell>
  )
}
