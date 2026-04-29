import React from 'react'

interface AIPanelProps {
  title?: string
  children: React.ReactNode
  pulsing?: boolean
  className?: string
}

export function AIPanel({ title = 'Análise de IA', children, pulsing = false, className = '' }: AIPanelProps) {
  return (
    <div
      className={`rounded-[10px] border border-[#AFA9EC] p-3 ${className}`}
      style={{ background: '#EEEDFE', padding: '12px 14px' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2 w-2">
          <span
            className={`${pulsing ? 'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75' : 'hidden'} bg-[#3C3489]`}
          />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3C3489]" />
        </span>
        <p className="text-[12px] font-medium text-[#3C3489]">{title}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
