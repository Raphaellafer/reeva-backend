import React from 'react'
import { Badge, BadgeVariant } from './Badge'
import type { NotaStatus } from '../../types/index'

const statusConfig: Record<NotaStatus, { label: string; variant: BadgeVariant }> = {
  APROVADO:   { label: 'Aprovado',    variant: 'green'  },
  PENDENTE:   { label: 'Pendente',    variant: 'amber'  },
  REJEITADO:  { label: 'Rejeitado',   variant: 'red'    },
  ANALISE_IA: { label: 'Análise IA',  variant: 'purple' },
}

interface StatusBadgeProps {
  status: NotaStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, variant: 'gray' as BadgeVariant }
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}
