import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMyExpenses } from '../../api'
import { MobileShell } from '../../components/layout/MobileShell'
import { Button } from '../../components/ui/Button'
import { clearAuth, getStoredUser } from '../../hooks/useAuth'
import { fmt, initials, isActionRequired, isApproved, isPending } from '../../realData'
import { getToken } from '../../session'

export function F05Perfil() {
  const navigate = useNavigate()
  const token = getToken()
  const user = getStoredUser()
  const userName = user?.name ?? 'Funcionário'
  const userEmail = user?.email ?? ''

  const { data } = useQuery({
    queryKey: ['my-expenses'],
    queryFn: () => getMyExpenses(token!),
    enabled: !!token,
  })

  const expenses = data?.content ?? []

  function handleLogout() {
    clearAuth()
    navigate('/login')
  }

  const approved = expenses.filter(isApproved)
  const pending = expenses.filter(isPending)
  const actionRequired = expenses.filter(isActionRequired)
  const totalApproved = approved.reduce((sum, expense) => sum + (expense.amount ?? 0), 0)
  const approvalRate = expenses.length === 0 ? 0 : Math.round((approved.length * 1000) / expenses.length) / 10

  return (
    <MobileShell>
      <div className="border-b border-black/[0.06] bg-white px-4 pb-3 pt-4">
        <p className="text-[15px] font-medium text-[#1a1a2e]">Meu perfil</p>
      </div>

      <div className="space-y-4 px-4 py-6">
        <div className="flex flex-col items-center gap-2 rounded-[10px] border border-black/[0.07] bg-white py-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1a1a2e] text-[22px] font-medium text-white">
            {initials(userName)}
          </div>
          <div className="text-center">
            <p className="text-[16px] font-medium text-[#1a1a2e]">{userName}</p>
            <p className="text-[12px] text-gray-400">{userEmail}</p>
            <p className="mt-1 text-[11px] text-gray-400">Perfil: Funcionário</p>
          </div>
        </div>

        <div className="rounded-[10px] border border-black/[0.07] bg-white">
          <InfoRow label="Total aprovado" value={fmt(totalApproved)} />
          <InfoRow label="Notas enviadas" value={expenses.length} />
          <InfoRow label="Em andamento" value={pending.length} />
          <InfoRow label="A corrigir" value={actionRequired.length} highlight={actionRequired.length > 0} />
          <InfoRow label="Taxa de aprovação" value={`${approvalRate}%`} success />
        </div>

        <div className="rounded-[10px] border border-dashed border-black/[0.10] bg-white p-4">
          <p className="text-[13px] font-medium text-[#1a1a2e]">Reembolsos</p>
          <p className="mt-1 text-[12px] text-gray-500">
            As notas aprovadas pelo gestor aparecem na área de pagamento da empresa. Mantenha suas notas com dados completos para evitar devoluções.
          </p>
        </div>

        <Button variant="ghost" className="w-full justify-center" onClick={handleLogout}>
          Sair da conta
        </Button>
      </div>
    </MobileShell>
  )
}

function InfoRow({
  label,
  value,
  highlight = false,
  success = false,
}: {
  label: string
  value: React.ReactNode
  highlight?: boolean
  success?: boolean
}) {
  return (
    <div className="flex justify-between border-b border-black/[0.06] p-3 last:border-b-0">
      <p className="text-[12px] text-gray-500">{label}</p>
      <p className={`text-[12px] font-medium ${highlight ? 'text-[#633806]' : success ? 'text-[#27500A]' : 'text-[#1a1a2e]'}`}>
        {value}
      </p>
    </div>
  )
}
