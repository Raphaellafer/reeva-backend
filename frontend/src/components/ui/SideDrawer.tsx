import React, { useEffect } from 'react'

interface SideDrawerProps {
  open: boolean
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  onClose: () => void
}

export function SideDrawer({ open, title, children, footer, onClose }: SideDrawerProps) {
  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Fechar painel"
        className="absolute inset-0 bg-black/35"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full flex-col bg-white shadow-2xl sm:max-w-[640px]">
        <div className="flex items-center justify-between gap-4 border-b border-black/[0.07] px-5 py-4">
          <h2 className="text-[16px] font-semibold text-[#1a1a2e]">{title}</h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-black/[0.08] text-[14px] font-semibold text-gray-500 hover:bg-black/[0.04] hover:text-[#1a1a2e]"
          >
            x
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer && (
          <div className="border-t border-black/[0.07] bg-white px-5 py-4">
            {footer}
          </div>
        )}
      </aside>
    </div>
  )
}
