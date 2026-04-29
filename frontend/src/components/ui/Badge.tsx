import React from 'react'

export type BadgeVariant = 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'gray'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  green:  'bg-[#EAF3DE] text-[#27500A] border border-[#97C459]',
  amber:  'bg-[#FAEEDA] text-[#633806] border border-[#FAC775]',
  red:    'bg-[#FCEBEB] text-[#791F1F] border border-[#F09595]',
  blue:   'bg-[#E6F1FB] text-[#0C447C] border border-[#85B7EB]',
  purple: 'bg-[#EEEDFE] text-[#3C3489] border border-[#AFA9EC]',
  gray:   'bg-gray-100 text-gray-600 border border-gray-300',
}

export function Badge({ variant = 'gray', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
