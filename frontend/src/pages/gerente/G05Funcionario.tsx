import React, { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getTeamEmployee } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { getStoredToken } from '../../hooks/useAuth'
import { categoryLabels, fmt, fmtDate, initials, isApproved, isPending } from '../../realData'

export function G05Funcionario() {
  const { id } = useParams<{ id: string }>()
  const token = getStoredToken() ?? ''

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['team-employee', id],
    queryFn: () => getTeamEmployee(token, id!),
    enabled: !!token && !!id,
  })

  const approvalRate = useMemo(() => {
    if (!profile || profile.recentExpenses.length === 0) return 0
    const approved = profile.recentExpenses.filter(isApproved).length
    return Math.round((approved * 1000) / profile.recentExpenses.length) / 10
  }, [profile])

  if (isLoading) {
    return (
      <DesktopShell title="Perfil do funcionário" role="GERENTE">
        <p className="py-8 text-center text-[13px] text-gray-400">Carregando...</p>
      </DesktopShell>
    )
  }

  if (error || !profile) {
    return (
      <DesktopShell title="Perfil do funcionário" role="GERENTE">
        <p className="py-8 text-center text-[13px] text-red-500">{error instanceof Error ? error.message : 'Funcionário não encontrado'}</p>
      </DesktopShell>
    )
  }

  return (
    <DesktopShell title={`Perfil: ${profile.name}`} role="GERENTE">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1a1a2e] text-[18px] font-medium text-white">
                {initials(profile.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[17px] font-medium text-[#1a1a2e]">{profile.name}</p>
                <p className="text-[13px] text-gray-400">{profile.email}</p>
                <p className="text-[12px] text-gray-400">Departamento: {profile.department ?? 'Não informado'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.pendingCount > 0 && <Badge variant="amber">{profile.pendingCount} pendente(s)</Badge>}
                <Badge variant="green">{profile.approvedCount} aprovada(s)</Badge>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="Total reembolsado" value={fmt(profile.totalReimbursed)} />
            <MetricCard label="Aprovadas" value={profile.approvedCount} />
            <MetricCard label="Pendentes" value={profile.pendingCount} />
            <MetricCard label="Taxa recente" value={`${approvalRate}%`} />
          </div>

          <Card>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-medium text-[#1a1a2e]">Notas recentes</p>
                <p className="mt-0.5 text-[12px] text-gray-400">Últimas despesas enviadas pelo funcionário.</p>
              </div>
              {profile.recentExpenses.some(isPending) && <Badge variant="amber">Tem pendência</Badge>}
            </div>
            {profile.recentExpenses.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-gray-400">Nenhuma nota encontrada.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-[13px]">
                  <thead>
                    <tr className="border-b border-black/[0.06]">
                      {['Título', 'Categoria', 'Projeto', 'Data', 'Valor', 'Status'].map((header) => (
                        <th key={header} className="py-2.5 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {profile.recentExpenses.map((expense) => (
                      <tr key={expense.id} className="border-b border-black/[0.04] hover:bg-gray-50">
                        <td className="max-w-[190px] truncate py-3 pr-3 font-medium text-[#1a1a2e]">{expense.title}</td>
                        <td className="whitespace-nowrap py-3 pr-3 text-gray-500">{categoryLabels[expense.category] ?? expense.category}</td>
                        <td className="max-w-[160px] truncate py-3 pr-3 text-gray-500">{expense.projectName}</td>
                        <td className="whitespace-nowrap py-3 pr-3 text-gray-500">{fmtDate(expense.expenseDate)}</td>
                        <td className="whitespace-nowrap py-3 pr-3 font-medium">{expense.amount != null ? fmt(expense.amount) : '-'}</td>
                        <td className="py-3"><StatusBadge status={expense.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <p className="mb-3 text-[14px] font-medium text-[#1a1a2e]">Informações</p>
            <div className="space-y-2 text-[13px]">
              <InfoRow label="E-mail" value={profile.email} />
              <InfoRow label="CPF" value={formatCpf(profile.cpf)} />
              <InfoRow label="Telefone" value={formatPhone(profile.phoneCountryCode, profile.phoneNumber)} />
              <InfoRow label="Departamento" value={profile.department ?? 'Não informado'} />
              <InfoRow label="Membro desde" value={fmtDate(profile.createdAt)} />
            </div>
          </Card>

          <Card>
            <p className="mb-3 text-[14px] font-medium text-[#1a1a2e]">Atalhos</p>
            <div className="space-y-2">
              <Link to="/gerente/funcionarios" className="block rounded-[8px] border border-black/[0.08] px-3 py-2 text-center text-[13px] font-medium text-[#3C3489] hover:bg-[#F4F2FF]">
                Voltar à equipe
              </Link>
              <Link to="/gerente/aprovacoes" className="block rounded-[8px] border border-black/[0.08] px-3 py-2 text-center text-[13px] font-medium text-[#3C3489] hover:bg-[#F4F2FF]">
                Ver aprovações
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </DesktopShell>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-[#1a1a2e]">{value}</span>
    </div>
  )
}

function formatCpf(value: string | null) {
  if (!value) return 'Nao informado'
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 11) return value
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function formatPhone(countryCode: string | null, phoneNumber: string | null) {
  if (!phoneNumber) return 'Nao informado'
  const dialCode = ({
    BR: '+55',
    AR: '+54',
    CL: '+56',
    CO: '+57',
    MX: '+52',
    PT: '+351',
    ES: '+34',
    US: '+1',
    FR: '+33',
    GB: '+44',
  } as Record<string, string>)[countryCode ?? ''] ?? countryCode ?? ''
  return dialCode ? `${dialCode} ${phoneNumber}` : phoneNumber
}
