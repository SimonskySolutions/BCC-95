import { useMemo } from 'react'
import { AlertTriangle, Clock, FileText, TimerReset } from 'lucide-react'
import StatCard from '../../StatCard.jsx'
import ActionCenter from './ActionCenter.jsx'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { useFactoryConfig } from '../../../config/useFactoryConfig.js'
import { selectAllOffers } from '../../../domains/quotations/selectors.js'
import { groupAmount } from '../../../lib/money.js'
import {
  computeDeliveryMetrics,
  computeProcessHealthMetrics,
  computeProductivityMetrics,
  computeQualityMetrics,
} from '../../../services/kpis/kpiCalculator.js'

const PIPELINE_STAGES = ['received', 'intake_pending', 'intake_complete', 'feasibility_done']
const STAGE_COLORS = {
  received: 'bg-slate-100 text-slate-700',
  intake_pending: 'bg-amber-100 text-amber-800',
  intake_complete: 'bg-blue-100 text-blue-800',
  feasibility_done: 'bg-emerald-100 text-emerald-800',
}
const STAGE_DOT = {
  received: 'bg-slate-400',
  intake_pending: 'bg-amber-400',
  intake_complete: 'bg-blue-500',
  feasibility_done: 'bg-emerald-500',
}

function daysUntil(iso) {
  if (!iso) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return Math.round((d - today) / 86400000)
}

/* ── KPI cards ─────────────────────────────────────────────────────────────── */
export function KpisWidget({ db }) {
  const { t } = useLanguage()
  const { config } = useFactoryConfig()
  const { kpiTargets } = config
  const ref = new Date('2026-04-10')
  const delivery = computeDeliveryMetrics(db, ref)
  const productivity = computeProductivityMetrics(db)
  const quality = computeQualityMetrics(db)
  const process = computeProcessHealthMetrics(db)
  const cards = [
    { id: 'delivery', label: t('dashboard.card.delivery.label'), value: `${delivery.onTimeDoneRatioPercent}%`,
      trend: t('dashboard.card.delivery.trend').replace('{overdue}', String(delivery.overdueOpenCount)),
      positive: delivery.overdueOpenCount === 0 || delivery.onTimeDoneRatioPercent >= kpiTargets.deliveryPercent, icon: 'ClipboardList', color: 'blue' },
    { id: 'productivity', label: t('dashboard.card.productivity.label'), value: `${productivity.operationThroughputPercent}%`,
      trend: t('dashboard.card.productivity.trend').replace('{done}', String(productivity.operationDoneCount)).replace('{total}', String(productivity.operationTotal)),
      positive: productivity.operationThroughputPercent >= kpiTargets.productivityPercent, icon: 'FolderKanban', color: 'violet' },
    { id: 'quality', label: t('dashboard.card.quality.label'), value: `${quality.firstPassYieldPercent}%`,
      trend: t('dashboard.card.quality.trend').replace('{fails}', String(quality.failCount)).replace('{samples}', String(quality.sampleCount)),
      positive: quality.firstPassYieldPercent >= kpiTargets.qualityPercent, icon: 'Building2', color: 'emerald' },
    { id: 'process', label: t('dashboard.card.process.label'), value: `${process.avgCompletionPercent}%`,
      trend: t('dashboard.card.process.trend').replace('{count}', String(process.productCount)),
      positive: process.avgCompletionPercent >= kpiTargets.processPercent, icon: 'Users', color: 'amber' },
  ]
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((item) => <StatCard key={item.id} item={item} />)}
    </section>
  )
}

/* ── Action center ─────────────────────────────────────────────────────────── */
export function ActionCenterWidget({ db, onOpenOffer, onOpenClient }) {
  return <ActionCenter db={db} onOpenOffer={onOpenOffer} onOpenClient={onOpenClient} />
}

/* ── Inquiries pipeline ────────────────────────────────────────────────────── */
export function PipelineWidget({ db }) {
  const { t } = useLanguage()
  const clientsById = useMemo(() => Object.fromEntries((db.clients ?? []).map((c) => [c.id, c])), [db.clients])
  const pipeline = useMemo(() => {
    const buckets = { received: [], intake_pending: [], intake_complete: [], feasibility_done: [] }
    for (const inq of db.inquiries ?? []) if (buckets[inq.status]) buckets[inq.status].push(inq)
    return buckets
  }, [db.inquiries])
  const totalActive = PIPELINE_STAGES.reduce((sum, s) => sum + pipeline[s].length, 0)
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{t('dashboard.pipeline.title')}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{totalActive}</span>
      </div>
      {totalActive === 0 ? (
        <p className="text-sm text-slate-400">{t('dashboard.pipeline.empty')}</p>
      ) : (
        <div className="space-y-4">
          {PIPELINE_STAGES.map((stage) => {
            const items = pipeline[stage]
            if (!items.length) return null
            return (
              <div key={stage}>
                <div className="mb-2 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STAGE_COLORS[stage]}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${STAGE_DOT[stage]}`} />
                    {t(`dashboard.pipeline.${stage}`)}
                  </span>
                  <span className="text-xs text-slate-400">{items.length}</span>
                </div>
                <ul className="space-y-1.5">
                  {items.map((inq) => {
                    const client = inq.customerId ? clientsById[inq.customerId] : undefined
                    return (
                      <li key={inq.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-slate-800">{inq.summary ?? inq.id}</p>
                          {client ? <p className="mt-0.5 truncate text-xs text-slate-500">{client.name}</p> : null}
                        </div>
                        {inq.requestedQuantity ? (
                          <span className="shrink-0 text-xs text-slate-400">{inq.requestedQuantity} {t('dashboard.pipeline.qty')}</span>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

/* ── Due soon / overdue / blocked ──────────────────────────────────────────── */
export function DueSoonWidget({ db }) {
  const { t } = useLanguage()
  const clientsById = useMemo(() => Object.fromEntries((db.clients ?? []).map((c) => [c.id, c])), [db.clients])
  const items = useMemo(() => {
    const today = new Date()
    const windowEnd = new Date(today.getTime() + 90 * 86400000)
    const latest = {}
    for (const inq of db.inquiries ?? []) {
      if (inq.status === 'closed_rejected' || !inq.requestedDeadline) continue
      const prev = latest[inq.productId]
      if (!prev || inq.receivedAt > prev.receivedAt) latest[inq.productId] = inq
    }
    const lcMap = Object.fromEntries((db.productLifecycleStates ?? []).map((lc) => [lc.productId, lc]))
    const prodMap = Object.fromEntries((db.products ?? []).map((p) => [p.id, p]))
    const out = []
    for (const [productId, inq] of Object.entries(latest)) {
      const deadline = new Date(inq.requestedDeadline)
      if (deadline > windowEnd) continue
      const product = prodMap[productId]
      if (!product) continue
      out.push({ product, deadline, blocked: lcMap[productId]?.blocked ?? false, client: inq.customerId ? clientsById[inq.customerId] : undefined })
    }
    return out.sort((a, b) => a.deadline - b.deadline)
  }, [db, clientsById])

  function badge(deadline) {
    const diff = daysUntil(deadline.toISOString().slice(0, 10))
    if (diff < 0) return { label: t('dashboard.dueSoon.overdue'), cls: 'bg-rose-100 text-rose-700' }
    if (diff === 0) return { label: t('dashboard.dueSoon.today'), cls: 'bg-orange-100 text-orange-700' }
    return { label: t('dashboard.dueSoon.daysLeft').replace('{n}', String(diff)), cls: diff <= 14 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600' }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{t('dashboard.dueSoon.title')}</h2>
        <Clock size={15} className="text-slate-400" />
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">{t('dashboard.dueSoon.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {items.map(({ product, deadline, blocked, client }) => {
            const b = badge(deadline)
            return (
              <li key={product.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800">{product.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{client?.name ?? '—'} · {product.lifecyclePhaseId}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${b.cls}`}>{b.label}</span>
                  {blocked ? <span className="flex items-center gap-1 text-xs font-medium text-rose-600"><AlertTriangle size={11} />{t('dashboard.dueSoon.blocked')}</span> : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/* ── Recent offers ─────────────────────────────────────────────────────────── */
export function RecentOffersWidget({ db, onOpenOffer }) {
  const { t } = useLanguage()
  const offers = useMemo(() => selectAllOffers(db).slice(0, 6), [db])
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{t('dash.widget.recentOffers', 'Recent offers')}</h2>
        <FileText size={15} className="text-slate-400" />
      </div>
      {offers.length === 0 ? (
        <p className="text-sm text-slate-400">{t('dash.widget.noOffers', 'No offers yet.')}</p>
      ) : (
        <ul className="space-y-1.5">
          {offers.map((o) => (
            <li key={o.versionId}>
              <button type="button" onClick={() => onOpenOffer?.(o.quoteId)}
                className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-left hover:bg-slate-100">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800">{o.offerNo} · v{o.versionNo}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{o.clientName} · {o.productName}</p>
                </div>
                <span className="shrink-0 text-xs font-medium tabular-nums text-slate-700">{groupAmount(o.total)} {o.currency}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/* ── Expiring offers ───────────────────────────────────────────────────────── */
export function ExpiringOffersWidget({ db, onOpenOffer }) {
  const { t } = useLanguage()
  const rows = useMemo(() => {
    const versions = new Map((db.quoteVersions ?? []).map((v) => [v.id, v]))
    return selectAllOffers(db)
      .map((o) => ({ ...o, validUntil: versions.get(o.versionId)?.validUntil, days: daysUntil(versions.get(o.versionId)?.validUntil) }))
      .filter((o) => ['sent', 'approved'].includes(o.status) && o.days != null && o.days >= 0 && o.days <= 60)
      .sort((a, b) => a.days - b.days)
      .slice(0, 6)
  }, [db])
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{t('dash.widget.expiringOffers', 'Expiring offers')}</h2>
        <TimerReset size={15} className="text-slate-400" />
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">{t('dash.widget.noExpiring', 'No offers expiring soon.')}</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((o) => (
            <li key={o.versionId}>
              <button type="button" onClick={() => onOpenOffer?.(o.quoteId)}
                className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-left hover:bg-slate-100">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800">{o.offerNo} · {o.clientName}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{o.validUntil}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${o.days <= 7 ? 'bg-rose-100 text-rose-700' : o.days <= 21 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                  {t('dashboard.dueSoon.daysLeft').replace('{n}', String(o.days))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
