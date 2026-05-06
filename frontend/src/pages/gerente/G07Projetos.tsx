import React, { useEffect, useMemo, useState } from 'react'
import { createProject, getManagedProjects, getTeamMembers, updateProject } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SideDrawer } from '../../components/ui/SideDrawer'
import { fmt } from '../../realData'
import { getToken } from '../../session'
import type { ProjectPayload, ProjectResponse, TeamMemberResponse } from '../../types'

const emptyForm: ProjectPayload = {
  name: '',
  code: '',
  description: '',
  revenue: null,
  employeeIds: [],
}

const fieldClass = 'mt-1 w-full rounded-[8px] border border-black/[0.08] bg-white px-3 py-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#3C3489] focus:ring-2 focus:ring-[#3C3489]/15'
const labelClass = 'block text-[12px] font-medium text-gray-500'
const sectionTitleClass = 'text-[11px] font-semibold uppercase tracking-wide text-gray-400'

export function G07Projetos() {
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [employees, setEmployees] = useState<TeamMemberResponse[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [employeeQuery, setEmployeeQuery] = useState('')
  const [form, setForm] = useState<ProjectPayload>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function load() {
    const token = getToken()
    if (!token) return
    const [projectRows, employeeRows] = await Promise.all([
      getManagedProjects(token),
      getTeamMembers(token),
    ])
    setProjects(projectRows)
    setEmployees(employeeRows)
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar projetos.'))
  }, [])

  const selectedEmployees = useMemo(
    () => employees.filter((employee) => form.employeeIds.includes(employee.id)),
    [employees, form.employeeIds]
  )

  const filteredEmployees = useMemo(() => {
    const query = employeeQuery.trim().toLowerCase()
    if (!query) return employees
    return employees.filter((employee) => {
      const content = `${employee.name} ${employee.email}`.toLowerCase()
      return content.includes(query)
    })
  }, [employeeQuery, employees])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setEmployeeQuery('')
    setMessage(null)
    setError(null)
    setDrawerOpen(true)
  }

  function edit(project: ProjectResponse) {
    setEditingId(project.id)
    setForm({
      name: project.name,
      code: project.code ?? '',
      description: project.description ?? '',
      revenue: project.revenue == null ? null : String(project.revenue),
      employeeIds: project.members.map((member) => member.id),
    })
    setEmployeeQuery('')
    setMessage(null)
    setError(null)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    if (loading) return
    setDrawerOpen(false)
    setEditingId(null)
    setForm(emptyForm)
    setEmployeeQuery('')
    setMessage(null)
    setError(null)
  }

  function toggleEmployee(employeeId: string) {
    setForm((current) => ({
      ...current,
      employeeIds: current.employeeIds.includes(employeeId)
        ? current.employeeIds.filter((id) => id !== employeeId)
        : [...current.employeeIds, employeeId],
    }))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const token = getToken()
    if (!token) return
    if (!form.name.trim()) {
      setError('Informe o nome do projeto.')
      return
    }
    if (form.employeeIds.length === 0) {
      setError('Selecione pelo menos um funcionario para o projeto.')
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const payload = { ...form, revenue: form.revenue || null }
      if (editingId) {
        await updateProject(token, editingId, payload)
        setMessage('Projeto atualizado.')
      } else {
        await createProject(token, payload)
        setForm(emptyForm)
        setEmployeeQuery('')
        setMessage('Projeto criado.')
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar projeto.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DesktopShell
      title="Projetos"
      role="GERENTE"
      actions={<Button onClick={openCreate}>Novo projeto</Button>}
    >
      <Card>
        <div className="mb-4 flex flex-col gap-1">
          <div>
            <p className="text-[14px] font-medium text-[#1a1a2e]">Projetos cadastrados</p>
            <p className="text-[12px] text-gray-400">{projects.length} projetos ativos</p>
          </div>
        </div>

        {error && !drawerOpen && (
          <p className="mb-3 rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">{error}</p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-[13px]">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {['Codigo', 'Projeto', 'Faturamento', 'Equipe', ''].map((header) => (
                  <th key={header} className="py-2.5 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[13px] text-gray-400">Nenhum projeto cadastrado.</td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className="border-b border-black/[0.04] align-top hover:bg-gray-50">
                    <td className="py-4 pr-3 text-gray-500">{project.code || '-'}</td>
                    <td className="py-4 pr-3">
                      <p className="font-medium text-[#1a1a2e]">{project.name}</p>
                      {project.description && <p className="mt-1 line-clamp-1 max-w-[360px] text-[12px] text-gray-400">{project.description}</p>}
                    </td>
                    <td className="py-4 pr-3 whitespace-nowrap">{project.revenue == null ? '-' : fmt(project.revenue)}</td>
                    <td className="py-4 pr-3">
                      <MemberSummary members={project.members} />
                    </td>
                    <td className="py-4 pr-3 text-right">
                      <button onClick={() => edit(project)} className="text-[12px] font-medium text-[#3C3489]">Editar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <SideDrawer
        open={drawerOpen}
        title={editingId ? 'Editar projeto' : 'Novo projeto'}
        onClose={closeDrawer}
        footer={
          <div className="space-y-3">
            {message && <p className="rounded-[8px] border border-[#97C459] bg-[#EAF3DE] p-3 text-[12px] text-[#27500A]">{message}</p>}
            {error && <p className="rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">{error}</p>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={closeDrawer} disabled={loading} className="justify-center">Cancelar</Button>
              <Button type="submit" form="project-drawer-form" disabled={loading} className="justify-center">
                {loading ? 'Salvando...' : editingId ? 'Salvar projeto' : 'Criar projeto'}
              </Button>
            </div>
          </div>
        }
      >
        <form id="project-drawer-form" onSubmit={(event) => void submit(event)} className="space-y-6">
          <section className="space-y-3">
            <p className={sectionTitleClass}>Dados do projeto</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr]">
              <label className={labelClass}>
                Codigo
                <input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} className={fieldClass} />
              </label>
              <label className={labelClass}>
                Nome
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={fieldClass} />
              </label>
            </div>
            <label className={labelClass}>
              Faturamento previsto/real
              <input value={form.revenue ?? ''} onChange={(event) => setForm((current) => ({ ...current, revenue: event.target.value }))} className={fieldClass} />
            </label>
            <label className={labelClass}>
              Descricao
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} className={fieldClass} />
            </label>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className={sectionTitleClass}>Funcionarios do projeto</p>
              <span className="rounded-full bg-[#EEEDFE] px-2.5 py-1 text-[12px] font-medium text-[#3C3489]">
                {selectedEmployees.length} selecionados
              </span>
            </div>
            <input
              value={employeeQuery}
              onChange={(event) => setEmployeeQuery(event.target.value)}
              placeholder="Buscar por nome ou e-mail"
              className={fieldClass}
            />
            {selectedEmployees.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedEmployees.map((employee) => (
                  <span key={employee.id} className="rounded-full border border-black/[0.07] bg-gray-50 px-2.5 py-1 text-[12px] text-[#1a1a2e]">
                    {employee.name}
                  </span>
                ))}
              </div>
            )}
            <div className="max-h-[360px] space-y-2 overflow-y-auto rounded-[8px] border border-black/[0.08] bg-white p-2">
              {filteredEmployees.length === 0 && <p className="p-3 text-[12px] text-gray-400">Nenhum funcionario encontrado.</p>}
              {filteredEmployees.map((employee) => (
                <label key={employee.id} className="flex cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0"
                    checked={form.employeeIds.includes(employee.id)}
                    onChange={() => toggleEmployee(employee.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-[#1a1a2e]">{employee.name}</span>
                    <span className="block truncate text-[12px] text-gray-400">{employee.email}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        </form>
      </SideDrawer>
    </DesktopShell>
  )
}

function MemberSummary({ members }: { members: TeamMemberResponse[] }) {
  if (members.length === 0) return <span className="text-gray-400">-</span>

  const visibleMembers = members.slice(0, 3)
  const remaining = members.length - visibleMembers.length

  return (
    <div className="flex max-w-[460px] flex-wrap gap-1.5">
      {visibleMembers.map((member) => (
        <span key={member.id} className="rounded-full bg-gray-100 px-2.5 py-1 text-[12px] text-[#1a1a2e]">
          {member.name}
        </span>
      ))}
      {remaining > 0 && (
        <span className="rounded-full bg-[#EEEDFE] px-2.5 py-1 text-[12px] font-medium text-[#3C3489]">
          +{remaining}
        </span>
      )}
    </div>
  )
}
