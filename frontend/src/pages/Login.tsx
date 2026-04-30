import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { startDemoSession } from '../session'
import type { UserRole } from '../types/index'

interface ProfileCard {
  role: UserRole
  title: string
  subtitle: string
  description: string
  route: string
  icon: string
}

const profiles: ProfileCard[] = [
  {
    role: 'FUNCIONARIO',
    title: 'Funcionario',
    subtitle: 'Envio de notas fiscais',
    description: 'Envie notas, acompanhe reembolsos e veja seu historico pessoal.',
    route: '/funcionario',
    icon: 'F',
  },
  {
    role: 'GERENTE',
    title: 'Gerente',
    subtitle: 'Aprovacao de equipe',
    description: 'Aprove notas da sua equipe, gerencie alertas da IA e veja relatorios.',
    route: '/gerente',
    icon: 'G',
  },
  {
    role: 'CFO',
    title: 'CFO / Diretor',
    subtitle: 'Visao executiva',
    description: 'Dashboard macro, ROI corporativo, compliance e relatorios para o board.',
    route: '/cfo',
    icon: 'C',
  },
]

export function Login() {
  const navigate = useNavigate()
  const [loadingRole, setLoadingRole] = useState<UserRole | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function select(profile: ProfileCard) {
    setLoadingRole(profile.role)
    setError(null)
    try {
      await startDemoSession(profile.role)
      navigate(profile.route)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel entrar.')
    } finally {
      setLoadingRole(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center p-6">
      <div className="mb-10 text-center">
        <p className="text-[13px] font-medium text-[#AFA9EC] uppercase tracking-widest mb-2">Demo</p>
        <h1 className="text-[32px] font-medium text-white leading-tight">Reeva</h1>
        <p className="text-[14px] text-white/50 mt-2">Gestao de reembolso corporativo com IA</p>
      </div>

      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-4">
        {profiles.map((p) => (
          <button
            key={p.role}
            onClick={() => void select(p)}
            className="group text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#AFA9EC] rounded-[10px] p-5 transition-all duration-200"
          >
            <div className="text-3xl mb-3">{p.icon}</div>
            <p className="text-[15px] font-medium text-white">{p.title}</p>
            <p className="text-[11px] text-[#AFA9EC] mb-2">{p.subtitle}</p>
            <p className="text-[12px] text-white/50 leading-relaxed">{p.description}</p>
            <p className="mt-4 text-[11px] font-medium text-[#AFA9EC] group-hover:text-white transition-colors">
              {loadingRole === p.role ? 'Entrando...' : 'Entrar ->'}
            </p>
          </button>
        ))}
      </div>

      {error && <p className="mt-6 text-[12px] text-[#F09595]">{error}</p>}
      <p className="mt-10 text-[11px] text-white/20">Modo demo com usuarios reais do banco</p>
    </div>
  )
}
