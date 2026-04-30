import React from 'react'
import { Badge, BadgeVariant } from './Badge'

const statusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
  APROVADO: { label: 'Aprovado', variant: 'green' },
  PENDENTE: { label: 'Pendente', variant: 'amber' },
  REJEITADO: { label: 'Rejeitado', variant: 'red' },
  ANALISE_IA: { label: 'Analise IA', variant: 'purple' },
  DRAFT: { label: 'Rascunho', variant: 'gray' },
  SUBMITTED: { label: 'Enviado', variant: 'blue' },
  AI_APPROVED: { label: 'IA aprovou', variant: 'purple' },
  PENDING_REVIEW: { label: 'Revisao', variant: 'amber' },
  MANAGER_APPROVED: { label: 'Aprovado', variant: 'green' },
  MANAGER_REJECTED: { label: 'Rejeitado', variant: 'red' },
  FINANCE_APPROVED: { label: 'Financeiro ok', variant: 'green' },
  FINANCE_REJECTED: { label: 'Financeiro recusou', variant: 'red' },
  PAID: { label: 'Pago', variant: 'green' },
  CANCELLED: { label: 'Cancelado', variant: 'gray' },
  NEEDS_REVISION: { label: 'Corrigir', variant: 'red' },
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
