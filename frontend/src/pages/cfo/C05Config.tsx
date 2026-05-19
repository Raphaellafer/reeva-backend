import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCfoProject, getCfoProjectEmployees, getCfoProjectManagers, getCfoProjects, updateCfoProject } from '../../api'
import { DesktopShell } from '../../components/layout/DesktopShell'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { fmt } from '../../data/mock'
import { getToken } from '../../session'
import type { ProjectPayload, ProjectResponse } from '../../types'

const fieldClass = 'mt-1 w-full rounded-[8px] border border-black/[0.08] bg-white px-3 py-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#3C3489] focus:ring-2 focus:ring-[#3C3489]/15'
const labelClass = 'block text-[12px] font-medium text-gray-500'
const newProjectId = '__new__'

type ProjectForm = {
  name: string
  code: string
  revenue: string
  managerId: string
  description: string
  policyText: string
  employeeIds: string[]
}

function formFromProject(project: ProjectResponse): ProjectForm {
  return {
    name: project.name,
    code: project.code ?? '',
    revenue: project.revenue != null ? String(project.revenue) : '',
    managerId: project.managerId ?? '',
    description: project.description ?? '',
    policyText: project.policyText ?? '',
    employeeIds: project.members.map((member) => member.id),
  }
}

function emptyForm(managerId = ''): ProjectForm {
  return {
    name: '',
    code: '',
    revenue: '',
    managerId,
    description: '',
    policyText: '',
    employeeIds: [],
  }
}

export function C05Config() {
  const token = getToken()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<ProjectForm | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ['cfo-projects'],
    queryFn: () => getCfoProjects(token!),
    enabled: !!token,
  })

  const { data: managers = [] } = useQuery({
    queryKey: ['cfo-project-managers'],
    queryFn: () => getCfoProjectManagers(token!),
    enabled: !!token,
  })

  const { data: employees = [] } = useQuery({
    queryKey: ['cfo-project-employees'],
    queryFn: () => getCfoProjectEmployees(token!),
    enabled: !!token,
  })

  const selectedProject = useMemo(
    () => selectedId === newProjectId ? null : projects.find((project) => project.id === selectedId) ?? projects[0] ?? null,
    [projects, selectedId]
  )

  const isCreating = selectedId === newProjectId

  useEffect(() => {
    if (isCreating) return
    if (!selectedProject) {
      setSelectedId(null)
      setForm(null)
      return
    }
    setSelectedId(selectedProject.id)
    setForm(formFromProject(selectedProject))
    setMessage(null)
  }, [isCreating, selectedProject?.id])

  const saveMutation = useMutation({
    mutationFn: ({ projectId, payload }: { projectId: string | null; payload: ProjectPayload }) =>
      projectId ? updateCfoProject(token!, projectId, payload) : createCfoProject(token!, payload),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['cfo-projects'] })
      setSelectedId(saved.id)
      setMessage(isCreating ? 'Projeto criado com sucesso.' : 'Projeto atualizado com sucesso.')
    },
  })

  function updateField<K extends keyof ProjectForm>(field: K, value: ProjectForm[K]) {
    setForm((current) => current ? { ...current, [field]: value } : current)
    setMessage(null)
  }

  function startCreate() {
    setSelectedId(newProjectId)
    setForm(emptyForm(managers[0]?.id ?? ''))
    setMessage(null)
  }

  function toggleEmployee(employeeId: string) {
    setForm((current) => {
      if (!current) return current
      const selected = current.employeeIds.includes(employeeId)
      return {
        ...current,
        employeeIds: selected
          ? current.employeeIds.filter((id) => id !== employeeId)
          : [...current.employeeIds, employeeId],
      }
    })
    setMessage(null)
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form) return

    saveMutation.mutate({
      projectId: isCreating ? null : selectedProject?.id ?? null,
      payload: {
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description.trim(),
        policyText: form.policyText.trim(),
        revenue: form.revenue.trim() || null,
        managerId: form.managerId || null,
        employeeIds: form.employeeIds,
      },
    })
  }

  return (
    <DesktopShell title="Projetos" role="CFO">
      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-medium text-[#1a1a2e]">Projetos da empresa</p>
              <p className="mt-1 text-[12px] text-gray-400">Escolha um projeto para definir politica, gestor e participantes.</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="purple">{projects.length}</Badge>
              <Button type="button" size="sm" onClick={startCreate}>Novo</Button>
            </div>
          </div>

          {isLoading && <p className="py-6 text-[13px] text-gray-400">Carregando projetos...</p>}
          {error && <p className="rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">{error instanceof Error ? error.message : 'Falha ao carregar projetos.'}</p>}

          <div className="space-y-2">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => setSelectedId(project.id)}
                className={`w-full rounded-[8px] border p-3 text-left transition-colors ${
                  !isCreating && project.id === selectedProject?.id ? 'border-[#3C3489] bg-[#F8F8FC]' : 'border-black/[0.07] bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[#1a1a2e]">{project.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-gray-400">{project.managerName ?? 'Sem gestor definido'}</p>
                  </div>
                  <Badge variant={project.members.length > 0 ? 'green' : 'gray'}>{project.members.length} func.</Badge>
                </div>
                <p className="mt-2 text-[12px] font-medium text-[#1a1a2e]">{fmt(project.revenue ?? 0)}</p>
              </button>
            ))}
            {!isLoading && projects.length === 0 && <p className="py-6 text-[13px] text-gray-400">Nenhum projeto encontrado.</p>}
          </div>
        </Card>

        <Card>
          {!form ? (
            <p className="py-8 text-[13px] text-gray-400">Selecione um projeto para editar.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-medium text-[#1a1a2e]">{isCreating ? 'Novo projeto' : selectedProject?.name}</p>
                  <p className="mt-1 text-[12px] text-gray-400">{isCreating ? 'Crie o projeto e defina gestor, politica e participantes.' : 'Atualize a politica do projeto, o gestor responsavel e os funcionarios vinculados.'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {message && <Badge variant="green">{message}</Badge>}
                  {saveMutation.error && <Badge variant="red">{saveMutation.error instanceof Error ? saveMutation.error.message : 'Erro ao salvar'}</Badge>}
                  <Button type="submit" disabled={saveMutation.isPending || !form.name.trim() || !form.managerId}>
                    {saveMutation.isPending ? 'Salvando...' : isCreating ? 'Criar projeto' : 'Salvar projeto'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className={labelClass}>
                  Nome do projeto
                  <input value={form.name} onChange={(event) => updateField('name', event.target.value)} className={fieldClass} required />
                </label>
                <label className={labelClass}>
                  Codigo
                  <input value={form.code} onChange={(event) => updateField('code', event.target.value)} className={fieldClass} />
                </label>
                <label className={labelClass}>
                  Receita esperada
                  <input value={form.revenue} onChange={(event) => updateField('revenue', event.target.value.replace(',', '.'))} className={fieldClass} inputMode="decimal" placeholder="100000" />
                </label>
              </div>

              <label className={labelClass}>
                Gestor do projeto
                <select value={form.managerId} onChange={(event) => updateField('managerId', event.target.value)} className={fieldClass} required>
                  <option value="">Selecione um gestor</option>
                  {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name} - {manager.email}</option>)}
                </select>
              </label>

              <label className={labelClass}>
                Politica do projeto
                <textarea
                  value={form.policyText}
                  onChange={(event) => updateField('policyText', event.target.value)}
                  className={`${fieldClass} min-h-[130px] resize-y leading-relaxed`}
                  placeholder="Ex: viagens aprovadas pelo gestor; limites de transporte, hospedagem e alimentacao; regras de comprovante."
                />
              </label>

              <label className={labelClass}>
                Observacoes internas
                <textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} className={`${fieldClass} min-h-[90px] resize-y leading-relaxed`} />
              </label>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[12px] font-medium text-gray-500">Funcionarios participantes</p>
                  <Badge variant={form.employeeIds.length > 0 ? 'purple' : 'gray'}>{form.employeeIds.length} selecionado(s)</Badge>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {employees.map((employee) => {
                    const checked = form.employeeIds.includes(employee.id)
                    return (
                      <label key={employee.id} className={`flex cursor-pointer items-center gap-3 rounded-[8px] border p-3 ${checked ? 'border-[#3C3489] bg-[#F8F8FC]' : 'border-black/[0.07] bg-white'}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleEmployee(employee.id)} className="h-4 w-4 accent-[#3C3489]" />
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-medium text-[#1a1a2e]">{employee.name}</span>
                          <span className="block truncate text-[11px] font-normal text-gray-400">{employee.email}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
                {employees.length === 0 && <p className="rounded-[8px] border border-black/[0.07] p-4 text-[13px] text-gray-400">Nenhum funcionario disponivel para vincular.</p>}
              </div>
            </form>
          )}
        </Card>
      </div>
    </DesktopShell>
  )
}
