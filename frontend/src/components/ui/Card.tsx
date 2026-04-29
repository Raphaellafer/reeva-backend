import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`rounded-[10px] border border-black/[0.07] bg-white p-3 ${onClick ? 'cursor-pointer hover:border-black/10' : ''} ${className}`}
      style={{ padding: '12px 14px' }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
