import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyExpenses } from '../../api'
import { MobileShell } from '../../components/layout/MobileShell'
import { Button } from '../../components/ui/Button'
import { clearSession, getToken, getUserName } from '../../session'
import { fmt, initials, isApproved } from '../../realData'
import type { ExpenseResponse } from '../../types'

export function F05Perfil() {
  const navigate = useNavigate()
  const userName = getUserName()
  const userEmail = localStorage.getItem('reeva.userEmail') ?? ''
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([])

  useEffect(() => {
    const token = getToken()
    if (!token) return
    getMyExpenses(token).then((page) => setExpenses(page.content)).catch(() => undefined)
  }, [])

  function handleLogout() {
    clearSession()
    navigate('/login')
  }

  const approved = expenses.filter(isApproved)
  const totalApproved = approved.reduce((sum, expense) => sum + (expense.amount ?? 0), 0)
  const approvalRate = expenses.length === 0 ? 0 : Math.round((approved.length * 1000) / expenses.length) / 10

  return (
    <MobileShell>
      <div className="bg-white px-4 pt-4 pb-3 border-b border-black/[0.06]">
        <p className="text-[15px] font-medium text-[#1a1a2e]">Meu perfil</p>
      </div>

      <div className="px-4 py-6 space-y-4">
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="w-16 h-16 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center text-[22px] font-medium">
            {initials(userName)}
          </div>
          <p className="text-[16px] font-medium text-[#1a1a2e]">{userName}</p>
          <p className="text-[12px] text-gray-400">{userEmail}</p>
          <p className="text-[11px] text-gray-400">Perfil: Funcionario</p>
        </div>

        <div className="bg-white rounded-[10px] border border-black/[0.07] divide-y divide-black/[0.06]">
          <div className="flex justify-between p-3">
            <p className="text-[12px] text-gray-500">Total aprovado</p>
            <p className="text-[12px] font-medium text-[#1a1a2e]">{fmt(totalApproved)}</p>
          </div>
          <div className="flex justify-between p-3">
            <p className="text-[12px] text-gray-500">Notas enviadas</p>
            <p className="text-[12px] font-medium text-[#1a1a2e]">{expenses.length}</p>
          </div>
          <div className="flex justify-between p-3">
            <p className="text-[12px] text-gray-500">Taxa de aprovacao</p>
            <p className="text-[12px] font-medium text-[#27500A]">{approvalRate}%</p>
          </div>
        </div>

        <Button variant="ghost" className="w-full justify-center" onClick={handleLogout}>
          Sair da conta
        </Button>
      </div>
    </MobileShell>
  )
}
