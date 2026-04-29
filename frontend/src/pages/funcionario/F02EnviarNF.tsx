import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileShell } from '../../components/layout/MobileShell'
import { Button } from '../../components/ui/Button'

export function F02EnviarNF() {
  const navigate = useNavigate()
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setArquivo(f)
  }

  function handleEnviar() {
    if (!arquivo) return
    setEnviando(true)
    setTimeout(() => navigate('/funcionario'), 1800)
  }

  return (
    <MobileShell>
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 flex items-center gap-3 border-b border-black/[0.06]">
        <button onClick={() => navigate('/funcionario')} className="text-gray-400 text-xl leading-none">←</button>
        <p className="text-[15px] font-medium text-[#1a1a2e]">Enviar nota fiscal</p>
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Instrução */}
        <p className="text-[13px] text-gray-500 text-center">
          Tire uma foto da nota ou escolha da galeria para enviar para análise da IA.
        </p>

        {/* Botões de seleção */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col items-center justify-center gap-3 bg-white rounded-[10px] border border-black/[0.07] p-6 cursor-pointer hover:border-[#1a1a2e]/30 active:bg-gray-50 transition-colors">
            <span className="text-4xl">📷</span>
            <span className="text-[13px] font-medium text-[#1a1a2e]">Tirar foto</span>
            <span className="text-[11px] text-gray-400 text-center">Câmera traseira</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={handleFile}
            />
          </label>

          <label className="flex flex-col items-center justify-center gap-3 bg-white rounded-[10px] border border-black/[0.07] p-6 cursor-pointer hover:border-[#1a1a2e]/30 active:bg-gray-50 transition-colors">
            <span className="text-4xl">🖼️</span>
            <span className="text-[13px] font-medium text-[#1a1a2e]">Da galeria</span>
            <span className="text-[11px] text-gray-400 text-center">Foto, PDF ou XML</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              hidden
              onChange={handleFile}
            />
          </label>
        </div>

        {/* Arquivo selecionado */}
        {arquivo && !enviando && (
          <div className="bg-white rounded-[10px] border border-black/[0.07] p-4">
            <p className="text-[11px] text-gray-400 mb-1">Arquivo selecionado</p>
            <p className="text-[13px] font-medium text-[#1a1a2e] truncate">{arquivo.name}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {(arquivo.size / 1024).toFixed(0)} KB
            </p>
          </div>
        )}

        {/* Enviando */}
        {enviando && (
          <div className="rounded-[10px] border border-[#AFA9EC] p-4 text-center" style={{ background: '#EEEDFE' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#3C3489] animate-ping" />
              <p className="text-[13px] font-medium text-[#3C3489]">Enviando para análise da IA…</p>
            </div>
            <p className="text-[11px] text-[#3C3489]/60">Você receberá a resposta em breve</p>
          </div>
        )}

        {/* Botão enviar */}
        {arquivo && !enviando && (
          <Button
            variant="primary"
            className="w-full justify-center py-3 text-[14px]"
            onClick={handleEnviar}
          >
            Enviar para aprovação
          </Button>
        )}
      </div>
    </MobileShell>
  )
}
