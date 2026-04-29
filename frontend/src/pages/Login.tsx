import React, { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api'
import { mapRole, roleToRoute } from '../types/index'
import { persistAuth } from '../hooks/useAuth'
import type { BackendRole } from '../types/index'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const auth = await login(email, password)
      const frontendRole = mapRole(auth.role as BackendRole)
      persistAuth(auth, frontendRole)
      navigate(roleToRoute(frontendRole), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar. Verifique suas credenciais.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <p className="text-[12px] font-medium text-[#AFA9EC] uppercase tracking-widest mb-2">
          Gestão de reembolso corporativo
        </p>
        <h1 className="text-[36px] font-medium text-white leading-tight">Reeva</h1>
      </div>

      {/* Card de login */}
      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-[14px] p-6">
        <p className="text-[15px] font-medium text-white mb-5">Entrar na sua conta</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] text-white/50 mb-1.5">E-mail corporativo</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              className="w-full bg-white/10 border border-white/10 rounded-[8px] px-3 py-2.5 text-[14px] text-white placeholder-white/25 focus:outline-none focus:border-[#AFA9EC] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[12px] text-white/50 mb-1.5">Senha</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/10 border border-white/10 rounded-[8px] px-3 py-2.5 text-[14px] text-white placeholder-white/25 focus:outline-none focus:border-[#AFA9EC] transition-colors"
            />
          </div>

          {error && (
            <div className="rounded-[8px] bg-[#FCEBEB]/10 border border-[#F09595]/40 px-3 py-2.5">
              <p className="text-[12px] text-[#F09595]">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-[#1a1a2e] rounded-[8px] py-2.5 text-[14px] font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity mt-1"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-5 text-[11px] text-white/20 text-center leading-relaxed">
          Acesso restrito a usuários cadastrados pela empresa.<br />
          Fale com o administrador para obter suas credenciais.
        </p>
      </div>

      {/* Redirecionamento automático por role */}
      <p className="mt-6 text-[11px] text-white/20 text-center">
        O sistema detecta automaticamente o seu perfil (funcionário, gerente ou CFO)
      </p>
    </div>
  )
}
