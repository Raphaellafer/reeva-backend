import React, { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createCfoManager, getCfoManagers } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SideDrawer } from '../../components/ui/SideDrawer'
import { getStoredToken } from '../../hooks/useAuth'
import { initials } from '../../realData'
import type { CreateManagerPayload, ManagerListItem } from '../../types'

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

const emptyForm: CreateManagerPayload = {
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

export function C06Gestores() {
  const token = getStoredToken() ?? ''
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState<CreateManagerPayload>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const { data: managers = [], isLoading, error } = useQuery({
    queryKey: ['cfo-managers'],
    queryFn: () => getCfoManagers(token),
    enabled: !!token,
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateManagerPayload) => createCfoManager(token, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cfo-managers'] })
      setForm(emptyForm)
      setMessage('Gestor cadastrado com sucesso.')
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : 'Erro ao cadastrar gestor.'),
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return managers
    return managers.filter((m) => {
      const content = `${m.name} ${m.email} ${m.cpf ?? ''} ${m.department ?? ''}`.toLowerCase()
      return content.includes(q)
    })
  }, [managers, query])

  const totalTeamSize = managers.reduce((sum, m) => sum + m.teamSize, 0)

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

  function handleField(field: keyof CreateManagerPayload, value: string) {
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
    if (!isValidCpf(normalizedCpf)) {
      setFormError('Informe um CPF valido.')
      return
    }
    if (!form.pixKey.trim()) {
      setFormError('Informe a chave Pix do gestor.')
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
      title="Gestores"
      role="CFO"
      actions={<Button onClick={openDrawer}>Cadastrar gestor</Button>}
    >
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card><Metric label="Gestores ativos" value={managers.length} /></Card>
        <Card><Metric label="Total de funcionarios" value={totalTeamSize} /></Card>
        <Card><Metric label="Media de equipe" value={managers.length > 0 ? Math.round(totalTeamSize / managers.length) : 0} /></Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-medium text-[#1a1a2e]">Gestores da empresa</p>
            <p className="mt-0.5 text-[12px] text-gray-400">Visualize e gerencie os gestores responsaveis pelas equipes.</p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, e-mail, CPF ou departamento"
            className="min-w-[280px] rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#3C3489] focus:ring-2 focus:ring-[#3C3489]/15"
          />
        </div>

        {isLoading && <p className="py-6 text-center text-[13px] text-gray-400">Carregando...</p>}
        {error && <p className="py-4 text-[13px] text-red-500">{error instanceof Error ? error.message : 'Falha ao carregar gestores.'}</p>}

        {!isLoading && !error && filtered.length === 0 && (
          <p className="py-6 text-center text-[13px] text-gray-400">Nenhum gestor encontrado.</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  {['Gestor', 'Departamento', 'Funcionarios na equipe', 'CPF', 'Cadastrado em'].map((header) => (
                    <th key={header} className="py-2.5 pr-4 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((manager) => (
                  <ManagerRow key={manager.id} manager={manager} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <SideDrawer
        open={drawerOpen}
        title="Cadastrar gestor"
        onClose={closeDrawer}
        footer={
          <div className="space-y-3">
            {message && <p className="rounded-[8px] border border-[#97C459] bg-[#EAF3DE] p-3 text-[12px] text-[#27500A]">{message}</p>}
            {formError && <p className="rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">{formError}</p>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={closeDrawer} disabled={createMutation.isPending} className="justify-center">Cancelar</Button>
              <Button type="submit" form="manager-drawer-form" disabled={createMutation.isPending} className="justify-center">
                {createMutation.isPending ? 'Cadastrando...' : 'Cadastrar gestor'}
              </Button>
            </div>
          </div>
        }
      >
        <form id="manager-drawer-form" onSubmit={(event) => void handleCreate(event)} className="space-y-4">
          <div className="rounded-[8px] border border-dashed border-black/[0.10] bg-[#F8F8FC] p-3">
            <p className="text-[13px] font-medium text-[#1a1a2e]">Novo acesso de gestor</p>
            <p className="mt-1 text-[12px] text-gray-500">O usuario tera permissao de gestor e podera gerenciar equipes e aprovar reembolsos.</p>
          </div>
          <label className={labelClass}>
            Nome completo
            <input type="text" required minLength={2} value={form.name} onChange={(event) => handleField('name', event.target.value)} className={fieldClass} placeholder="Ex: Carlos Souza" />
          </label>
          <label className={labelClass}>
            E-mail
            <input type="email" required value={form.email} onChange={(event) => handleField('email', event.target.value)} className={fieldClass} placeholder="carlos@empresa.com" />
          </label>
          <label className={labelClass}>
            Senha temporaria
            <input type="password" required minLength={8} value={form.password} onChange={(event) => handleField('password', event.target.value)} className={fieldClass} placeholder="Minimo 8 caracteres" />
          </label>
          <label className={labelClass}>
            CPF
            <input type="text" required value={form.cpf} onChange={(event) => handleField('cpf', formatCpf(event.target.value))} className={fieldClass} placeholder="000.000.000-00" inputMode="numeric" />
            <span className="mt-1 block text-[11px] font-normal text-gray-400">Usado para identificar unicamente o gestor no cadastro.</span>
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
              <span className="mt-1 block text-[11px] font-normal text-gray-400">Informe sem o codigo do pais.</span>
            </label>
          </div>
          <label className={labelClass}>
            Chave Pix
            <input type="text" required value={form.pixKey} onChange={(event) => handleField('pixKey', event.target.value)} className={fieldClass} placeholder="CPF, e-mail, telefone ou chave aleatoria" />
            <span className="mt-1 block text-[11px] font-normal text-gray-400">Utilizada para pagamentos e reembolsos diretos.</span>
          </label>
        </form>
      </SideDrawer>
    </DesktopShell>
  )
}

function ManagerRow({ manager }: { manager: ManagerListItem }) {
  return (
    <tr className="border-b border-black/[0.04] hover:bg-gray-50">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3C3489] text-[10px] font-medium text-white">
            {initials(manager.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-[#1a1a2e]">{manager.name}</p>
            <p className="truncate text-[11px] text-gray-400">{manager.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 pr-4 text-gray-500">{manager.department ?? '-'}</td>
      <td className="py-3 pr-4 font-medium text-[#1a1a2e]">{manager.teamSize}</td>
      <td className="py-3 pr-4 font-mono text-[12px] text-gray-500">{formatCpfDisplay(manager.cpf)}</td>
      <td className="py-3 pr-4 text-gray-500">{formatDate(manager.createdAt)}</td>
    </tr>
  )
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-[22px] font-semibold text-[#1a1a2e]">{value}</p>
    </div>
  )
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '')
}

function formatCpf(value: string) {
  const digits = normalizeDigits(value).slice(0, 11)
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9), digits.slice(9, 11)]
  if (digits.length <= 3) return parts[0]
  if (digits.length <= 6) return `${parts[0]}.${parts[1]}`
  if (digits.length <= 9) return `${parts[0]}.${parts[1]}.${parts[2]}`
  return `${parts[0]}.${parts[1]}.${parts[2]}-${parts[3]}`
}

function formatCpfDisplay(cpf: string | null) {
  if (!cpf) return '-'
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function formatPhone(value: string) {
  const digits = normalizeDigits(value).slice(0, 15)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function isValidCpf(rawCpf: string) {
  const cpf = normalizeDigits(rawCpf)
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false
  const calcDigit = (length: number) => {
    let sum = 0
    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index)
    }
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  return calcDigit(9) === Number(cpf[9]) && calcDigit(10) === Number(cpf[10])
}
