import React from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import { Button } from '../../components/ui/Button'
import { fmt } from '../../data/mock'

export function F05Perfil() {
  const navigate = useNavigate()

  function handleLogout() {
    localStorage.removeItem('reeva.role')
    navigate('/login')
  }

  return (
    <MobileShell>
      <div className="bg-white px-4 pt-4 pb-3 border-b border-black/[0.06]">
        <p className="text-[15px] font-medium text-[#1a1a2e]">Meu perfil</p>
      </div>

      <div className="px-4 py-6 space-y-4">
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="w-16 h-16 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center text-[22px] font-medium">
            AB
          </div>
          <p className="text-[16px] font-medium text-[#1a1a2e]">Ana Beatriz</p>
          <p className="text-[12px] text-gray-400">ana.beatriz@empresa.com</p>
          <p className="text-[11px] text-gray-400">Depto: Vendas</p>
        </div>

        <div className="bg-white rounded-[10px] border border-black/[0.07] divide-y divide-black/[0.06]">
          <div className="flex justify-between p-3">
            <p className="text-[12px] text-gray-500">Total reembolsado (mês)</p>
            <p className="text-[12px] font-medium text-[#1a1a2e]">{fmt(1240.50)}</p>
          </div>
          <div className="flex justify-between p-3">
            <p className="text-[12px] text-gray-500">Notas enviadas</p>
            <p className="text-[12px] font-medium text-[#1a1a2e]">8</p>
          </div>
          <div className="flex justify-between p-3">
            <p className="text-[12px] text-gray-500">Taxa de aprovação</p>
            <p className="text-[12px] font-medium text-[#27500A]">87.5%</p>
          </div>
        </div>

        <Button variant="ghost" className="w-full justify-center" onClick={handleLogout}>
          Sair da conta
        </Button>
      </div>
    </MobileShell>
  )
}
