import React, { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createProject, getManagedProjects, getProjectManagers, getTeamMembers, updateProject } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SideDrawer } from '../../components/ui/SideDrawer'
import { getStoredUser } from '../../hooks/useAuth'
import { fmt } from '../../realData'
import { getToken } from '../../session'
import type { ProjectPayload, ProjectResponse, TeamMemberResponse } from '../../types'

function buildEmptyForm(managerId: string | null): ProjectPayload {
  return { name: '', code: '', description: '', revenue: null, managerId, employeeIds: [] }
}

const fieldClass = 'mt-1 w-full rounded-[8px] border border-black/[0.08] bg-white px-3 py-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#3C3489] focus:ring-2 focus:ring-[#3C3489]/15'
const labelClass = 'block text-[12px] font-medium text-gray-500'
const sectionTitleClass = 'text-[11px] font-semibold uppercase tracking-wide text-gray-400'

export function G07Projetos() {
  const token = getToken()
  const queryClient = useQueryClient()
  const currentUser = getStoredUser()
  const currentManagerId = currentUser?.userId ?? null
  const [editingId, setEditingId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerManagerId, setDrawerManagerId] = useState<string | null>(currentManagerId)
  const [employeeQuery, setEmployeeQuery] = useState('')
  const [form, setForm] = useState<ProjectPayload>(() => buildEmptyForm(currentManagerId))
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const { data: projects = [], error: projectsError } = useQuery({
    queryKey: ['managed-projects'],
    queryFn: () => getManagedProjects(token!),
    enabled: !!token,
  })

  const { data: managers = [] } = useQuery({
    queryKey: ['project-managers'],
    queryFn: () => getProjectManagers(token!),
    enabled: !!token,
  })

  const { data: employees = [], isFetching: teamLoading } = useQuery({
    queryKey: ['team-members', drawerManagerId],
    queryFn: () => getTeamMembers(token!, drawerManagerId),
    enabled: !!token && !!drawerManagerId && drawerOpen,
  })

  const saveMutation = useMutation({
    mutationFn: (payload: { id: string | null; data: ProjectPayload }) =>
      payload.id
        ? updateProject(token!, payload.id, payload.data)
        : createProject(token!, payload.data),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['managed-projects'] })
      if (!vars.id) {
        setForm(buildEmptyForm(form.managerId))
        setEmployeeQuery('')
        setMessage('Projeto criado.')
      } else {
        setMessage('Projeto atualizado.')
      }
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Falha ao salvar projeto.'),
  })

  const selectedEmployees = useMemo(
    () => employees.filter((employee) => form.employeeIds.includes(employee.id)),
    [employees, form.employeeIds]
  )

  const selectedManager = useMemo(
    () => managers.find((manager) => manager.id === form.managerId) ?? null,
    [form.managerId, managers]
  )

  const filteredEmployees = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((employee) => `${employee.name} ${employee.email}`.toLowerCase().includes(q))
  }, [employeeQuery, employees])

  function defaultManagerId() {
    return currentManagerId ?? managers[0]?.id ?? null
  }

  function openCreate() {
    const managerId = defaultManagerId()
    setEditingId(null)
    setForm(buildEmptyForm(managerId))
    setDrawerManagerId(managerId)
    setEmployeeQuery('')
    setMessage(null)
    setError(null)
    setDrawerOpen(true)
  }

  function edit(project: ProjectResponse) {
    const managerId = project.managerId ?? defaultManagerId()
    setEditingId(project.id)
    setForm({ name: project.name, code: project.code ?? '', description: project.description ?? '', revenue: project.revenue == null ? null : String(project.revenue), managerId, employeeIds: project.members.map((member) => member.id) })
    setDrawerManagerId(managerId)
    setEmployeeQuery('')
    setMessage(null)
    setError(null)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    if (saveMutation.isPending) return
    setDrawerOpen(false)
    setEditingId(null)
    setForm(buildEmptyForm(defaultManagerId()))
    setEmployeeQuery('')
    setMessage(null)
    setError(null)
  }

  function handleManagerChange(managerId: string) {
    const nextManagerId = managerId || null
    setForm((current) => ({ ...current, managerId: nextManagerId, employeeIds: [] }))
    setDrawerManagerId(nextManagerId)
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

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) { setError('Informe o nome do projeto.'); return }
    if (!form.managerId) { setError('Selecione o gestor responsável pelo projeto.'); return }
    if (form.employeeIds.length === 0) { setError('Selecione pelo menos um funcionário para o projeto.'); return }
    setError(null)
    setMessage(null)
    saveMutation.mutate({ id: editingId, data: { ...form, revenue: form.revenue || null } })
  }

  return (
    <DesktopShell title="Projetos" role="GERENTE" actions={<Button onClick={openCreate}>Novo projeto</Button>}>
      <Card>
        <div className="mb-4 flex flex-col gap-1">
          <div>
            <p className="text-[14px] font-medium text-[#1a1a2e]">Projetos cadastrados</p>
            <p className="text-[12px] text-gray-400">{projects.length} projetos ativos · responsável escolhido no cadastro</p>
          </div>
        </div>

        {(projectsError || (error && !drawerOpen)) && (
          <p className="mb-3 rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">
            {projectsError instanceof Error ? projectsError.message : error}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-[13px]">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {['Código', 'Projeto', 'Gestor responsável', 'Faturamento', 'Equipe', ''].map((header) => (
                  <th key={header} className="py-2.5 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-[13px] text-gray-400">Nenhum projeto cadastrado.</td></tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className="border-b border-black/[0.04] align-top hover:bg-gray-50">
                    <td className="py-4 pr-3 text-gray-500">{project.code || '-'}</td>
                    <td className="py-4 pr-3">
                      <p className="font-medium text-[#1a1a2e]">{project.name}</p>
                      {project.description && <p className="mt-1 line-clamp-1 max-w-[360px] text-[12px] text-gray-400">{project.description}</p>}
                    </td>
                    <td className="py-4 pr-3">
                      <p className="font-medium text-[#1a1a2e]">{project.managerName ?? '-'}</p>
                      {project.managerEmail && <p className="text-[11px] text-gray-400">{project.managerEmail}</p>}
                    </td>
                    <td className="py-4 pr-3 whitespace-nowrap">{project.revenue == null ? '-' : fmt(project.revenue)}</td>
                    <td className="py-4 pr-3"><MemberSummary members={project.members} /></td>
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
              <Button type="button" variant="ghost" onClick={closeDrawer} disabled={saveMutation.isPending} className="justify-center">Cancelar</Button>
              <Button type="submit" form="project-drawer-form" disabled={saveMutation.isPending} className="justify-center">
                {saveMutation.isPending ? 'Salvando...' : editingId ? 'Salvar projeto' : 'Criar projeto'}
              </Button>
            </div>
          </div>
        }
      >
        <form id="project-drawer-form" onSubmit={submit} className="space-y-6">
          <section className="space-y-3">
            <p className={sectionTitleClass}>Dados do projeto</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr]">
              <label className={labelClass}>Código<input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} className={fieldClass} /></label>
              <label className={labelClass}>Nome<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={fieldClass} /></label>
            </div>
            <label className={labelClass}>
              Gestor responsável
              <select value={form.managerId ?? ''} onChange={(event) => handleManagerChange(event.target.value)} className={fieldClass}>
                <option value="">Selecione um gestor</option>
                {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name} · {manager.email}</option>)}
              </select>
            </label>
            <label className={labelClass}>Faturamento previsto/real<input value={form.revenue ?? ''} onChange={(event) => setForm((current) => ({ ...current, revenue: event.target.value }))} className={fieldClass} /></label>
            <label className={labelClass}>Descrição<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} className={fieldClass} /></label>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={sectionTitleClass}>Funcionários do projeto</p>
                <p className="mt-1 text-[12px] text-gray-400">
                  {selectedManager ? `Equipe de ${selectedManager.name}` : 'Selecione o gestor responsável para carregar a equipe.'}
                </p>
              </div>
              <span className="rounded-full bg-[#EEEDFE] px-2.5 py-1 text-[12px] font-medium text-[#3C3489]">{selectedEmployees.length} selecionados</span>
            </div>
            <input value={employeeQuery} onChange={(event) => setEmployeeQuery(event.target.value)} placeholder="Buscar por nome ou e-mail" className={fieldClass} disabled={!form.managerId} />
            {selectedEmployees.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedEmployees.map((employee) => (
                  <span key={employee.id} className="rounded-full border border-black/[0.07] bg-gray-50 px-2.5 py-1 text-[12px] text-[#1a1a2e]">{employee.name}</span>
                ))}
              </div>
            )}
            <div className="max-h-[360px] space-y-2 overflow-y-auto rounded-[8px] border border-black/[0.08] bg-white p-2">
              {teamLoading && <p className="p-3 text-[12px] text-gray-400">Carregando equipe...</p>}
              {!teamLoading && !form.managerId && <p className="p-3 text-[12px] text-gray-400">Selecione um gestor para ver funcionários.</p>}
              {!teamLoading && form.managerId && filteredEmployees.length === 0 && <p className="p-3 text-[12px] text-gray-400">Nenhum funcionário encontrado para este gestor.</p>}
              {!teamLoading && filteredEmployees.map((employee) => (
                <label key={employee.id} className="flex cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2 hover:bg-gray-50">
                  <input type="checkbox" className="h-4 w-4 shrink-0" checked={form.employeeIds.includes(employee.id)} onChange={() => toggleEmployee(employee.id)} />
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
      {visibleMembers.map((member) => <span key={member.id} className="rounded-full bg-gray-100 px-2.5 py-1 text-[12px] text-[#1a1a2e]">{member.name}</span>)}
      {remaining > 0 && <span className="rounded-full bg-[#EEEDFE] px-2.5 py-1 text-[12px] font-medium text-[#3C3489]">+{remaining}</span>}
    </div>
  )
}
