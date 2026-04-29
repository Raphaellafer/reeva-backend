import React, { useState } from 'react'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { mockNotas, fmt, fmtDate, tipoLabels } from '../../data/mock'

const deptos = ['Todos', 'Vendas', 'Marketing', 'Produto', 'TI']

export function C04Notas() {
  const [filtroDepto, setFiltroDepto] = useState('Todos')

  return (
    <DesktopShell title="Todas as notas — empresa" role="CFO">
      <div className="flex flex-wrap gap-2 mb-4">
        {deptos.map(d => (
          <button
            key={d}
            onClick={() => setFiltroDepto(d)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${filtroDepto === d ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'text-gray-500 border-gray-200 hover:border-gray-400 bg-white'}`}
          >
            {d}
          </button>
        ))}
      </div>

      <Card>
        <p className="text-[12px] text-gray-500 mb-3">{mockNotas.length} nota(s) — visão global</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[640px]">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {['Funcionário', 'Depto', 'Gerente', 'Estabelecimento', 'Tipo', 'Data', 'Valor', 'Status'].map(h => (
                  <th key={h} className="text-left py-2.5 pr-3 text-[11px] uppercase tracking-wide text-gray-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockNotas.map(nota => (
                <tr key={nota.id} className="border-b border-black/[0.04] hover:bg-gray-50">
                  <td className="py-3 pr-3 font-medium text-[#1a1a2e] whitespace-nowrap">Ana Beatriz</td>
                  <td className="py-3 pr-3 text-gray-500">Vendas</td>
                  <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">Rafael Souza</td>
                  <td className="py-3 pr-3 text-gray-700 max-w-[120px] truncate">{nota.estabelecimento}</td>
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
    </DesktopShell>
  )
}
