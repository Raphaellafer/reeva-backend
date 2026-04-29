import React from 'react'
import { NavLink } from 'react-router-dom'

export interface SidebarNavItem {
  label: string
  href: string
  icon?: React.ReactNode
  exact?: boolean
}

export interface SidebarSection {
  title?: string
  items: SidebarNavItem[]
}

interface SidebarProps {
  sections: SidebarSection[]
  userLabel?: string
  userRole?: string
  userInitials?: string
  logo?: React.ReactNode
  onLogout?: () => void
  onClose?: () => void
}

export function Sidebar({ sections, userLabel, userRole, userInitials, logo, onLogout, onClose }: SidebarProps) {
  return (
    <aside className="flex flex-col h-full bg-white border-r border-black/[0.07] shrink-0 w-[220px]">
      <div className="flex items-center justify-between h-[52px] px-4 border-b border-black/[0.07]">
        {logo ?? (
          <span className="text-[16px] font-medium text-[#1a1a2e] tracking-tight">Reeva</span>
        )}
        {onClose && (
          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {sections.map((section, sIdx) => (
          <div key={sIdx}>
            {section.title && (
              <p className="px-2 mb-1 text-[11px] uppercase tracking-widest text-gray-400 font-medium">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item, iIdx) => (
                <li key={iIdx}>
                  <NavLink
                    to={item.href}
                    end={item.exact}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-[7px] px-3 py-2.5 text-[14px] font-medium transition-colors ${
                        isActive
                          ? 'bg-[#1a1a2e] text-white'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`
                    }
                  >
                    {item.icon && <span className="shrink-0 w-4 h-4">{item.icon}</span>}
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {userLabel && (
        <div className="p-3 border-t border-black/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center text-[12px] font-medium shrink-0">
              {userInitials ?? userLabel.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-gray-900 truncate">{userLabel}</p>
              {userRole && <p className="text-[11px] text-gray-400 truncate">{userRole}</p>}
            </div>
            {onLogout && (
              <button onClick={onLogout} className="text-[11px] text-gray-400 hover:text-gray-700 shrink-0">
                Sair
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
