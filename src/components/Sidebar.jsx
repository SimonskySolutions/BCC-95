import { useState } from 'react'
import {
  BadgeCheck,
  BarChart3,
  BookText,
  Bot,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  ContactRound,
  Cpu,
  Factory,
  FileBarChart2,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  Truck,
  UserCircle2,
  Users,
  Warehouse,
  X,
} from 'lucide-react'
import { useFactoryConfig } from '../config/useFactoryConfig.js'
import Logo from './branding/Logo.jsx'

const COLLAPSE_KEY = 'bcc95:sidebar-collapsed'

const iconMap = {
  LayoutDashboard,
  Package,
  ClipboardList,
  CalendarDays,
  Factory,
  Cpu,
  ShoppingCart,
  Truck,
  Users,
  BadgeCheck,
  BarChart3,
  FileBarChart2,
  Bot,
  Sparkles,
  ContactRound,
  BookText,
  Settings,
  Warehouse,
  UserCircle2,
  MessageSquare,
}

function SidebarItem({ item, onSelect, theme, collapsed }) {
  const Icon = iconMap[item.icon] ?? LayoutDashboard

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      title={collapsed ? item.label : undefined}
      className={`group flex w-full items-center gap-3 rounded-xl border-l-2 px-3 py-2.5 text-left text-sm transition-all ${
        collapsed ? 'justify-center' : ''
      } ${
        item.active
          ? `${theme.activeItemBg} border-white/40 text-white shadow-sm`
          : 'border-transparent text-white/60 hover:bg-white/8 hover:text-white'
      }`}
    >
      <span className={`rounded-lg p-1.5 ${item.active ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 group-hover:bg-white/10 group-hover:text-white/80'}`}>
        <Icon size={14} />
      </span>
      {!collapsed ? <span className="font-medium">{item.label}</span> : null}
    </button>
  )
}

function SidebarContent({ items, onSelect, onClose, collapsed = false, onToggleCollapse }) {
  const { config, theme } = useFactoryConfig()

  return (
    <div className="flex h-full flex-col bg-slate-900">
      {/* Brand header */}
      <div className={`flex items-center border-b border-white/10 p-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-3 min-w-0">
          <Logo variant="mark" size={32} inkClassName="text-white" className="shrink-0" />
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{config.companyName}</p>
              <p className="truncate text-xs text-white/40">{config.companySubtitle}</p>
            </div>
          ) : null}
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white md:hidden"
          >
            <X size={16} />
          </button>
        ) : null}
        {/* Desktop collapse toggle */}
        {onToggleCollapse && !collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white md:block"
            title="Collapse"
          >
            <ChevronsLeft size={16} />
          </button>
        ) : null}
      </div>

      {/* Expand button when collapsed */}
      {onToggleCollapse && collapsed ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="mx-auto mt-2 hidden rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white md:block"
          title="Expand"
        >
          <ChevronsRight size={16} />
        </button>
      ) : null}

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {items.map((item) => (
          <SidebarItem key={item.id} item={item} onSelect={onSelect} theme={theme} collapsed={collapsed} />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-3 space-y-2">
        {collapsed ? (
          <div className={`mx-auto rounded-full ${theme.iconBg} p-1.5 w-fit`} title={config.adminName}>
            <UserCircle2 size={15} className="text-white" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
              <div className={`rounded-full ${theme.iconBg} p-1.5 shrink-0`}>
                <UserCircle2 size={15} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{config.adminName}</p>
                <p className="truncate text-xs text-white/40">{config.adminRole}</p>
              </div>
            </div>
            <button
              type="button"
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${theme.primaryBtn}`}
            >
              <Sparkles size={13} />
              Upgrade plan
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * @param {{
 *   items: { id: string; icon: string; label: string; active: boolean }[]
 *   onSelect: (id: string) => void
 *   mobileOpen: boolean
 *   onMobileClose: () => void
 * }} props
 */
export default function Sidebar({ items, onSelect, mobileOpen, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })
  const toggleCollapse = () => {
    setCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const handleSelect = (id) => {
    onSelect(id)
    onMobileClose()
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden h-screen shrink-0 transition-[width] duration-200 md:block ${collapsed ? 'w-16' : 'w-60 xl:w-64'}`}>
        <SidebarContent items={items} onSelect={onSelect} collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </aside>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer panel (always expanded) */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent items={items} onSelect={handleSelect} onClose={onMobileClose} />
      </div>
    </>
  )
}
