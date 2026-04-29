import React from 'react'
import { NavLink } from 'react-router-dom'

export interface MobileNavItem {
  label: string
  href: string
  icon: React.ReactNode
  exact?: boolean
}

interface MobileNavProps {
  items: MobileNavItem[]
}

export function MobileNav({ items }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-black/[0.07] flex">
      {items.map((item, idx) => (
        <NavLink
          key={idx}
          to={item.href}
          end={item.exact}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors ${
              isActive ? 'text-[#1a1a2e]' : 'text-gray-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className={`w-5 h-5 ${isActive ? 'text-[#1a1a2e]' : 'text-gray-400'}`}>
                {item.icon}
              </span>
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
