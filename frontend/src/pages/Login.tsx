import React from 'react'
import { useNavigate } from 'react-router-dom'
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
    title: 'Funcionário',
    subtitle: 'Envio de notas fiscais',
    description: 'Envie notas, acompanhe reembolsos e veja seu histórico pessoal.',
    route: '/funcionario',
    icon: '👤',
  },
  {
    role: 'GERENTE',
    title: 'Gerente',
    subtitle: 'Aprovação de equipe',
    description: 'Aprove notas da sua equipe, gerencie alertas da IA e veja relatórios.',
    route: '/gerente',
    icon: '👥',
  },
  {
    role: 'CFO',
    title: 'CFO / Diretor',
    subtitle: 'Visão executiva',
    description: 'Dashboard macro, ROI corporativo, compliance e relatórios para o board.',
    route: '/cfo',
    icon: '📊',
  },
]

export function Login() {
  const navigate = useNavigate()

  function select(profile: ProfileCard) {
    localStorage.setItem('reeva.role', profile.role)
    navigate(profile.route)
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center p-6">
      <div className="mb-10 text-center">
        <p className="text-[13px] font-medium text-[#AFA9EC] uppercase tracking-widest mb-2">Demo</p>
        <h1 className="text-[32px] font-medium text-white leading-tight">Reeva</h1>
        <p className="text-[14px] text-white/50 mt-2">Gestão de reembolso corporativo com IA</p>
      </div>

      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-4">
        {profiles.map((p) => (
          <button
            key={p.role}
            onClick={() => select(p)}
            className="group text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#AFA9EC] rounded-[10px] p-5 transition-all duration-200"
          >
            <div className="text-3xl mb-3">{p.icon}</div>
            <p className="text-[15px] font-medium text-white">{p.title}</p>
            <p className="text-[11px] text-[#AFA9EC] mb-2">{p.subtitle}</p>
            <p className="text-[12px] text-white/50 leading-relaxed">{p.description}</p>
            <p className="mt-4 text-[11px] font-medium text-[#AFA9EC] group-hover:text-white transition-colors">
              Entrar →
            </p>
          </button>
        ))}
      </div>

      <p className="mt-10 text-[11px] text-white/20">Modo demo — sem autenticação real</p>
    </div>
  )
}
