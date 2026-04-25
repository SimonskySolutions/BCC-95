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
          {versions.map((v) => (
            <tr
              key={v.id}
              className={`border-t border-slate-100 ${v.id === currentVersionId ? 'bg-blue-50/40' : ''}`}
            >
              <td className="px-3 py-2 font-medium text-slate-800">v{v.versionNo}</td>
              <td className="px-3 py-2">
                <OfferStatusBadge status={v.status} />
              </td>
              <td className="px-3 py-2 text-xs text-slate-600">{v.createdAt?.slice(0, 10)}</td>
              <td className="px-3 py-2 text-xs text-slate-600">{v.sentAt?.slice(0, 10) ?? '—'}</td>
              <td className="px-3 py-2 text-right text-slate-800">
                {v.subtotal.toFixed(2)} {v.currency ?? 'EUR'}
              </td>
              <td className="px-3 py-2 text-right">
                {onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(v.id)}
                    className="text-xs font-medium text-blue-700 hover:text-blue-900"
                  >
                    {t('common.select')}
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
