import {
  BadgeCheck,
  BarChart3,
  BookText,
  Bot,
  Building2,
  CalendarDays,
  ChevronsUpDown,
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
  Users,
} from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage.js'

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
}

/**
 * @param {{ item: { id: string; icon: string; label: string; active: boolean }; onSelect: (id: string) => void }} props
 */
function SidebarItem({ item, onSelect }) {
  const Icon = iconMap[item.icon] ?? LayoutDashboard

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
        item.active
          ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm'
          : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900'
      }`}
    >
      <span className={`rounded-lg p-1.5 ${item.active ? 'bg-white text-blue-700' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
        <Icon size={15} />
      </span>
      <span className="font-medium">{item.label}</span>
    </button>
  )
}

/**
 * @param {{
 *   items: { id: string; icon: string; label: string; active: boolean }[]
 *   onSelect: (id: string) => void
 * }} props
 */
export default function Sidebar({ items, onSelect }) {
  const { t } = useLanguage()

  return (
    <aside className="hidden h-screen w-64 shrink-0 border-r border-slate-200/80 bg-white/95 p-5 backdrop-blur md:flex md:flex-col xl:w-72">
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="rounded-xl bg-blue-600 p-2 text-white">
          <Building2 size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{t('sidebar.brandTitle')}</p>
          <p className="text-xs text-slate-500">{t('sidebar.brandSubtitle')}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto">
        {items.map((item) => (
          <SidebarItem key={item.id} item={item} onSelect={onSelect} />
        ))}
      </nav>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left"
        >
          <div>
            <p className="text-sm font-semibold text-slate-900">{t('sidebar.workspaceTitle')}</p>
            <p className="text-xs text-slate-500">{t('sidebar.workspaceSubtitle')}</p>
          </div>
          <ChevronsUpDown size={16} className="text-slate-500" />
        </button>

        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Sparkles size={15} />
          {t('sidebar.upgradePlan')}
        </button>
      </div>
    </aside>
  )
}
