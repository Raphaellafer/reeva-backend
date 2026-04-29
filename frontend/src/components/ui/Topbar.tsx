import React from 'react'

interface TopbarProps {
  title: string
  actions?: React.ReactNode
  onMenuClick?: () => void
  className?: string
}

export function Topbar({ title, actions, onMenuClick, className = '' }: TopbarProps) {
  return (
    <header
      className={`flex items-center justify-between bg-white border-b border-black/[0.07] px-4 md:px-6 shrink-0 ${className}`}
      style={{ height: 52 }}
    >
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden flex flex-col gap-1.5 p-1"
            aria-label="Abrir menu"
          >
            <span className="block w-5 h-[1.5px] bg-gray-700" />
            <span className="block w-5 h-[1.5px] bg-gray-700" />
            <span className="block w-3.5 h-[1.5px] bg-gray-700" />
          </button>
        )}
        <h1 className="text-[15px] font-medium text-[#1a1a2e]">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}
