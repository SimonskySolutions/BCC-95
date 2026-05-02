import {
  BadgeCheck,
  BarChart3,
  BookText,
  Bot,
  Building2,
  CalendarDays,
  ClipboardList,
  ContactRound,
  Cpu,
  Factory,
  FileBarChart2,
  LayoutDashboard,
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
}

function SidebarItem({ item, onSelect, theme }) {
  const Icon = iconMap[item.icon] ?? LayoutDashboard

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={`group flex w-full items-center gap-3 rounded-xl border-l-2 px-3 py-2.5 text-left text-sm transition-all ${
        item.active
          ? `${theme.activeItemBg} border-white/40 text-white shadow-sm`
          : 'border-transparent text-white/60 hover:bg-white/8 hover:text-white'
      }`}
    >
      <span className={`rounded-lg p-1.5 ${item.active ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 group-hover:bg-white/10 group-hover:text-white/80'}`}>
        <Icon size={14} />
      </span>
      <span className="font-medium">{item.label}</span>
    </button>
  )
}

function SidebarContent({ items, onSelect, onClose }) {
  const { config, theme } = useFactoryConfig()

  return (
    <div className="flex h-full flex-col bg-slate-900">
      {/* Brand header */}
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-2 ${theme.iconBg}`}>
            <Building2 size={17} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{config.companyName}</p>
            <p className="text-xs text-white/40">{config.companySubtitle}</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white md:hidden"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {items.map((item) => (
          <SidebarItem key={item.id} item={item} onSelect={onSelect} theme={theme} />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-3 space-y-2">
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
  const handleSelect = (id) => {
    onSelect(id)
    onMobileClose()
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-60 shrink-0 xl:w-64 md:block">
        <SidebarContent items={items} onSelect={onSelect} />
      </aside>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer panel */}
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
