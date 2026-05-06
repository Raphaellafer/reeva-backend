import React, { useEffect, useState } from 'react'
import { createProject, getManagedProjects, getTeamMembers, updateProject } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
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

export function G07Projetos() {
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [employees, setEmployees] = useState<TeamMemberResponse[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
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

  function edit(project: ProjectResponse) {
    setEditingId(project.id)
    setForm({
      name: project.name,
      code: project.code ?? '',
      description: project.description ?? '',
      revenue: project.revenue == null ? null : String(project.revenue),
      employeeIds: project.members.map((member) => member.id),
    })
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
        setMessage('Projeto criado.')
      }
      setEditingId(null)
      setForm(emptyForm)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar projeto.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DesktopShell title="Projetos" role="GERENTE">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4">
        <Card>
          <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">Projetos cadastrados</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[720px]">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  {['Codigo', 'Projeto', 'Faturamento', 'Funcionarios', ''].map((header) => (
                    <th key={header} className="text-left py-2 text-[11px] uppercase tracking-wide text-gray-400 font-medium pr-3">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-b border-black/[0.04]">
                    <td className="py-3 pr-3 text-gray-500">{project.code || '-'}</td>
                    <td className="py-3 pr-3 font-medium text-[#1a1a2e]">{project.name}</td>
                    <td className="py-3 pr-3">{project.revenue == null ? '-' : fmt(project.revenue)}</td>
                    <td className="py-3 pr-3">{project.members.map((member) => member.name).join(', ') || '-'}</td>
                    <td className="py-3 pr-3 text-right">
                      <button onClick={() => edit(project)} className="text-[12px] text-[#3C3489] font-medium">Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <p className="text-[14px] font-medium text-[#1a1a2e] mb-3">{editingId ? 'Editar projeto' : 'Novo projeto'}</p>
          <form onSubmit={(event) => void submit(event)} className="space-y-3">
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <label className="block text-[12px] text-gray-500">
                Codigo
                <input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} className="mt-1 w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px]" />
              </label>
              <label className="block text-[12px] text-gray-500">
                Nome
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="mt-1 w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px]" />
              </label>
            </div>

            <label className="block text-[12px] text-gray-500">
              Faturamento previsto/real
              <input value={form.revenue ?? ''} onChange={(event) => setForm((current) => ({ ...current, revenue: event.target.value }))} className="mt-1 w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px]" />
            </label>

            <label className="block text-[12px] text-gray-500">
              Descricao
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} className="mt-1 w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px]" />
            </label>

            <div>
              <p className="text-[12px] text-gray-500 mb-2">Funcionarios do projeto</p>
              <div className="space-y-2 rounded-[8px] border border-black/[0.07] bg-white p-3 max-h-56 overflow-y-auto">
                {employees.length === 0 && <p className="text-[12px] text-gray-400">Nenhum funcionario encontrado.</p>}
                {employees.map((employee) => (
                  <label key={employee.id} className="flex items-center gap-2 text-[13px] text-[#1a1a2e]">
                    <input type="checkbox" checked={form.employeeIds.includes(employee.id)} onChange={() => toggleEmployee(employee.id)} />
                    <span>{employee.name}</span>
                    <span className="text-[11px] text-gray-400">{employee.email}</span>
                  </label>
                ))}
              </div>
            </div>

            {message && <p className="text-[12px] text-[#27500A] bg-[#EAF3DE] border border-[#97C459] rounded-[8px] p-3">{message}</p>}
            {error && <p className="text-[12px] text-[#791F1F] bg-[#FCEBEB] border border-[#F09595] rounded-[8px] p-3">{error}</p>}

            <Button variant="primary" className="w-full justify-center" disabled={loading}>
              {loading ? 'Salvando...' : editingId ? 'Salvar projeto' : 'Criar projeto'}
            </Button>
          </form>
        </Card>
      </div>
    </DesktopShell>
  )
}
