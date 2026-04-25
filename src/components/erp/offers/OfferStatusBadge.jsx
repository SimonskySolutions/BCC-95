import { useLanguage } from '../../../i18n/useLanguage.js'

/** @type {Record<string, { bg: string; text: string; ring: string }>} */
const STYLES = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-200' },
  pending_approval: { bg: 'bg-amber-50', text: 'text-amber-800', ring: 'ring-amber-200' },
  approved: { bg: 'bg-indigo-50', text: 'text-indigo-800', ring: 'ring-indigo-200' },
  sent: { bg: 'bg-blue-50', text: 'text-blue-800', ring: 'ring-blue-200' },
  revision_requested: { bg: 'bg-amber-50', text: 'text-amber-800', ring: 'ring-amber-200' },
  accepted: { bg: 'bg-emerald-50', text: 'text-emerald-800', ring: 'ring-emerald-200' },
  rejected: { bg: 'bg-rose-50', text: 'text-rose-800', ring: 'ring-rose-200' },
  superseded: { bg: 'bg-slate-100', text: 'text-slate-500', ring: 'ring-slate-200' },
  decided: { bg: 'bg-emerald-50', text: 'text-emerald-800', ring: 'ring-emerald-200' },
}

/**
 * @param {{ status: string }} props
 */
export default function OfferStatusBadge({ status }) {
  const { t } = useLanguage()
  const style = STYLES[status] ?? STYLES.draft
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.bg} ${style.text} ${style.ring}`}
    >
      {t(`offer.status.${status}`, status)}
    </span>
  )
}
