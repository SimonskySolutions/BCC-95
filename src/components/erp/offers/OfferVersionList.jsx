import { useLanguage } from '../../../i18n/useLanguage.js'
import OfferStatusBadge from './OfferStatusBadge.jsx'

/**
 * @param {{
 *   versions: import('../../../domains/quotations/model.js').QuoteVersion[]
 *   currentVersionId?: string
 *   onSelect?: (versionId: string) => void
 * }} props
 */
export default function OfferVersionList({ versions, currentVersionId, onSelect }) {
  const { t } = useLanguage()
  if (!versions || versions.length === 0) {
    return <p className="text-xs text-slate-500">{t('offer.noVersions')}</p>
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">{t('offer.version')}</th>
            <th className="px-3 py-2">{t('common.status')}</th>
            <th className="px-3 py-2">{t('offer.createdAt')}</th>
            <th className="px-3 py-2">{t('offer.sentAt')}</th>
            <th className="px-3 py-2 text-right">{t('offer.subtotal')}</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => {
            const isSelected = v.id === currentVersionId
            return (
              <tr
                key={v.id}
                className={`border-t border-slate-100 transition-colors ${isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 'hover:bg-slate-50/60'}`}
              >
                <td className={`px-3 py-2.5 font-semibold ${isSelected ? 'text-blue-800' : 'text-slate-800'}`}>
                  v{v.versionNo}
                  {isSelected && <span className="ml-1.5 text-[10px] font-medium text-blue-500">viewing</span>}
                </td>
                <td className="px-3 py-2.5">
                  <OfferStatusBadge status={v.status} />
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-600">{v.createdAt?.slice(0, 10)}</td>
                <td className="px-3 py-2.5 text-xs text-slate-600">{v.sentAt?.slice(0, 10) ?? '—'}</td>
                <td className="px-3 py-2.5 text-right font-medium text-slate-800">
                  {v.subtotal.toFixed(2)} {v.currency ?? 'EUR'}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {onSelect && !isSelected ? (
                    <button
                      type="button"
                      onClick={() => onSelect(v.id)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    >
                      {t('common.select')}
                    </button>
                  ) : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
