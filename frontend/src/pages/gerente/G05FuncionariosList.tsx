import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { createEmployee, getTeamEmployees } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SideDrawer } from '../../components/ui/SideDrawer'
import { getStoredToken } from '../../hooks/useAuth'
import { fmt, initials } from '../../realData'
import type { CreateEmployeePayload, EmployeeListItem } from '../../types'

const emptyForm: CreateEmployeePayload = { name: '', email: '', password: '', pixKey: '' }
const fieldClass = 'mt-1 w-full rounded-[8px] border border-black/[0.08] bg-white px-3 py-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#3C3489] focus:ring-2 focus:ring-[#3C3489]/15'
const labelClass = 'block text-[12px] font-medium text-gray-500'

export function G05FuncionariosList() {
  const token = getStoredToken() ?? ''
  const [employees, setEmployees] = useState<EmployeeListItem[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState<CreateEmployeePayload>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setEmployees(await getTeamEmployees(token))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar equipe.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [token])

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return employees
    return employees.filter((employee) => {
      const content = `${employee.name} ${employee.email} ${employee.department ?? ''}`.toLowerCase()
      return content.includes(normalizedQuery)
    })
  }, [employees, query])

  const pendingCount = employees.reduce((sum, employee) => sum + employee.pendingCount, 0)
  const totalReimbursed = employees.reduce((sum, employee) => sum + employee.totalReimbursed, 0)

  function openDrawer() {
    setDrawerOpen(true)
    setForm(emptyForm)
    setFormError(null)
    setMessage(null)
  }

  function closeDrawer() {
    if (saving) return
    setDrawerOpen(false)
    setForm(emptyForm)
    setFormError(null)
    setMessage(null)
  }

  function handleField(field: keyof CreateEmployeePayload, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)

    if (form.password.length < 8) {
      setFormError('A senha temporária precisa ter pelo menos 8 caracteres.')
      return
    }
    if (!form.pixKey.trim()) {
      setFormError('Informe a chave Pix do funcionário.')
      return
    }

    setSaving(true)
    try {
      const created = await createEmployee(token, {
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        pixKey: form.pixKey.trim(),
      })
      setEmployees((current) => [...current, created])
      setForm(emptyForm)
      setMessage('Funcionário cadastrado com sucesso.')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao cadastrar funcionário.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DesktopShell
      title="Equipe"
      role="GERENTE"
      actions={<Button onClick={openDrawer}>Cadastrar funcionário</Button>}
    >
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card><Metric label="Funcionários" value={employees.length} /></Card>
        <Card><Metric label="Pendências abertas" value={pendingCount} tone={pendingCount > 0 ? 'amber' : 'normal'} /></Card>
        <Card><Metric label="Total reembolsado" value={fmt(totalReimbursed)} /></Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-medium text-[#1a1a2e]">Funcionários da equipe</p>
            <p className="mt-0.5 text-[12px] text-gray-400">Acompanhe pendências, aprovações e histórico individual.</p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, e-mail ou departamento"
            className="min-w-[280px] rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#3C3489] focus:ring-2 focus:ring-[#3C3489]/15"
          />
        </div>

        {loading && <p className="py-6 text-center text-[13px] text-gray-400">Carregando...</p>}
        {error && <p className="py-4 text-[13px] text-red-500">{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <p className="py-6 text-center text-[13px] text-gray-400">Nenhum funcionário encontrado.</p>
        )}

        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-[13px]">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  {['Funcionário', 'Departamento', 'Pendentes', 'Aprovadas', 'Total reembolsado', ''].map((header) => (
                    <th key={header} className="py-2.5 pr-4 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((employee) => (
                  <tr key={employee.id} className="border-b border-black/[0.04] hover:bg-gray-50">
                    <td className="py-3 pr-4">
                      <Link to={`/gerente/funcionario/${employee.id}`} className="flex items-center gap-2 hover:text-[#3C3489]">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a1a2e] text-[10px] font-medium text-white">
                          {initials(employee.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[#1a1a2e]">{employee.name}</p>
                          <p className="truncate text-[11px] text-gray-400">{employee.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{employee.department ?? '-'}</td>
                    <td className="py-3 pr-4">
                      {employee.pendingCount > 0
                        ? <Badge variant="amber">{employee.pendingCount}</Badge>
                        : <span className="text-gray-400">0</span>}
                    </td>
                    <td className="py-3 pr-4 font-medium text-[#27500A]">{employee.approvedCount}</td>
                    <td className="py-3 pr-4 font-medium text-[#1a1a2e]">{fmt(employee.totalReimbursed)}</td>
                    <td className="py-3 text-right">
                      <Link to={`/gerente/funcionario/${employee.id}`} className="text-[12px] font-medium text-[#3C3489]">Ver perfil</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <SideDrawer
        open={drawerOpen}
        title="Cadastrar funcionário"
        onClose={closeDrawer}
        footer={
          <div className="space-y-3">
            {message && <p className="rounded-[8px] border border-[#97C459] bg-[#EAF3DE] p-3 text-[12px] text-[#27500A]">{message}</p>}
            {formError && <p className="rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">{formError}</p>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={closeDrawer} disabled={saving} className="justify-center">Cancelar</Button>
              <Button type="submit" form="employee-drawer-form" disabled={saving} className="justify-center">
                {saving ? 'Cadastrando...' : 'Cadastrar funcionário'}
              </Button>
            </div>
          </div>
        }
      >
        <form id="employee-drawer-form" onSubmit={(event) => void handleCreate(event)} className="space-y-4">
          <div className="rounded-[8px] border border-dashed border-black/[0.10] bg-[#F8F8FC] p-3">
            <p className="text-[13px] font-medium text-[#1a1a2e]">Novo acesso de funcionário</p>
            <p className="mt-1 text-[12px] text-gray-500">O usuário poderá entrar com este e-mail e a senha temporária informada.</p>
          </div>
          <label className={labelClass}>
            Nome completo
            <input
              type="text"
              required
              minLength={2}
              value={form.name}
              onChange={(event) => handleField('name', event.target.value)}
              className={fieldClass}
              placeholder="Ex: Maria Silva"
            />
          </label>
          <label className={labelClass}>
            E-mail
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) => handleField('email', event.target.value)}
              className={fieldClass}
              placeholder="maria@empresa.com"
            />
          </label>
          <label className={labelClass}>
            Senha temporária
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(event) => handleField('password', event.target.value)}
              className={fieldClass}
              placeholder="Mínimo 8 caracteres"
            />
          </label>
          <label className={labelClass}>
            Chave Pix
            <input
              type="text"
              required
              value={form.pixKey}
              onChange={(event) => handleField('pixKey', event.target.value)}
              className={fieldClass}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
            />
            <span className="mt-1 block text-[11px] font-normal text-gray-400">
              Obrigatória para gerar a planilha de pagamento do financeiro.
            </span>
          </label>
        </form>
      </SideDrawer>
    </DesktopShell>
  )
}

function Metric({ label, value, tone = 'normal' }: { label: string; value: React.ReactNode; tone?: 'normal' | 'amber' }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-1 text-[22px] font-semibold ${tone === 'amber' ? 'text-[#633806]' : 'text-[#1a1a2e]'}`}>{value}</p>
    </div>
  )
}
