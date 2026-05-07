import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createExpense, getMyProjects, submitExpense } from '../../api'
import { MobileShell } from '../../components/layout/MobileShell'
import { Button } from '../../components/ui/Button'
import { categoryLabels } from '../../realData'
import { getToken } from '../../session'
import type { ExpenseCategory, ProjectResponse } from '../../types'

const categories = Object.entries(categoryLabels) as Array<[ExpenseCategory, string]>

function todayLocalDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function F02EnviarNF() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [projectId, setProjectId] = useState('')
  const [category, setCategory] = useState<ExpenseCategory | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    getMyProjects(token)
      .then((items) => {
        setProjects(items)
        if (items.length === 1) setProjectId(items[0].id)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar projetos.'))
  }, [])

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null
    setFile(selected)
    setError(null)
  }

  async function handleSubmit() {
    const token = getToken()
    if (!file || !token) return
    if (!projectId) {
      setError('Selecione o projeto antes de enviar a nota.')
      return
    }
    if (!category) {
      setError('Selecione a categoria inicial da despesa.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const expense = await createExpense(token, {
        title: file.name.replace(/\.[^.]+$/, '') || 'Nota fiscal',
        category,
        projectId,
        amount: null,
        expenseDate: todayLocalDate(),
        paymentMethod: 'OTHER',
        description: 'Enviado pelo app para análise da IA',
      }, file)
      await submitExpense(token, expense.id)
      navigate(`/funcionario/nota/${expense.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar nota.')
      setSubmitting(false)
    }
  }

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId),
    [projectId, projects]
  )
  const canSubmit = Boolean(file && projectId && category && !submitting)

  return (
    <MobileShell>
      <div className="flex items-center gap-3 border-b border-black/[0.06] bg-white px-4 pb-3 pt-4">
        <button onClick={() => navigate('/funcionario')} className="text-xl leading-none text-gray-400">&lt;</button>
        <div>
          <p className="text-[15px] font-medium text-[#1a1a2e]">Enviar nota fiscal</p>
          <p className="text-[11px] text-gray-400">A IA lê os dados e encaminha para aprovação.</p>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <StepCard step="1" title="Anexe a nota">
          <div className="grid grid-cols-2 gap-3">
            <FileOption title="Tirar foto" description="Usar câmera traseira">
              <input type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />
            </FileOption>
            <FileOption title="Escolher arquivo" description="JPG, PNG ou WEBP">
              <input type="file" accept="image/*" hidden onChange={handleFile} />
            </FileOption>
          </div>

          {file && (
            <div className="mt-3 rounded-[8px] border border-[#97C459] bg-[#EAF3DE] p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#27500A]/70">Arquivo selecionado</p>
              <p className="mt-1 truncate text-[13px] font-medium text-[#1a1a2e]">{file.name}</p>
              <p className="text-[11px] text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
          )}
        </StepCard>

        <StepCard step="2" title="Classifique a despesa">
          <div className="space-y-3">
            <label className="block text-[12px] font-medium text-gray-500">
              Projeto
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="mt-1 w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#3C3489] focus:ring-2 focus:ring-[#3C3489]/15"
              >
                <option value="">Selecione um projeto</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code ? `${project.code} - ${project.name}` : project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-[12px] font-medium text-gray-500">
              Categoria inicial
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as ExpenseCategory | '')}
                className="mt-1 w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#3C3489] focus:ring-2 focus:ring-[#3C3489]/15"
              >
                <option value="">Selecione</option>
                {categories.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>
        </StepCard>

        <StepCard step="3" title="Revise e envie">
          <div className="space-y-2 text-[12px]">
            <ReviewRow label="Arquivo" value={file?.name ?? 'Pendente'} pending={!file} />
            <ReviewRow label="Projeto" value={selectedProject?.name ?? 'Pendente'} pending={!selectedProject} />
            <ReviewRow label="Categoria" value={category ? categoryLabels[category] : 'Pendente'} pending={!category} />
          </div>
          <p className="mt-3 rounded-[8px] border border-dashed border-black/[0.10] bg-[#F8F8FC] p-3 text-[12px] text-gray-500">
            O valor e os itens serão lidos automaticamente. Se algum campo obrigatório ficar inseguro, você poderá corrigir antes da decisão final.
          </p>
        </StepCard>

        {submitting && (
          <div className="rounded-[10px] border border-[#AFA9EC] bg-[#EEEDFE] p-4 text-center">
            <div className="mb-2 flex items-center justify-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#3C3489] animate-ping" />
              <p className="text-[13px] font-medium text-[#3C3489]">Enviando para análise...</p>
            </div>
            <p className="text-[11px] text-[#3C3489]/60">Você será levado ao detalhe da nota ao terminar.</p>
          </div>
        )}

        {error && <p className="rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">{error}</p>}

        <Button
          variant="primary"
          className="w-full justify-center py-3 text-[14px]"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
        >
          {submitting ? 'Enviando...' : 'Enviar para aprovação'}
        </Button>
      </div>
    </MobileShell>
  )
}

function StepCard({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[10px] border border-black/[0.07] bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1a1a2e] text-[11px] font-semibold text-white">{step}</span>
        <p className="text-[13px] font-semibold text-[#1a1a2e]">{title}</p>
      </div>
      {children}
    </section>
  )
}

function FileOption({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center rounded-[9px] border border-black/[0.07] bg-white p-4 text-center transition-colors hover:border-[#1a1a2e]/30 active:bg-gray-50">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-[8px] border border-black/[0.10] bg-[#F8F8FC]">
        <span className="h-4 w-5 rounded-[3px] border-2 border-[#1a1a2e]" />
      </span>
      <span className="text-[13px] font-medium text-[#1a1a2e]">{title}</span>
      <span className="mt-0.5 text-[11px] text-gray-400">{description}</span>
      {children}
    </label>
  )
}

function ReviewRow({ label, value, pending }: { label: string; value: string; pending: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className={`min-w-0 truncate font-medium ${pending ? 'text-[#633806]' : 'text-[#1a1a2e]'}`}>{value}</span>
    </div>
  )
}
