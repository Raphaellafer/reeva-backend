import React, { useState } from 'react'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

const categorias = [
  { id: 'refeicao', label: 'Refeição', limite: 80, unidade: '/pessoa' },
  { id: 'almoco', label: 'Almoço corporativo', limite: 300, unidade: '/pessoa' },
  { id: 'transporte', label: 'Transporte', limite: 300, unidade: '/mês' },
  { id: 'viagem', label: 'Viagem', limite: 1500, unidade: '/mês' },
]

export function C05Config() {
  const [limites, setLimites] = useState(Object.fromEntries(categorias.map(c => [c.id, c.limite])))
  const [salvo, setSalvo] = useState(false)

  function salvar() {
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2000)
  }

  return (
    <DesktopShell title="Configurações gerais" role="CFO">
      <div className="max-w-3xl space-y-6">
        {/* Limites */}
        <Card>
          <p className="text-[14px] font-medium text-[#1a1a2e] mb-4">Limites por categoria</p>
          <div className="space-y-4">
            {categorias.map(cat => (
              <div key={cat.id} className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#1a1a2e]">{cat.label}</p>
                  <p className="text-[11px] text-gray-400">Limite por funcionário{cat.unidade}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-gray-400">R$</span>
                  <input
                    type="number"
                    value={limites[cat.id]}
                    onChange={e => setLimites(prev => ({ ...prev, [cat.id]: Number(e.target.value) }))}
                    className="w-24 text-[13px] border border-black/10 rounded-[7px] px-2.5 py-1.5 text-right focus:outline-none focus:border-[#1a1a2e]"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Políticas */}
        <Card>
          <p className="text-[14px] font-medium text-[#1a1a2e] mb-4">Políticas de reembolso</p>
          <div className="space-y-3 text-[13px]">
            {[
              { label: 'Exigir NF-e para valores acima de', value: 'R$ 50,00' },
              { label: 'Prazo máximo para envio de nota', value: '30 dias' },
              { label: 'Aprovação automática abaixo de', value: 'R$ 50,00' },
              { label: 'Validação SEFAZ obrigatória', value: 'Sempre' },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-black/[0.04] last:border-0">
                <span className="text-gray-600">{label}</span>
                <span className="font-medium text-[#1a1a2e] bg-gray-100 px-2.5 py-1 rounded-[5px]">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Integrações */}
        <Card>
          <p className="text-[14px] font-medium text-[#1a1a2e] mb-4">Integrações</p>
          <div className="space-y-3">
            {[
              { nome: 'Salesforce CRM', status: 'Conectado', cor: 'text-[#27500A]' },
              { nome: 'HubSpot', status: 'Conectado', cor: 'text-[#27500A]' },
              { nome: 'Pipedrive', status: 'Desconectado', cor: 'text-gray-400' },
              { nome: 'SAP (ERP)', status: 'Em configuração', cor: 'text-[#633806]' },
            ].map(({ nome, status, cor }) => (
              <div key={nome} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-black/[0.04] last:border-0">
                <span className="text-[13px] font-medium text-[#1a1a2e]">{nome}</span>
                <div className="flex items-center gap-3">
                  <span className={`text-[12px] ${cor}`}>{status}</span>
                  <Button variant="ghost" size="sm">Configurar</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Usuários */}
        <Card>
          <p className="text-[14px] font-medium text-[#1a1a2e] mb-4">Usuários e permissões</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[360px]">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  {['Nome', 'Email', 'Perfil', 'Ações'].map(h => (
                    <th key={h} className="text-left py-2.5 pr-3 text-[11px] uppercase tracking-wide text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { nome: 'Rafael Souza', email: 'rafael@empresa.com', perfil: 'Gerente' },
                  { nome: 'Juliana Marta', email: 'juliana@empresa.com', perfil: 'CFO' },
                  { nome: 'Ana Beatriz', email: 'ana@empresa.com', perfil: 'Funcionário' },
                ].map(u => (
                  <tr key={u.email} className="border-b border-black/[0.04] hover:bg-gray-50">
                    <td className="py-3 pr-3 font-medium text-[#1a1a2e] whitespace-nowrap">{u.nome}</td>
                    <td className="py-3 pr-3 text-gray-500">{u.email}</td>
                    <td className="py-3 pr-3 text-gray-600">{u.perfil}</td>
                    <td className="py-3">
                      <Button variant="ghost" size="sm">Editar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={salvar}>Salvar configurações</Button>
          {salvo && <span className="text-[13px] text-[#27500A]">✓ Salvo com sucesso!</span>}
        </div>
      </div>
    </DesktopShell>
  )
}
