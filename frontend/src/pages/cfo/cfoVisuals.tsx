import React from 'react'

export interface TrendChartPoint {
  label: string
  values: Record<string, number>
}

export interface TrendChartSeries {
  key: string
  label: string
  color: string
}

interface MultiSeriesTrendChartProps {
  points: TrendChartPoint[]
  series: TrendChartSeries[]
  formatValue: (value: number) => string
  emptyText?: string
}

export function MultiSeriesTrendChart({
  points,
  series,
  formatValue,
  emptyText = 'Sem dados para o periodo.',
}: MultiSeriesTrendChartProps) {
  if (points.length === 0) {
    return <p className="py-8 text-center text-[13px] text-gray-400">{emptyText}</p>
  }

  const width = 640
  const height = 238
  const top = 20
  const right = 28
  const bottom = 42
  const left = 60
  const chartWidth = width - left - right
  const chartHeight = height - top - bottom
  const values = points.flatMap((point) => series.map((item) => point.values[item.key] ?? 0))
  const max = Math.max(...values, 0)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const yTicks = [0, 0.5, 1].map((step) => min + range * step)

  const xFor = (index: number) => {
    if (points.length === 1) return left + chartWidth / 2
    return left + (index / (points.length - 1)) * chartWidth
  }

  const yFor = (value: number) => top + ((max - value) / range) * chartHeight
  const zeroY = yFor(0)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
        {series.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full overflow-visible" role="img" aria-label="Grafico mensal CFO">
        {yTicks.map((tick) => {
          const y = yFor(tick)
          return (
            <g key={tick}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke="#ECEEF3" strokeWidth="1" />
              <text x={left - 10} y={y + 4} textAnchor="end" className="fill-gray-400 text-[10px]">
                {formatValue(tick)}
              </text>
            </g>
          )
        })}

        {min < 0 && max > 0 && (
          <line x1={left} x2={width - right} y1={zeroY} y2={zeroY} stroke="#A0A7B5" strokeDasharray="4 4" />
        )}

        {series.map((item) => {
          const path = points
            .map((point, index) => `${xFor(index)},${yFor(point.values[item.key] ?? 0)}`)
            .join(' ')

          return (
            <g key={item.key}>
              <polyline points={path} fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((point, index) => (
                <circle
                  key={`${item.key}-${point.label}`}
                  cx={xFor(index)}
                  cy={yFor(point.values[item.key] ?? 0)}
                  r="4"
                  fill="#fff"
                  stroke={item.color}
                  strokeWidth="2"
                />
              ))}
            </g>
          )
        })}

        {points.map((point, index) => (
          <text key={point.label} x={xFor(index)} y={height - 16} textAnchor="middle" className="fill-gray-500 text-[10px]">
            {point.label}
          </text>
        ))}
      </svg>
    </div>
  )
}

export interface ExecutiveBarItem {
  label: string
  value: number
  description?: string
  color?: string
  secondaryValue?: number
  secondaryLabel?: string
  badge?: React.ReactNode
}

interface ExecutiveBarListProps {
  items: ExecutiveBarItem[]
  formatValue: (value: number) => string
  emptyText?: string
}

export function ExecutiveBarList({ items, formatValue, emptyText = 'Sem dados para exibir.' }: ExecutiveBarListProps) {
  if (items.length === 0) {
    return <p className="py-5 text-[13px] text-gray-400">{emptyText}</p>
  }

  const max = Math.max(...items.flatMap((item) => [item.value, item.secondaryValue ?? 0]), 1)

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const mainWidth = Math.max(2, Math.round((item.value / max) * 100))
        const secondaryWidth = item.secondaryValue ? Math.max(2, Math.round((item.secondaryValue / max) * 100)) : 0

        return (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[#1a1a2e]">{item.label}</p>
                {item.description && <p className="text-[11px] text-gray-400">{item.description}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {item.badge}
                <span className="text-[12px] font-medium text-[#1a1a2e]">{formatValue(item.value)}</span>
              </div>
            </div>
            <div className="h-[8px] overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full" style={{ width: `${mainWidth}%`, background: item.color ?? '#1a1a2e' }} />
            </div>
            {item.secondaryValue != null && (
              <div className="flex items-center gap-2">
                <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[#FCEBEB]">
                  <div className="h-full rounded-full bg-[#F09595]" style={{ width: `${secondaryWidth}%` }} />
                </div>
                <span className="w-[128px] shrink-0 text-right text-[11px] text-[#791F1F]">
                  {item.secondaryLabel ?? 'Risco'} {formatValue(item.secondaryValue)}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface RiskMeterProps {
  score: number
  label?: string
}

export function RiskMeter({ score, label }: RiskMeterProps) {
  const safeScore = Math.max(0, Math.min(100, score))
  const color = safeScore >= 70 ? '#F09595' : safeScore >= 35 ? '#FAC775' : '#97C459'

  return (
    <div className="min-w-[118px]">
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
        <span className="text-gray-400">{label ?? 'Risco'}</span>
        <span className="font-medium text-[#1a1a2e]">{safeScore}</span>
      </div>
      <div className="h-[7px] overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full" style={{ width: `${safeScore}%`, background: color }} />
      </div>
    </div>
  )
}

export interface PieSegment {
  label: string
  value: number
  color: string
  sublabel?: string
}

interface CompliancePieChartProps {
  segments: PieSegment[]
  emptyText?: string
}

function arcPath(start: number, end: number, cx: number, cy: number, r: number, innerR: number): string {
  const gap = 0.03
  const s = start + gap / 2
  const e = end - gap / 2
  if (e <= s) return ''
  const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s)
  const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e)
  const x3 = cx + innerR * Math.cos(e), y3 = cy + innerR * Math.sin(e)
  const x4 = cx + innerR * Math.cos(s), y4 = cy + innerR * Math.sin(s)
  const large = (e - s) > Math.PI ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4} Z`
}

export function CompliancePieChart({ segments, emptyText = 'Sem dados no periodo.' }: CompliancePieChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0 || segments.length === 0) {
    return <p className="py-8 text-center text-[13px] text-gray-400">{emptyText}</p>
  }

  const cx = 90, cy = 90, r = 76, innerR = 48

  let cumAngle = -Math.PI / 2
  const arcs = segments.map((seg) => {
    const angle = (seg.value / total) * 2 * Math.PI
    const start = cumAngle
    const end = cumAngle + angle
    cumAngle = end
    return { ...seg, start, end }
  })

  const visible = segments.slice(0, 8)
  const overflow = segments.length - visible.length

  return (
    <div className="flex items-start gap-5">
      <div className="shrink-0">
        <svg viewBox="0 0 180 180" className="h-[180px] w-[180px]">
          {arcs.map((arc, i) => {
            const d = arcPath(arc.start, arc.end, cx, cy, r, innerR)
            return d ? <path key={i} d={d} fill={arc.color} /> : null
          })}
          <text x={cx} y={cy - 8} textAnchor="middle" fontSize="22" fontWeight="700" fill="#1a1a2e">
            {segments.length}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fill="#9ca3af">
            {segments.length === 1 ? 'item' : 'itens'}
          </text>
        </svg>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-3 overflow-hidden py-1">
        {visible.map((seg, i) => {
          const share = Math.round((seg.value / total) * 100)
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-[3px] h-3 w-3 shrink-0 rounded-full" style={{ background: seg.color }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[12px] font-medium text-[#1a1a2e]">{seg.label}</p>
                  <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">{share}%</span>
                </div>
                {seg.sublabel && (
                  <p className="mt-0.5 text-[11px] text-gray-400">{seg.sublabel}</p>
                )}
              </div>
            </div>
          )
        })}
        {overflow > 0 && <p className="text-[11px] text-gray-400">+{overflow} outros</p>}
      </div>
    </div>
  )
}
