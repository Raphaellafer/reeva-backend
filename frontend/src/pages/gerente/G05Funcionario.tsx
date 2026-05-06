import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { MetricCard } from '../../components/ui/MetricCard'
import { Badge } from '../../components/ui/Badge'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { getStoredToken } from '../../hooks/useAuth'
import { getTeamEmployee } from '../../api'
import type { EmployeeProfile } from '../../types'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('pt-BR')

const categoryLabels: Record<string, string> = {
  FOOD: 'Refeição',
  TRANSPORT: 'Transporte',
  LODGING: 'Hospedagem',
  HARDWARE: 'Hardware',
  PURCHASE: 'Compra',
  OTHER: 'Outro',
}

const initials = (name: string) =>
  name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

export function G05Funcionario() {
  const { id } = useParams<{ id: string }>()
  const token = getStoredToken() ?? ''
  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getTeamEmployee(token, id)
      .then(setProfile)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token, id])

  if (loading) {
    return (
      <DesktopShell title="Perfil do funcionário" role="GERENTE">
        <p className="text-[13px] text-gray-400 py-8 text-center">Carregando...</p>
      </DesktopShell>
    )
  }

  if (error || !profile) {
    return (
      <DesktopShell title="Perfil do funcionário" role="GERENTE">
        <p className="text-[13px] text-red-500 py-8 text-center">{error ?? 'Funcionário não encontrado'}</p>
      </DesktopShell>
    )
  }

  return (
    <DesktopShell title={`Perfil: ${profile.name}`} role="GERENTE">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4">
        {/* Principal */}
        <div className="space-y-4">
          {/* Cabeçalho */}
          <Card>
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center text-[18px] font-medium shrink-0">
                {initials(profile.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[17px] font-medium text-[#1a1a2e]">{profile.name}</p>
                <p className="text-[13px] text-gray-400">{profile.email}</p>
                {profile.department && (
                  <p className="text-[12px] text-gray-400">Departamento: {profile.department}</p>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {profile.pendingCount > 0 && (
                  <Badge variant="amber">{profile.pendingCount} pendente(s)</Badge>
                )}
                <Badge variant="green">{profile.approvedCount} aprovada(s)</Badge>
              </div>
            </div>
          </Card>

          {/* Métricas */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <MetricCard label="Total reembolsado" value={fmt(profile.totalReimbursed)} />
            <MetricCard label="Aprovadas" value={profile.approvedCount} />
            <MetricCard label="Pendentes" value={profile.pendingCount} />
          </div>

          {/* Histórico */}
          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Notas recentes</p>
            {profile.recentExpenses.length === 0 ? (
              <p className="text-[13px] text-gray-400 py-4 text-center">Nenhuma nota encontrada</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] min-w-[480px]">
                  <thead>
                    <tr className="border-b border-black/[0.06]">
                      {['Título', 'Categoria', 'Data', 'Valor', 'Status'].map(h => (
                        <th key={h} className="text-left py-2.5 pr-3 text-[11px] uppercase tracking-wide text-gray-400 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {profile.recentExpenses.map(expense => (
                      <tr key={expense.id} className="border-b border-black/[0.04] hover:bg-gray-50">
                        <td className="py-3 pr-3 font-medium text-[#1a1a2e] truncate max-w-[180px]">{expense.title}</td>
                        <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">
                          {categoryLabels[expense.category] ?? expense.category}
                        </td>
                        <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">{fmtDate(expense.expenseDate)}</td>
                        <td className="py-3 pr-3 font-medium whitespace-nowrap">
                          {expense.amount != null ? fmt(expense.amount) : '—'}
                        </td>
                        <td className="py-3"><StatusBadge status={expense.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Informações</p>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="text-[#1a1a2e] font-medium truncate ml-2">{profile.email}</span>
              </div>
              {profile.department && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Departamento</span>
                  <span className="text-[#1a1a2e] font-medium">{profile.department}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Membro desde</span>
                <span className="text-[#1a1a2e] font-medium">{fmtDate(profile.createdAt)}</span>
              </div>
            </div>
          </Card>

          <Link to="/gerente/funcionarios">
            <Card className="text-center cursor-pointer hover:bg-gray-50">
              <p className="text-[13px] font-medium text-[#3C3489]">← Voltar à equipe</p>
            </Card>
          </Link>

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
