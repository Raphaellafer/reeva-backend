import React from 'react'
import { Card } from './Card'

interface MetricCardProps {
  label: string
  value: string | number
  subtext?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  className?: string
}

const trendColors = {
  up:      'text-[#27500A]',
  down:    'text-[#791F1F]',
  neutral: 'text-gray-500',
}

const trendArrows = {
  up:      '↑',
  down:    '↓',
  neutral: '→',
}

export function MetricCard({ label, value, subtext, trend, trendValue, className = '' }: MetricCardProps) {
  return (
    <Card className={`relative z-10 overflow-hidden ${className}`}>
      <p className="text-[12px] text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-[30px] font-medium leading-none text-[#1a1a2e]">{value}</p>
      {(subtext || trend) && (
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          {trend && trendValue && (
            <span className={`text-[12px] font-medium ${trendColors[trend]}`}>
              {trendArrows[trend]} {trendValue}
            </span>
          )}
          {subtext && (
            <span className="text-[12px] text-gray-400">{subtext}</span>
          )}
        </div>
      )}
    </Card>
  )
}
