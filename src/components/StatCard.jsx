import {
  Building2,
  ClipboardList,
  FolderKanban,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage.js'

const iconMap = {
  Users,
  ClipboardList,
  FolderKanban,
  Building2,
}

const COLOR_MAP = {
  blue:    { iconBg: 'bg-blue-100',    iconText: 'text-blue-600',    border: 'border-l-blue-500',    gradFrom: 'from-blue-50' },
  violet:  { iconBg: 'bg-violet-100',  iconText: 'text-violet-600',  border: 'border-l-violet-500',  gradFrom: 'from-violet-50' },
  emerald: { iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', border: 'border-l-emerald-500', gradFrom: 'from-emerald-50' },
  amber:   { iconBg: 'bg-amber-100',   iconText: 'text-amber-600',   border: 'border-l-amber-500',   gradFrom: 'from-amber-50' },
}

/**
 * @param {{ item: { id: string; icon: string; label: string; value: string; trend: string; positive: boolean; color?: string } }} props
 */
export default function StatCard({ item }) {
  const { t } = useLanguage()
  const Icon = iconMap[item.icon] ?? Users
  const color = COLOR_MAP[item.color ?? 'blue']

  return (
    <article className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white border-l-4 ${color.border} p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md`}>
      {/* Subtle gradient tint */}
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${color.gradFrom} to-transparent opacity-40`} />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <span className={`rounded-xl p-2.5 ${color.iconBg} ${color.iconText}`}>
            <Icon size={18} />
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${item.positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {item.positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {item.positive ? t('statCard.upward') : t('statCard.watch')}
          </span>
        </div>

        <p className="text-4xl font-bold tracking-tight text-slate-900">{item.value}</p>
        <p className="mt-1 text-sm font-medium text-slate-500">{item.label}</p>
        <p className={`mt-3 text-xs font-medium ${item.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
          {item.trend}
        </p>
      </div>
    </article>
  )
}
