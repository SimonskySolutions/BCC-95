import { selectShippingDispatchSummary } from '../domains/shipping/selectors.js'
import { selectProductById } from '../domains/products/selectors.js'
import { useLanguage } from '../i18n/useLanguage.js'

/**
 * @param {{ db: import('../data/mockDatabase.js').MockDatabase }} props
 */
export default function ShippingPage({ db }) {
  const { t } = useLanguage()
  const summary = selectShippingDispatchSummary(db)
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase text-slate-500">{t('ship.onTimeDispatch')}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{summary.onTimePercent}%</p>
          <p className="text-xs text-slate-500">
            {summary.onTimeCount}/{summary.dispatchedCount} {t('ship.onTimeDetail')}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase text-slate-500">{t('ship.ready')}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{summary.readyCount}</p>
          <p className="text-xs text-slate-500">{t('ship.awaitingPickup')}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase text-slate-500">{t('ship.blocked')}</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{summary.blocked.length}</p>
          <p className="text-xs text-slate-500">{t('ship.needsResolution')}</p>
        </div>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('ship.blockedTitle')}</h3>
        {summary.blocked.length === 0 ? (
          <p className="text-sm text-slate-500">{t('ship.noBlocked')}</p>
        ) : (
          <ul className="space-y-2">
            {summary.blocked.map((s) => {
              const p = selectProductById(db, s.productId)
              return (
                <li
                  key={s.id}
                  className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950"
                >
                  <span className="font-semibold">{s.id}</span> — {p?.name ?? s.productId}:{' '}
                  {s.blockedReason ?? t('ship.blockedFallback')}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
