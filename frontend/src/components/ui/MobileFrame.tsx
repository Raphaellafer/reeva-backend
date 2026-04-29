import React from 'react'

interface MobileFrameProps {
  children: React.ReactNode
  className?: string
}

export function MobileFrame({ children, className = '' }: MobileFrameProps) {
  return (
    <div className={`flex items-center justify-center min-h-screen bg-gray-200 p-8 ${className}`}>
      <div
        className="relative bg-white rounded-[44px] overflow-hidden shadow-2xl"
        style={{ width: 375, height: 812 }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-50" />

        {/* Status bar space */}
        <div className="h-11" />

        {/* Scrollable content */}
        <div className="h-[calc(100%-112px)] overflow-y-auto">
          {children}
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-8 flex items-center justify-center">
          <div className="w-28 h-1 rounded-full bg-black/20" />
        </div>
      </div>
    </div>
  )
}
