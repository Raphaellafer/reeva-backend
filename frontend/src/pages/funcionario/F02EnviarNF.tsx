import React, { useState } from 'react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createExpense, getMyProjects, submitExpense } from '../../api'
import { MobileShell } from '../../components/layout/MobileShell'
import { Button } from '../../components/ui/Button'
import { getToken } from '../../session'
import type { ExpenseCategory, ProjectResponse } from '../../types'

const categories: Array<{ value: ExpenseCategory; label: string }> = [
  { value: 'FOOD', label: 'Alimentacao' },
  { value: 'TRANSPORT', label: 'Transporte' },
  { value: 'LODGING', label: 'Hospedagem' },
  { value: 'PURCHASE', label: 'Compras' },
]

export function F02EnviarNF() {
  const navigate = useNavigate()
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [projectId, setProjectId] = useState('')
  const [category, setCategory] = useState<ExpenseCategory | ''>('')
  const [amount, setAmount] = useState('1.00')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    getMyProjects(token)
      .then((items) => setProjects(items))
      .catch((err) => setError(err instanceof Error ? err.message : 'Falha ao carregar projetos.'))
  }, [])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setArquivo(f)
    setError(null)
  }

  async function handleEnviar() {
    const token = getToken()
    if (!arquivo || !token) return
    if (!projectId) {
      setError('Selecione o projeto da despesa antes de enviar a nota.')
      return
    }
    if (!category) {
      setError('Selecione a categoria da despesa antes de enviar a nota.')
      return
    }
    setEnviando(true)
    setError(null)

    try {
      const expense = await createExpense(token, {
        title: arquivo.name.replace(/\.[^.]+$/, '') || 'Nota fiscal',
        category,
        projectId,
        amount: amount || '1.00',
        expenseDate: new Date().toISOString().slice(0, 10),
        paymentMethod: 'OTHER',
        description: 'Enviado pelo app para analise da IA',
      }, arquivo)
      await submitExpense(token, expense.id)
      navigate(`/funcionario/nota/${expense.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar nota.')
      setEnviando(false)
    }
  }

  return (
    <MobileShell>
      <div className="bg-white px-4 pt-4 pb-3 flex items-center gap-3 border-b border-black/[0.06]">
        <button onClick={() => navigate('/funcionario')} className="text-gray-400 text-xl leading-none">&lt;</button>
        <p className="text-[15px] font-medium text-[#1a1a2e]">Enviar nota fiscal</p>
      </div>

      <div className="px-4 py-6 space-y-4">
        <p className="text-[13px] text-gray-500 text-center">
          Tire uma foto da nota ou escolha uma imagem para enviar para analise da IA.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col items-center justify-center gap-3 bg-white rounded-[10px] border border-black/[0.07] p-6 cursor-pointer hover:border-[#1a1a2e]/30 active:bg-gray-50 transition-colors">
            <span className="text-[28px] font-medium text-[#1a1a2e]">CAM</span>
            <span className="text-[13px] font-medium text-[#1a1a2e]">Tirar foto</span>
            <span className="text-[11px] text-gray-400 text-center">Camera traseira</span>
            <input type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />
          </label>

          <label className="flex flex-col items-center justify-center gap-3 bg-white rounded-[10px] border border-black/[0.07] p-6 cursor-pointer hover:border-[#1a1a2e]/30 active:bg-gray-50 transition-colors">
            <span className="text-[28px] font-medium text-[#1a1a2e]">IMG</span>
            <span className="text-[13px] font-medium text-[#1a1a2e]">Da galeria</span>
            <span className="text-[11px] text-gray-400 text-center">JPG, PNG ou WEBP</span>
            <input type="file" accept="image/*" hidden onChange={handleFile} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-[12px] text-gray-500 col-span-2">
            Projeto
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className="mt-1 w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]"
            >
              <option value="">Selecione um projeto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code ? `${project.code} - ${project.name}` : project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[12px] text-gray-500">
            Categoria inicial
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as ExpenseCategory | '')}
              className="mt-1 w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]"
            >
              <option value="">Selecione</option>
              {categories.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="text-[12px] text-gray-500">
            Valor estimado
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded-[8px] border border-black/[0.07] bg-white px-3 py-2 text-[13px] text-[#1a1a2e]"
            />
          </label>
        </div>

        {arquivo && !enviando && (
          <div className="bg-white rounded-[10px] border border-black/[0.07] p-4">
            <p className="text-[11px] text-gray-400 mb-1">Arquivo selecionado</p>
            <p className="text-[13px] font-medium text-[#1a1a2e] truncate">{arquivo.name}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{(arquivo.size / 1024).toFixed(0)} KB</p>
          </div>
        )}

        {enviando && (
          <div className="rounded-[10px] border border-[#AFA9EC] p-4 text-center" style={{ background: '#EEEDFE' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#3C3489] animate-ping" />
              <p className="text-[13px] font-medium text-[#3C3489]">Enviando para analise da IA...</p>
            </div>
            <p className="text-[11px] text-[#3C3489]/60">A nota sera atualizada quando a IA terminar</p>
          </div>
        )}

        {error && <p className="text-[12px] text-[#791F1F] bg-[#FCEBEB] border border-[#F09595] rounded-[8px] p-3">{error}</p>}

        {arquivo && !enviando && (
          <Button variant="primary" className="w-full justify-center py-3 text-[14px]" onClick={() => void handleEnviar()}>
            Enviar para aprovacao
          </Button>
        )}
      </div>
    </MobileShell>
  )
}
