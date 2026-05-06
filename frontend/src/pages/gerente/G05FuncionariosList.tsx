import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { getStoredToken } from '../../hooks/useAuth'
import { getTeamEmployees, createEmployee } from '../../api'
import type { EmployeeListItem, CreateEmployeePayload } from '../../types'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const initials = (name: string) =>
  name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

export function G05FuncionariosList() {
  const token = getStoredToken() ?? ''
  const [employees, setEmployees] = useState<EmployeeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const [form, setForm] = useState<CreateEmployeePayload>({ name: '', email: '', password: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    getTeamEmployees(token)
      .then(setEmployees)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  function handleField(field: keyof CreateEmployeePayload, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    try {
      const created = await createEmployee(token, form)
      setEmployees(prev => [...prev, created])
      setShowModal(false)
      setForm({ name: '', email: '', password: '' })
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Erro ao cadastrar funcionário')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DesktopShell title="Equipe" role="GERENTE">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[14px] font-medium text-[#1a1a2e]">Funcionários da equipe</p>
          <Button onClick={() => setShowModal(true)}>Cadastrar funcionário</Button>
        </div>

        {loading && <p className="text-[13px] text-gray-400 py-6 text-center">Carregando...</p>}
        {error && <p className="text-[13px] text-red-500 py-4">{error}</p>}

        {!loading && !error && employees.length === 0 && (
          <p className="text-[13px] text-gray-400 py-6 text-center">Nenhum funcionário encontrado. Cadastre o primeiro.</p>
        )}

        {!loading && employees.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[560px]">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  {['Funcionário', 'Departamento', 'Pendentes', 'Aprovadas', 'Total reembolsado'].map(h => (
                    <th key={h} className="text-left py-2.5 pr-4 text-[11px] uppercase tracking-wide text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} className="border-b border-black/[0.04] hover:bg-gray-50">
                    <td className="py-3 pr-4">
                      <Link to={`/gerente/funcionario/${emp.id}`} className="flex items-center gap-2 hover:text-[#3C3489]">
                        <div className="w-7 h-7 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center text-[10px] font-medium shrink-0">
                          {initials(emp.name)}
                        </div>
                        <div>
                          <p className="font-medium text-[#1a1a2e]">{emp.name}</p>
                          <p className="text-[11px] text-gray-400">{emp.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{emp.department ?? '—'}</td>
                    <td className="py-3 pr-4">
                      {emp.pendingCount > 0
                        ? <Badge variant="amber">{emp.pendingCount}</Badge>
                        : <span className="text-gray-400">0</span>}
                    </td>
                    <td className="py-3 pr-4 text-[#27500A] font-medium">{emp.approvedCount}</td>
                    <td className="py-3 font-medium text-[#1a1a2e]">{fmt(emp.totalReimbursed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de cadastro */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-[12px] shadow-xl w-full max-w-md mx-4 p-6">
            <p className="text-[16px] font-semibold text-[#1a1a2e] mb-5">Cadastrar funcionário</p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Nome completo</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={form.name}
                  onChange={e => handleField('name', e.target.value)}
                  className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#3C3489]/30"
                  placeholder="Ex: Maria Silva"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => handleField('email', e.target.value)}
                  className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#3C3489]/30"
                  placeholder="maria@empresa.com"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Senha temporária</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={e => handleField('password', e.target.value)}
                  className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#3C3489]/30"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              {formError && (
                <p className="text-[12px] text-red-500">{formError}</p>
              )}

              <div className="flex gap-3 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setFormError(null) }}
                  className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Cadastrando...' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DesktopShell>
  )
}
