import React from 'react'
import { Badge, BadgeVariant } from './Badge'

interface StatusConfig { label: string; variant: BadgeVariant }

const statusConfig: Record<string, StatusConfig> = {
  // Backend ExpenseStatus
  DRAFT:              { label: 'Rascunho',    variant: 'gray'   },
  SUBMITTED:          { label: 'Enviada',     variant: 'blue'   },
  AI_APPROVED:        { label: 'Aprovada IA', variant: 'purple' },
  PENDING_REVIEW:     { label: 'Em revisão',  variant: 'amber'  },
  MANAGER_APPROVED:   { label: 'Aprovada',    variant: 'green'  },
  MANAGER_REJECTED:   { label: 'Rejeitada',   variant: 'red'    },
  FINANCE_APPROVED:   { label: 'Fin. Aprovada', variant: 'green' },
  FINANCE_REJECTED:   { label: 'Fin. Rejeitada', variant: 'red'  },
  PAID:               { label: 'Paga',        variant: 'green'  },
  CANCELLED:          { label: 'Cancelada',   variant: 'gray'   },
  NEEDS_REVISION:     { label: 'Revisão',     variant: 'amber'  },
  OCR_FAILED:         { label: 'Erro OCR',    variant: 'red'    },
  // Legacy mock statuses
  APROVADO:   { label: 'Aprovado',    variant: 'green'  },
  PENDENTE:   { label: 'Pendente',    variant: 'amber'  },
  REJEITADO:  { label: 'Rejeitado',   variant: 'red'    },
  ANALISE_IA: { label: 'Análise IA',  variant: 'purple' },
}

interface StatusBadgeProps {
  status: string
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
