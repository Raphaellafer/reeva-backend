import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createEmployee, getTeamEmployees } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SideDrawer } from '../../components/ui/SideDrawer'
import { getStoredToken } from '../../hooks/useAuth'
import { fmt, initials } from '../../realData'
import type { CreateEmployeePayload } from '../../types'

const phoneCountries = [
  { code: 'BR', label: 'Brasil (+55)', dialCode: '+55' },
  { code: 'AR', label: 'Argentina (+54)', dialCode: '+54' },
  { code: 'CL', label: 'Chile (+56)', dialCode: '+56' },
  { code: 'CO', label: 'Colombia (+57)', dialCode: '+57' },
  { code: 'MX', label: 'Mexico (+52)', dialCode: '+52' },
  { code: 'PT', label: 'Portugal (+351)', dialCode: '+351' },
  { code: 'ES', label: 'Espanha (+34)', dialCode: '+34' },
  { code: 'US', label: 'Estados Unidos (+1)', dialCode: '+1' },
  { code: 'FR', label: 'Franca (+33)', dialCode: '+33' },
  { code: 'GB', label: 'Reino Unido (+44)', dialCode: '+44' },
] as const

const emptyForm: CreateEmployeePayload = {
  name: '',
  email: '',
  password: '',
  pixKey: '',
  cpf: '',
  phoneCountryCode: 'BR',
  phoneNumber: '',
}
const fieldClass = 'mt-1 w-full rounded-[8px] border border-black/[0.08] bg-white px-3 py-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#3C3489] focus:ring-2 focus:ring-[#3C3489]/15'
const labelClass = 'block text-[12px] font-medium text-gray-500'

export function G05FuncionariosList() {
  const token = getStoredToken() ?? ''
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState<CreateEmployeePayload>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const { data: employees = [], isLoading, error } = useQuery({
    queryKey: ['team-employees'],
    queryFn: () => getTeamEmployees(token),
    enabled: !!token,
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateEmployeePayload) => createEmployee(token, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['team-employees'] })
      setForm(emptyForm)
      setMessage('Funcionario cadastrado com sucesso.')
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : 'Erro ao cadastrar funcionario.'),
  })

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return employees
    return employees.filter((employee) => {
      const content = `${employee.name} ${employee.email} ${employee.cpf ?? ''} ${employee.department ?? ''}`.toLowerCase()
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
    if (createMutation.isPending) return
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

    const normalizedCpf = normalizeDigits(form.cpf)
    const normalizedPhone = normalizeDigits(form.phoneNumber)

    if (form.password.length < 8) {
      setFormError('A senha temporaria precisa ter pelo menos 8 caracteres.')
      return
    }
    if (normalizedCpf.length !== 11) {
      setFormError('Informe um CPF com 11 digitos.')
      return
    }
    if (!form.pixKey.trim()) {
      setFormError('Informe a chave Pix do funcionario.')
      return
    }
    if (normalizedPhone.length < 6) {
      setFormError('Informe um numero de telefone valido.')
      return
    }

    createMutation.mutate({
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      pixKey: form.pixKey.trim(),
      cpf: normalizedCpf,
      phoneNumber: normalizedPhone,
    })
  }

  return (
    <DesktopShell
      title="Equipe"
      role="GERENTE"
      actions={<Button onClick={openDrawer}>Cadastrar funcionario</Button>}
    >
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card><Metric label="Funcionarios" value={employees.length} /></Card>
        <Card><Metric label="Pendencias abertas" value={pendingCount} tone={pendingCount > 0 ? 'amber' : 'normal'} /></Card>
        <Card><Metric label="Total reembolsado" value={fmt(totalReimbursed)} /></Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-medium text-[#1a1a2e]">Funcionarios da equipe</p>
            <p className="mt-0.5 text-[12px] text-gray-400">Acompanhe pendencias, aprovacoes e historico individual.</p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, e-mail, CPF ou departamento"
            className="min-w-[280px] rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#3C3489] focus:ring-2 focus:ring-[#3C3489]/15"
          />
        </div>

        {isLoading && <p className="py-6 text-center text-[13px] text-gray-400">Carregando...</p>}
        {error && <p className="py-4 text-[13px] text-red-500">{error instanceof Error ? error.message : 'Falha ao carregar equipe.'}</p>}

        {!isLoading && !error && filtered.length === 0 && (
          <p className="py-6 text-center text-[13px] text-gray-400">Nenhum funcionario encontrado.</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-[13px]">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  {['Funcionario', 'Departamento', 'Pendentes', 'Aprovadas', 'Total reembolsado', ''].map((header) => (
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
        title="Cadastrar funcionario"
        onClose={closeDrawer}
        footer={
          <div className="space-y-3">
            {message && <p className="rounded-[8px] border border-[#97C459] bg-[#EAF3DE] p-3 text-[12px] text-[#27500A]">{message}</p>}
            {formError && <p className="rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">{formError}</p>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={closeDrawer} disabled={createMutation.isPending} className="justify-center">Cancelar</Button>
              <Button type="submit" form="employee-drawer-form" disabled={createMutation.isPending} className="justify-center">
                {createMutation.isPending ? 'Cadastrando...' : 'Cadastrar funcionario'}
              </Button>
            </div>
          </div>
        }
      >
        <form id="employee-drawer-form" onSubmit={(event) => void handleCreate(event)} className="space-y-4">
          <div className="rounded-[8px] border border-dashed border-black/[0.10] bg-[#F8F8FC] p-3">
            <p className="text-[13px] font-medium text-[#1a1a2e]">Novo acesso de funcionario</p>
            <p className="mt-1 text-[12px] text-gray-500">O usuario podera entrar com este e-mail e a senha temporaria informada.</p>
          </div>
          <label className={labelClass}>
            Nome completo
            <input type="text" required minLength={2} value={form.name} onChange={(event) => handleField('name', event.target.value)} className={fieldClass} placeholder="Ex: Maria Silva" />
          </label>
          <label className={labelClass}>
            E-mail
            <input type="email" required value={form.email} onChange={(event) => handleField('email', event.target.value)} className={fieldClass} placeholder="maria@empresa.com" />
          </label>
          <label className={labelClass}>
            Senha temporaria
            <input type="password" required minLength={8} value={form.password} onChange={(event) => handleField('password', event.target.value)} className={fieldClass} placeholder="Minimo 8 caracteres" />
          </label>
          <label className={labelClass}>
            CPF
            <input type="text" required value={form.cpf} onChange={(event) => handleField('cpf', formatCpf(event.target.value))} className={fieldClass} placeholder="000.000.000-00" inputMode="numeric" />
            <span className="mt-1 block text-[11px] font-normal text-gray-400">Usado para identificar unicamente o funcionario no cadastro.</span>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_1fr]">
            <label className={labelClass}>
              Pais do telefone
              <select value={form.phoneCountryCode} onChange={(event) => handleField('phoneCountryCode', event.target.value)} className={fieldClass}>
                {phoneCountries.map((country) => (
                  <option key={country.code} value={country.code}>{country.label}</option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Numero de telefone
              <input type="tel" required value={form.phoneNumber} onChange={(event) => handleField('phoneNumber', formatPhone(event.target.value))} className={fieldClass} placeholder="(11) 99999-9999" inputMode="tel" />
              <span className="mt-1 block text-[11px] font-normal text-gray-400">Informe o telefone sem o codigo do pais; o gestor escolhe o pais ao lado.</span>
            </label>
          </div>
          <label className={labelClass}>
            Chave Pix
            <input type="text" required value={form.pixKey} onChange={(event) => handleField('pixKey', event.target.value)} className={fieldClass} placeholder="CPF, e-mail, telefone ou chave aleatoria" />
            <span className="mt-1 block text-[11px] font-normal text-gray-400">Obrigatoria para gerar a planilha de pagamento do financeiro.</span>
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

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '')
}

function formatCpf(value: string) {
  const digits = normalizeDigits(value).slice(0, 11)
  const parts = [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 9),
    digits.slice(9, 11),
  ]
  if (digits.length <= 3) return parts[0]
  if (digits.length <= 6) return `${parts[0]}.${parts[1]}`
  if (digits.length <= 9) return `${parts[0]}.${parts[1]}.${parts[2]}`
  return `${parts[0]}.${parts[1]}.${parts[2]}-${parts[3]}`
}

function formatPhone(value: string) {
  const digits = normalizeDigits(value).slice(0, 15)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

