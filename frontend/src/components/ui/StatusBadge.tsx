import React from 'react'
import { statusLabel } from '../../realData'
import { Badge, BadgeVariant } from './Badge'

interface StatusConfig {
  label: string
  variant: BadgeVariant
}

const statusConfig: Record<string, StatusConfig> = {
  DRAFT: { label: 'Rascunho', variant: 'gray' },
  SUBMITTED: { label: 'Enviada', variant: 'blue' },
  AI_APPROVED: { label: 'Aprovada IA', variant: 'purple' },
  PENDING_REVIEW: { label: 'Em revisão', variant: 'amber' },
  MANAGER_APPROVED: { label: 'Aprovada', variant: 'green' },
  MANAGER_REJECTED: { label: 'Rejeitada', variant: 'red' },
  FINANCE_APPROVED: { label: 'Financeiro OK', variant: 'green' },
  FINANCE_REJECTED: { label: 'Fin. rejeitada', variant: 'red' },
  PAID: { label: 'Paga', variant: 'green' },
  CANCELLED: { label: 'Cancelada', variant: 'gray' },
  NEEDS_REVISION: { label: 'Corrigir', variant: 'amber' },
  OCR_FAILED: { label: 'Leitura falhou', variant: 'red' },
  APROVADO: { label: 'Aprovado', variant: 'green' },
  PENDENTE: { label: 'Pendente', variant: 'amber' },
  REJEITADO: { label: 'Rejeitado', variant: 'red' },
  ANALISE_IA: { label: 'Análise IA', variant: 'purple' },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: statusLabel(status), variant: 'gray' as BadgeVariant }
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}
