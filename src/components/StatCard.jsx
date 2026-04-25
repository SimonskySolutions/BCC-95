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

export default function StatCard({ item }) {
  const { t } = useLanguage()
  const Icon = iconMap[item.icon] ?? Users

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-xl bg-blue-50 p-2 text-blue-700">
          <Icon size={18} />
        </span>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${item.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
          {item.positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {item.positive ? t('statCard.upward') : t('statCard.watch')}
        </span>
      </div>
      <p className="text-3xl font-semibold tracking-tight text-slate-900">{item.value}</p>
      <p className="mt-1 text-sm text-slate-500">{item.label}</p>
      <p className={`mt-3 text-xs font-medium ${item.positive ? 'text-emerald-600' : 'text-rose-600'}`}>{item.trend}</p>
    </article>
  )
}
