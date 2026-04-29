import React from 'react'

interface ProgressBarProps {
  value: number
  max?: number
  color?: string
  className?: string
  showLabel?: boolean
}

export function ProgressBar({ value, max = 100, color = '#1a1a2e', className = '', showLabel = false }: ProgressBarProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={`w-full ${className}`}>
      <div className="h-[4px] w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-[10px] text-gray-400">{Math.round(pct)}%</p>
      )}
    </div>
  )
}
