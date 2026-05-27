import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createExpense, getMyProjects, getPolicies, submitExpense } from '../../api'
import { MobileShell } from '../../components/layout/MobileShell'
import { Button } from '../../components/ui/Button'
import { categoryLabel, categoryLabels } from '../../realData'
import { getToken } from '../../session'
import type { ExpenseCategory, ProjectResponse } from '../../types'

const defaultCategoryOptions = Object.entries(categoryLabels) as Array<[ExpenseCategory, string]>

function todayLocalDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDisplayDate(value: string) {
  if (!value) return 'Pendente'
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR')
}

export function F02EnviarNF() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null)
  const [photoConfirmed, setPhotoConfirmed] = useState(false)
  const [photoCheck, setPhotoCheck] = useState<PhotoCheck | null>(null)
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [categoryOptions, setCategoryOptions] = useState(defaultCategoryOptions)
  const [projectId, setProjectId] = useState('')
  const [category, setCategory] = useState<ExpenseCategory | ''>('')
  const [testExpenseDate, setTestExpenseDate] = useState(todayLocalDate())
  const [ignoreDateCheck, setIgnoreDateCheck] = useState(false)
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
    getPolicies(token)
      .then((policies) => {
        const merged = new Map<string, string>(defaultCategoryOptions)
        policies.forEach((policy) => merged.set(policy.category, categoryLabel(policy.category)))
        setCategoryOptions(Array.from(merged.entries()))
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!file) {
      setFilePreviewUrl(null)
      setPhotoCheck(null)
      return
    }

    let active = true
    const url = URL.createObjectURL(file)
    setFilePreviewUrl(url)
    setPhotoCheck({ status: 'checking', title: 'Verificando imagem...', message: 'Aguarde a leitura do arquivo selecionado.' })

    checkPhotoQuality(file, url)
      .then((result) => {
        if (active) setPhotoCheck(result)
      })
      .catch(() => {
        if (active) {
          setPhotoCheck({
            status: 'warning',
            title: 'Nao foi possivel validar a nitidez',
            message: 'Confira se a foto esta legivel antes de confirmar o envio.',
          })
        }
      })

    return () => {
      active = false
      URL.revokeObjectURL(url)
    }
  }, [file])

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null
    setFile(selected)
    setPhotoConfirmed(false)
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
        expenseDate: ignoreDateCheck ? testExpenseDate : todayLocalDate(),
        paymentMethod: 'OTHER',
        description: 'Enviado pelo app para analise da IA',
        testExpenseDateOverride: ignoreDateCheck,
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
  const canSubmit = Boolean(file && photoConfirmed && photoCheck?.status !== 'bad' && projectId && category && !submitting)

  return (
    <MobileShell>
      <div className="flex items-center gap-3 border-b border-black/[0.06] bg-white px-4 pb-3 pt-4">
        <button onClick={() => navigate('/funcionario')} className="text-xl leading-none text-gray-400">&lt;</button>
        <div>
          <p className="text-[15px] font-medium text-[#1a1a2e]">Enviar nota fiscal</p>
          <p className="text-[11px] text-gray-400">A IA le os dados e encaminha para aprovacao.</p>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <StepCard step="1" title="Anexe a nota">
          <div className="grid grid-cols-2 gap-3">
            <FileOption title="Tirar foto" description="Usar camera traseira">
              <input type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />
            </FileOption>
            <FileOption title="Escolher arquivo" description="JPG, PNG ou WEBP">
              <input type="file" accept="image/*" hidden onChange={handleFile} />
            </FileOption>
          </div>

          {file && (
            <PhotoReview
              file={file}
              previewUrl={filePreviewUrl}
              check={photoCheck}
              confirmed={photoConfirmed}
              onConfirmChange={setPhotoConfirmed}
              onClear={() => {
                setFile(null)
                setPhotoConfirmed(false)
              }}
            />
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
                {categoryOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              aria-pressed={ignoreDateCheck}
              onClick={() => setIgnoreDateCheck((current) => !current)}
              className={`flex min-h-[64px] w-full items-center justify-between gap-3 rounded-[8px] border p-3 text-left transition-colors ${
                ignoreDateCheck
                  ? 'border-[#EF9F27] bg-[#FAEEDA] text-[#633806]'
                  : 'border-dashed border-[#FAC775] bg-[#FFFBF2] text-[#633806]'
              }`}
            >
              <span className="flex min-w-0 flex-col">
                <span className="text-[13px] font-semibold">Ignorar verificacao de data</span>
                <span className="mt-0.5 text-[11px] opacity-75">Use apenas no teste da banca.</span>
              </span>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[16px] font-semibold ${
                ignoreDateCheck ? 'border-[#EF9F27] bg-white text-[#633806]' : 'border-[#FAC775] bg-white text-transparent'
              }`}>
                OK
              </span>
            </button>

            {ignoreDateCheck && (
              <label className="block text-[12px] font-medium text-gray-500">
                Data da despesa
                <input
                  type="date"
                  value={testExpenseDate}
                  onChange={(event) => setTestExpenseDate(event.target.value)}
                  className="mt-1 w-full rounded-[8px] border border-[#FAC775] bg-[#FFFBF2] px-3 py-2 text-[13px] text-[#1a1a2e] outline-none focus:border-[#EF9F27] focus:ring-2 focus:ring-[#EF9F27]/15"
                />
                <span className="mt-1 block text-[11px] font-normal text-[#633806]">A politica de 30 dias sera ignorada neste envio.</span>
              </label>
            )}
          </div>
        </StepCard>

        <StepCard step="3" title="Revise e envie">
          <div className="space-y-2 text-[12px]">
            <ReviewRow label="Arquivo" value={file?.name ?? 'Pendente'} pending={!file} />
            <ReviewRow label="Foto conferida" value={photoConfirmed ? 'Confirmada' : 'Pendente'} pending={!photoConfirmed} />
            <ReviewRow label="Projeto" value={selectedProject?.name ?? 'Pendente'} pending={!selectedProject} />
            <ReviewRow label="Categoria" value={category ? categoryLabel(category) : 'Pendente'} pending={!category} />
            {ignoreDateCheck && <ReviewRow label="Data (teste)" value={formatDisplayDate(testExpenseDate)} pending={!testExpenseDate} />}
          </div>
          <p className="mt-3 rounded-[8px] border border-dashed border-black/[0.10] bg-[#F8F8FC] p-3 text-[12px] text-gray-500">
            O valor e os itens serao lidos automaticamente. Se algum campo obrigatorio ficar inseguro, voce podera corrigir antes da decisao final.
          </p>
        </StepCard>

        {submitting && (
          <div className="rounded-[10px] border border-[#AFA9EC] bg-[#EEEDFE] p-4 text-center">
            <div className="mb-2 flex items-center justify-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#3C3489] animate-ping" />
              <p className="text-[13px] font-medium text-[#3C3489]">Enviando para analise...</p>
            </div>
            <p className="text-[11px] text-[#3C3489]/60">Voce sera levado ao detalhe da nota ao terminar.</p>
          </div>
        )}

        {error && <p className="rounded-[8px] border border-[#F09595] bg-[#FCEBEB] p-3 text-[12px] text-[#791F1F]">{error}</p>}

        <Button
          variant="primary"
          className="w-full justify-center py-3 text-[14px]"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
        >
          {submitting ? 'Enviando...' : 'Enviar para aprovacao'}
        </Button>
      </div>
    </MobileShell>
  )
}

type PhotoCheck = {
  status: 'checking' | 'good' | 'warning' | 'bad'
  title: string
  message: string
}

function PhotoReview({
  file,
  previewUrl,
  check,
  confirmed,
  onConfirmChange,
  onClear,
}: {
  file: File
  previewUrl: string | null
  check: PhotoCheck | null
  confirmed: boolean
  onConfirmChange: (value: boolean) => void
  onClear: () => void
}) {
  const checkClasses = {
    checking: 'border-[#AFA9EC] bg-[#EEEDFE] text-[#3C3489]',
    good: 'border-[#97C459] bg-[#EAF3DE] text-[#27500A]',
    warning: 'border-[#FAC775] bg-[#FAEEDA] text-[#633806]',
    bad: 'border-[#F09595] bg-[#FCEBEB] text-[#791F1F]',
  }

  return (
    <div className="mt-3 space-y-3 rounded-[10px] border border-black/[0.07] bg-white p-3">
      {previewUrl ? (
        <img src={previewUrl} alt={file.name} className="max-h-72 w-full rounded-[8px] border border-black/[0.07] bg-[#F8F8FC] object-contain" />
      ) : (
        <div className="h-52 animate-pulse rounded-[8px] bg-gray-100" />
      )}

      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-[#1a1a2e]">{file.name}</p>
          <p className="text-[11px] text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-[7px] border border-black/[0.08] px-2.5 py-1.5 text-[11px] font-medium text-gray-500"
        >
          Trocar
        </button>
      </div>

      {check && (
        <div className={`rounded-[8px] border p-3 ${checkClasses[check.status]}`}>
          <p className="text-[12px] font-semibold">{check.title}</p>
          <p className="mt-1 text-[11px] opacity-80">{check.message}</p>
        </div>
      )}

      <button
        type="button"
        aria-pressed={confirmed}
        disabled={check?.status === 'checking' || check?.status === 'bad'}
        onClick={() => onConfirmChange(!confirmed)}
        className={`flex min-h-[72px] w-full items-center justify-between gap-3 rounded-[8px] border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          confirmed
            ? 'border-[#97C459] bg-[#EAF3DE] text-[#27500A]'
            : 'border-black/[0.07] bg-[#F8F8FC] text-[#1a1a2e]'
        }`}
      >
        <span className="flex min-w-0 flex-col">
          <span className="text-[13px] font-semibold">
            {confirmed ? 'Imagem confirmada' : 'Confirmar imagem'}
          </span>
          <span className="mt-0.5 text-[11px] leading-relaxed opacity-75">
            Conferi a imagem e os dados principais da nota estao legiveis.
          </span>
        </span>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[18px] font-semibold ${
          confirmed ? 'border-[#97C459] bg-white text-[#27500A]' : 'border-black/[0.16] bg-white text-transparent'
        }`}>
          OK
        </span>
      </button>
    </div>
  )
}

function checkPhotoQuality(file: File, previewUrl: string): Promise<PhotoCheck> {
  if (!file.type.startsWith('image/')) {
    return Promise.resolve({
      status: 'bad',
      title: 'Formato nao suportado',
      message: 'Envie uma imagem JPG, PNG ou WEBP da nota.',
    })
  }

  if (file.size < 80 * 1024) {
    return Promise.resolve({
      status: 'warning',
      title: 'Arquivo muito leve',
      message: 'A foto pode estar comprimida demais. Confira se CNPJ, data e valor estao legiveis.',
    })
  }

  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      const { naturalWidth: width, naturalHeight: height } = image
      const shortestSide = Math.min(width, height)
      const aspectRatio = Math.max(width, height) / Math.max(1, shortestSide)

      if (shortestSide < 700) {
        resolve({
          status: 'warning',
          title: 'Resolucao baixa',
          message: 'A foto pode dificultar a leitura da IA. Se os textos pequenos estiverem borrados, tire outra foto.',
        })
        return
      }

      if (aspectRatio > 4.5) {
        resolve({
          status: 'warning',
          title: 'Imagem muito estreita',
          message: 'Confira se a nota inteira aparece e se nao houve corte nas laterais.',
        })
        return
      }

      resolve({
        status: 'good',
        title: 'Imagem parece boa',
        message: 'Resolucao e formato estao adequados. Confirme abaixo se os dados estao legiveis.',
      })
    }
    image.onerror = () => resolve({
      status: 'bad',
      title: 'Imagem nao pode ser aberta',
      message: 'Escolha outra foto da nota para continuar.',
    })
    image.src = previewUrl
  })
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
    <label className="flex min-h-[108px] cursor-pointer flex-col items-center justify-center rounded-[8px] border border-black/[0.10] bg-white p-3 text-center shadow-sm transition-colors hover:border-[#1a1a2e]/30 active:border-[#3C3489] active:bg-[#F8F8FC]">
      <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-[8px] border border-black/[0.10] bg-[#F8F8FC]">
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
