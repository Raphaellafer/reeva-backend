import React from 'react'

export interface BarChartItem {
  label: string
  value: number
  color?: string
}

interface HorizontalBarChartProps {
  items: BarChartItem[]
  formatValue?: (v: number) => string
  className?: string
}

export function HorizontalBarChart({ items, formatValue, className = '' }: HorizontalBarChartProps) {
  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <div className={`space-y-2.5 ${className}`}>
      {items.map((item, idx) => {
        const pct = Math.round((item.value / max) * 100)
        return (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-[11px] text-gray-600 w-28 shrink-0 truncate">{item.label}</span>
            <div className="flex-1 h-[6px] bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  background: item.color ?? '#1a1a2e',
                }}
              />
            </div>
            <span className="text-[11px] font-medium text-gray-700 w-16 text-right shrink-0">
              {formatValue ? formatValue(item.value) : item.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}
