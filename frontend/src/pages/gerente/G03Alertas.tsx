import React, { useState } from 'react'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { mockAlertas, fmt } from '../../data/mock'
import type { AlertaNivel } from '../../types/index'

const alertaConfig: Record<AlertaNivel, { variant: 'red' | 'amber' | 'blue'; label: string; bg: string; border: string }> = {
  CRITICO:     { variant: 'red',  label: 'Crítico',     bg: 'bg-[#FCEBEB]',  border: 'border-[#F09595]' },
  MEDIO:       { variant: 'amber',label: 'Médio',       bg: 'bg-[#FAEEDA]',  border: 'border-[#FAC775]' },
  INFORMATIVO: { variant: 'blue', label: 'Informativo', bg: 'bg-[#E6F1FB]',  border: 'border-[#85B7EB]' },
}

export function G03Alertas() {
  const [notif, setNotif] = useState({ fraude: true, limite: true, semanal: false })

  return (
    <DesktopShell title="Alertas da IA" role="GERENTE">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4">
        {/* Lista de alertas */}
        <div className="space-y-3">
          {mockAlertas.map(alerta => {
            const cfg = alertaConfig[alerta.nivel]
            return (
              <div key={alerta.id} className={`rounded-[10px] border p-4 md:p-5 ${cfg.bg} ${cfg.border}`}>
                <div className="flex flex-wrap items-start gap-3 mb-3">
                  <Badge variant={cfg.variant} className="shrink-0 mt-0.5">{cfg.label}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[#1a1a2e]">{alerta.titulo}</p>
                    <p className="text-[12px] text-gray-500 mt-0.5">Funcionário: {alerta.funcionarioNome}</p>
                  </div>
                  <span className="text-[13px] font-medium text-[#1a1a2e]">{fmt(alerta.valor)}</span>
                </div>

                <p className="text-[13px] text-gray-700 mb-3">{alerta.descricao}</p>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-[11px] text-gray-500">Notas relacionadas:</span>
                  {alerta.notasRelacionadas.map(id => (
                    <Badge key={id} variant="gray">#{id}</Badge>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {alerta.nivel === 'CRITICO' && (
                    <Button variant="primary" size="sm">Bloquear funcionário</Button>
                  )}
                  {alerta.nivel === 'MEDIO' && (
                    <Button variant="primary" size="sm">Notificar funcionário</Button>
                  )}
                  <Button variant="ghost" size="sm">Dispensar alerta</Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Sidebar direita */}
        <div className="space-y-4">
          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Resumo do mês</p>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-gray-500">Fraudes bloqueadas</span>
                <span className="font-medium text-[#791F1F]">1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Itens inelegíveis</span>
                <span className="font-medium text-[#633806]">7</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Valor recuperado</span>
                <span className="font-medium text-[#27500A]">{fmt(520)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Alertas abertos</span>
                <span className="font-medium">{mockAlertas.length}</span>
              </div>
            </div>
          </Card>

          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Notificações</p>
            <div className="space-y-4">
              {[
                { key: 'fraude', label: 'Fraude detectada', desc: 'Alerta imediato' },
                { key: 'limite', label: 'Limite próximo', desc: '80% do teto' },
                { key: 'semanal', label: 'Resumo semanal', desc: 'Toda segunda-feira' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-medium text-[#1a1a2e]">{label}</p>
                    <p className="text-[11px] text-gray-400">{desc}</p>
                  </div>
                  <button
                    onClick={() => setNotif(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                    className={`shrink-0 rounded-full transition-colors relative ${notif[key as keyof typeof notif] ? 'bg-[#1a1a2e]' : 'bg-gray-200'}`}
                    style={{ width: 40, height: 22 }}
                  >
                    <span className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform ${notif[key as keyof typeof notif] ? 'translate-x-[20px]' : 'translate-x-[3px]'}`} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DesktopShell>
  )
}
