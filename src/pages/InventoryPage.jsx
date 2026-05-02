import { useMemo, useState } from 'react'
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage.js'
import {
  selectQuantsByLocation,
  selectLocationsByType,
  selectStockMoves,
  selectLocationSummaries,
} from '../domains/inventory/selectors.js'

/** @param {string} state */
function moveStateStyle(state) {
  switch (state) {
    case 'done':      return 'bg-emerald-100 text-emerald-800'
    case 'confirmed': return 'bg-sky-100 text-sky-700'
    case 'cancelled': return 'bg-slate-100 text-slate-500'
    default:          return 'bg-amber-100 text-amber-700'
  }
}

/** @param {string} locId */
function locationColor(locId) {
  if (locId === 'loc-raw') return 'border-l-amber-400'
  if (locId === 'loc-wip') return 'border-l-violet-400'
  if (locId === 'loc-fg')  return 'border-l-emerald-400'
  return 'border-l-slate-300'
}

/**
 * @param {{
 *   db: import('../data/mockDatabase.js').MockDatabase
 * }} props
 */
export default function InventoryPage({ db }) {
  const { t } = useLanguage()
  const [activeLocation, setActiveLocation] = useState('loc-raw')
  const [movesLimit, setMovesLimit] = useState(10)

  const productLookup = useMemo(
    () => Object.fromEntries(db.products.map((p) => [p.id, p])),
    [db.products],
  )
  const locationLookup = useMemo(
    () => Object.fromEntries(db.stockLocations.map((l) => [l.id, l])),
    [db.stockLocations],
  )

  const internalLocations = useMemo(() => selectLocationsByType(db, 'internal'), [db.stockLocations])
  const summaries = useMemo(() => selectLocationSummaries(db), [db.stockQuants])
  const summaryByLoc = useMemo(
    () => Object.fromEntries(summaries.map((s) => [s.locationId, s])),
    [summaries],
  )

  const activeQuants = useMemo(() => {
    const quants = selectQuantsByLocation(db, activeLocation)
    if (!lowStockOnly) return quants
    return quants.filter((q) => q.qty > 0 && q.qty - q.reservedQty <= q.qty * 0.1)
  }, [db.stockQuants, activeLocation, lowStockOnly])

  const recentMoves = useMemo(
    () => selectStockMoves(db, { limit: movesLimit }),
    [db.stockMoves, movesLimit],
  )

  const [lowStockOnly, setLowStockOnly] = useState(false)

  const totalSkus = db.stockQuants.filter((q) => q.qty > 0).length
  const lowStockCount = db.stockQuants.filter((q) => q.qty > 0 && q.qty - q.reservedQty <= q.qty * 0.1).length

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: t('inventory.kpi.locations'),  value: internalLocations.length, icon: null },
          { label: t('inventory.kpi.totalSkus'),   value: totalSkus,               icon: null },
          { label: t('inventory.kpi.lowStock'), value: lowStockCount, warn: lowStockCount > 0, clickable: true },
          { label: t('inventory.kpi.pendingMoves'),
            value: db.stockMoves.filter((m) => m.state === 'confirmed').length,
            icon: null },
        ].map(({ label, value, warn, clickable }) => {
          const isActive = clickable && lowStockOnly
          const El = clickable ? 'button' : 'div'
          return (
            <El
              key={label}
              type={clickable ? 'button' : undefined}
              onClick={clickable ? () => setLowStockOnly((v) => !v) : undefined}
              className={`rounded-2xl border bg-white p-4 shadow-card text-left transition-colors ${
                isActive ? 'border-amber-400 ring-2 ring-amber-200' : warn ? 'border-amber-300 hover:border-amber-400' : 'border-slate-200'
              } ${clickable ? 'cursor-pointer' : ''}`}
              title={clickable ? (lowStockOnly ? 'Show all SKUs' : 'Filter to low-stock only') : undefined}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className={`mt-1 text-2xl font-bold ${warn ? 'text-amber-600' : 'text-slate-900'}`}>{value}</p>
              {clickable && warn ? (
                <p className="mt-0.5 text-[10px] font-medium text-amber-500">{isActive ? 'Filtering — click to reset' : 'Click to filter'}</p>
              ) : null}
            </El>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Location switcher + quant table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Location tabs */}
          <div className="flex flex-wrap gap-2">
            {internalLocations.map((loc) => {
              const s = summaryByLoc[loc.id]
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setActiveLocation(loc.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    activeLocation === loc.id
                      ? 'bg-slate-900 text-white shadow'
                      : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {loc.name}
                  <span className="ml-1.5 opacity-60">{s?.productCount ?? 0}</span>
                </button>
              )
            })}
          </div>

          {/* Stock quants table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t('inventory.col.product')}</th>
                  <th className="px-4 py-3">{t('inventory.col.type')}</th>
                  <th className="px-4 py-3 text-right">{t('inventory.col.onHand')}</th>
                  <th className="px-4 py-3 text-right">{t('inventory.col.reserved')}</th>
                  <th className="px-4 py-3 text-right">{t('inventory.col.available')}</th>
                  <th className="px-4 py-3">{t('inventory.col.uom')}</th>
                  <th className="px-4 py-3 text-xs">{t('inventory.col.updated')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeQuants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-xs text-slate-500">
                      {t('inventory.empty')}
                    </td>
                  </tr>
                ) : (
                  activeQuants.map((q) => {
                    const prod = productLookup[q.productId]
                    const available = q.qty - q.reservedQty
                    const isLow = available <= q.qty * 0.1
                    const typeColor =
                      prod?.type === 'raw_material'
                        ? 'bg-amber-100 text-amber-800'
                        : prod?.type === 'finished_good'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-violet-100 text-violet-800'
                    return (
                      <tr
                        key={q.id}
                        className={`hover:bg-slate-50/60 ${isLow ? 'bg-amber-100/60' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{prod?.name ?? q.productId}</p>
                          <p className="text-[11px] text-slate-400">{prod?.sku}</p>
                        </td>
                        <td className="px-4 py-3">
                          {prod ? (
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${typeColor}`}>
                              {t(`product.type.${prod.type}`)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">
                          {q.qty}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">
                          {q.reservedQty > 0 ? q.reservedQty : <Minus size={12} className="ml-auto text-slate-300" />}
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold ${isLow ? 'text-amber-600' : 'text-slate-800'}`}>
                          {available}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{q.uom}</td>
                        <td className="px-4 py-3 text-xs text-slate-400" title={q.lastUpdated}>
                          {q.lastUpdated ? q.lastUpdated.slice(0, 10) : '—'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Location summary cards */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">{t('inventory.locationSummary')}</h3>
          {internalLocations.map((loc) => {
            const s = summaryByLoc[loc.id] ?? { productCount: 0, totalQty: 0 }
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => setActiveLocation(loc.id)}
                className={`w-full rounded-2xl border border-l-4 bg-white p-4 text-left shadow-card transition hover:bg-slate-50/60 ${locationColor(loc.id)} ${activeLocation === loc.id ? 'ring-2 ring-blue-300' : 'border-slate-200'}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{loc.code}</p>
                <p className="mt-0.5 font-semibold text-slate-900">{loc.name}</p>
                <dl className="mt-2 grid grid-cols-2 gap-1 text-xs">
                  <div>
                    <dt className="text-slate-400">{t('inventory.skus')}</dt>
                    <dd className="font-semibold text-slate-800">{s.productCount}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">{t('inventory.totalQty')}</dt>
                    <dd className="font-semibold text-slate-800">{s.totalQty}</dd>
                  </div>
                </dl>
              </button>
            )
          })}
        </div>
      </div>

      {/* Stock moves log */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">{t('inventory.movesTitle')}</h3>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{t('inventory.col.date')}</th>
                <th className="px-4 py-3">{t('inventory.col.product')}</th>
                <th className="px-4 py-3">{t('inventory.col.from')}</th>
                <th className="px-4 py-3" />
                <th className="px-4 py-3">{t('inventory.col.to')}</th>
                <th className="px-4 py-3 text-right">{t('inventory.col.qty')}</th>
                <th className="px-4 py-3">{t('inventory.col.origin')}</th>
                <th className="px-4 py-3">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentMoves.map((m) => {
                const prod = productLookup[m.productId]
                const fromLoc = locationLookup[m.fromLocationId]
                const toLoc = locationLookup[m.toLocationId]
                return (
                  <tr key={m.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-xs text-slate-500">{m.date}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{prod?.name ?? m.productId}</p>
                      <p className="text-[11px] text-slate-400">{prod?.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{fromLoc?.name ?? m.fromLocationId}</td>
                    <td className="px-3 py-3 text-slate-400">
                      <ArrowRight size={13} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{toLoc?.name ?? m.toLocationId}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {m.qty} {m.uom}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{m.origin}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${moveStateStyle(m.state)}`}>
                        {t(`inventory.moveState.${m.state}`)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {db.stockMoves.length > movesLimit ? (
            <div className="border-t border-slate-100 p-3 text-center">
              <button
                type="button"
                onClick={() => setMovesLimit((n) => n + 10)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                {t('inventory.loadMore')} ({db.stockMoves.length - movesLimit} remaining)
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
