import React from 'react'

export interface TimelineItem {
  label: string
  date?: string
  color?: 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'gray'
  description?: string
}

interface TimelineProps {
  items: TimelineItem[]
  className?: string
}

const dotColors = {
  green:  'bg-[#97C459]',
  amber:  'bg-[#FAC775]',
  red:    'bg-[#F09595]',
  blue:   'bg-[#85B7EB]',
  purple: 'bg-[#AFA9EC]',
  gray:   'bg-gray-300',
}

export function Timeline({ items, className = '' }: TimelineProps) {
  return (
    <div className={`space-y-0 ${className}`}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1
        const dotClass = dotColors[item.color ?? 'gray']
        return (
          <div key={idx} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${dotClass}`} />
              {!isLast && <span className="flex-1 w-px bg-gray-200 my-1" />}
            </div>
            <div className={`${isLast ? '' : 'pb-4'}`}>
              <p className="text-[12px] font-medium text-gray-800">{item.label}</p>
              {item.description && (
                <p className="text-[11px] text-gray-500 mt-0.5">{item.description}</p>
              )}
              {item.date && (
                <p className="text-[10px] text-gray-400 mt-0.5">{item.date}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
