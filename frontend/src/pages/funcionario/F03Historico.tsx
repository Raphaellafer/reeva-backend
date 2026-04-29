import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { mockNotas, fmt, fmtDate, tipoLabels } from '../../data/mock'
import type { NotaStatus } from '../../types/index'

type Filtro = 'TODOS' | NotaStatus

const statusBorder: Record<string, string> = {
  APROVADO:   'border-l-[#97C459]',
  PENDENTE:   'border-l-[#FAC775]',
  REJEITADO:  'border-l-[#F09595]',
  ANALISE_IA: 'border-l-[#AFA9EC]',
}

const filtros: { id: Filtro; label: string }[] = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'PENDENTE', label: 'Pendentes' },
  { id: 'APROVADO', label: 'Aprovados' },
  { id: 'REJEITADO', label: 'Rejeitados' },
]

function groupByMonth(notas: typeof mockNotas) {
  const map: Record<string, typeof mockNotas> = {}
  notas.forEach(n => {
    const key = n.data.slice(0, 7)
    if (!map[key]) map[key] = []
    map[key].push(n)
  })
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
}

function monthLabel(key: string) {
  const [year, month] = key.split('-')
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  return `${months[parseInt(month) - 1]} ${year}`
}

export function F03Historico() {
  const [filtro, setFiltro] = useState<Filtro>('TODOS')

  const filtered = filtro === 'TODOS'
    ? mockNotas
    : mockNotas.filter(n => {
        if (filtro === 'PENDENTE') return n.status === 'PENDENTE' || n.status === 'ANALISE_IA'
        return n.status === filtro
      })

  const grupos = groupByMonth(filtered)

  return (
    <MobileShell>
      <div className="bg-white px-4 pt-4 pb-3 border-b border-black/[0.06]">
        <p className="text-[15px] font-medium text-[#1a1a2e]">Histórico de notas</p>
      </div>

      {/* Filtros */}
      <div className="bg-white px-4 py-2.5 flex gap-2 overflow-x-auto border-b border-black/[0.06]">
        {filtros.map(f => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
              filtro === f.id
                ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]'
                : 'text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-5">
        {grupos.length === 0 && (
          <p className="text-center text-[13px] text-gray-400 py-8">Nenhuma nota encontrada.</p>
        )}

        {grupos.map(([monthKey, notas]) => (
          <div key={monthKey}>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2">
              {monthLabel(monthKey)}
            </p>
            <div className="space-y-2">
              {notas.map(nota => (
                <Link
                  key={nota.id}
                  to={`/funcionario/nota/${nota.id}`}
                  className={`block bg-white rounded-[10px] border border-black/[0.07] border-l-4 ${statusBorder[nota.status]} p-3`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[#1a1a2e] truncate">{nota.estabelecimento}</p>
                      <p className="text-[11px] text-gray-400">{tipoLabels[nota.tipo]} · {fmtDate(nota.data)}</p>

                      {nota.status === 'REJEITADO' && (
                        <div className="mt-1.5 bg-[#FCEBEB] border border-[#F09595] rounded-[5px] px-2 py-1">
                          <p className="text-[10px] text-[#791F1F]">Rejeitado: CNPJ inativo no SEFAZ</p>
                        </div>
                      )}
                      {(nota.status === 'PENDENTE' || nota.status === 'ANALISE_IA') && (
                        <p className="text-[10px] text-[#633806] mt-1">Aguardando gerente · enviado há 2h</p>
                      )}
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
        ))}
      </div>
    </MobileShell>
  )
}
