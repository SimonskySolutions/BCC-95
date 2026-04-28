import { useMemo } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  Clock,
  Package,
  Plus,
} from 'lucide-react'
import StatCard from '../components/StatCard.jsx'
import {
  computeDeliveryMetrics,
  computeProcessHealthMetrics,
  computeProductivityMetrics,
  computeQualityMetrics,
} from '../services/kpis/kpiCalculator.js'
import { useLanguage } from '../i18n/useLanguage.js'

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

/**
 * @param {{
 *   db: import('../data/mockDatabase.js').MockDatabase
 *   onNewInquiry: () => void
 *   onNavigate: (page: string) => void
 * }} props
 */
export default function DashboardPage({ db, onNewInquiry, onNavigate }) {
  const { t } = useLanguage()
  const ref = new Date('2026-04-10')
  const delivery = computeDeliveryMetrics(db, ref)
  const productivity = computeProductivityMetrics(db)
  const quality = computeQualityMetrics(db)
  const process = computeProcessHealthMetrics(db)

  const cards = useMemo(
    () => [
      {
        id: 'delivery',
        label: t('dashboard.card.delivery.label'),
        value: `${delivery.onTimeDoneRatioPercent}%`,
        trend: t('dashboard.card.delivery.trend').replace('{overdue}', String(delivery.overdueOpenCount)),
        positive: delivery.overdueOpenCount === 0,
        icon: 'ClipboardList',
      },
      {
        id: 'productivity',
        label: t('dashboard.card.productivity.label'),
        value: `${productivity.operationThroughputPercent}%`,
        trend: t('dashboard.card.productivity.trend')
          .replace('{done}', String(productivity.operationDoneCount))
          .replace('{total}', String(productivity.operationTotal)),
        positive: productivity.operationThroughputPercent >= 50,
        icon: 'FolderKanban',
      },
      {
        id: 'quality',
        label: t('dashboard.card.quality.label'),
        value: `${quality.firstPassYieldPercent}%`,
        trend: t('dashboard.card.quality.trend')
          .replace('{fails}', String(quality.failCount))
          .replace('{samples}', String(quality.sampleCount)),
        positive: quality.firstPassYieldPercent >= 90,
        icon: 'Building2',
      },
      {
        id: 'process',
        label: t('dashboard.card.process.label'),
        value: `${process.avgCompletionPercent}%`,
        trend: t('dashboard.card.process.trend').replace('{count}', String(process.productCount)),
        positive: process.avgCompletionPercent >= 70,
        icon: 'Users',
      },
    ],
    [delivery, productivity, quality, process, t],
  )

  // Inquiries pipeline grouped by stage
  const pipeline = useMemo(() => {
    /** @type {Record<string, import('../domains/inquiries/model.js').Inquiry[]>} */
    const buckets = { received: [], intake_pending: [], intake_complete: [], feasibility_done: [] }
    for (const inq of db.inquiries) {
      if (buckets[inq.status]) buckets[inq.status].push(inq)
    }
    return buckets
  }, [db.inquiries])

  const totalActive = useMemo(
    () => PIPELINE_STAGES.reduce((sum, s) => sum + pipeline[s].length, 0),
    [pipeline],
  )

  // Client lookup map
  const clientsById = useMemo(() => {
    /** @type {Record<string, import('../domains/crm/model.js').Client>} */
    const map = {}
    for (const c of db.clients) map[c.id] = c
    return map
  }, [db.clients])

  // Due soon / overdue / blocked
  const dueSoonItems = useMemo(() => {
    const today = new Date()
    const windowEnd = new Date(today.getTime() + 90 * 86400000)

    const latestInquiry = /** @type {Record<string, import('../domains/inquiries/model.js').Inquiry>} */ ({})
    for (const inq of db.inquiries) {
      if (inq.status === 'closed_rejected' || !inq.requestedDeadline) continue
      const prev = latestInquiry[inq.productId]
      if (!prev || inq.receivedAt > prev.receivedAt) latestInquiry[inq.productId] = inq
    }

    const lcMap = /** @type {Record<string, import('../domains/lifecycle/model.js').ProductLifecycleState>} */ ({})
    for (const lc of db.productLifecycleStates) lcMap[lc.productId] = lc

    const prodMap = /** @type {Record<string, import('../domains/products/model.js').Product>} */ ({})
    for (const p of db.products) prodMap[p.id] = p

    const results = []
    for (const [productId, inq] of Object.entries(latestInquiry)) {
      const deadline = new Date(inq.requestedDeadline)
      if (deadline > windowEnd) continue
      const product = prodMap[productId]
      if (!product) continue
      const lc = lcMap[productId]
      results.push({
        product,
        inquiry: inq,
        deadline,
        blocked: lc?.blocked ?? false,
        client: inq.customerId ? clientsById[inq.customerId] : undefined,
      })
    }
    results.sort((a, b) => a.deadline - b.deadline)
    return results
  }, [db, clientsById])

  function deadlineBadge(deadline) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const d = new Date(deadline)
    d.setHours(0, 0, 0, 0)
    const diffDays = Math.round((d - today) / 86400000)
    if (diffDays < 0) return { label: t('dashboard.dueSoon.overdue'), cls: 'bg-rose-100 text-rose-700' }
    if (diffDays === 0) return { label: t('dashboard.dueSoon.today'), cls: 'bg-orange-100 text-orange-700' }
    return {
      label: t('dashboard.dueSoon.daysLeft').replace('{n}', String(diffDays)),
      cls: diffDays <= 14 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600',
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <section className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t('dashboard.quickActions.title')}
        </span>
        <button
          type="button"
          onClick={onNewInquiry}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
        >
          <Plus size={14} />
          {t('dashboard.quickActions.newInquiry')}
        </button>
        <button
          type="button"
          onClick={() => onNavigate('products')}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          <Package size={14} />
          {t('dashboard.quickActions.products')}
        </button>
        <button
          type="button"
          onClick={() => onNavigate('planning')}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          <CalendarDays size={14} />
          {t('dashboard.quickActions.planning')}
        </button>
        <button
          type="button"
          onClick={() => onNavigate('quality')}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          <BadgeCheck size={14} />
          {t('dashboard.quickActions.quality')}
        </button>
      </section>

      {/* KPI Stat Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
          <StatCard key={item.id} item={item} />
        ))}
      </section>

      {/* Pipeline + Due Soon */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Inquiries Pipeline */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">{t('dashboard.pipeline.title')}</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {totalActive}
            </span>
          </div>

          {totalActive === 0 ? (
            <p className="text-sm text-slate-400">{t('dashboard.pipeline.empty')}</p>
          ) : (
            <div className="space-y-4">
              {PIPELINE_STAGES.map((stage) => {
                const items = pipeline[stage]
                if (items.length === 0) return null
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
                          <li
                            key={inq.id}
                            className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-slate-800">
                                {inq.summary ?? inq.id}
                              </p>
                              {client ? (
                                <p className="mt-0.5 truncate text-xs text-slate-500">{client.name}</p>
                              ) : null}
                            </div>
                            {inq.requestedQuantity ? (
                              <span className="shrink-0 text-xs text-slate-400">
                                {inq.requestedQuantity} {t('dashboard.pipeline.qty')}
                              </span>
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

        {/* Due Soon / Overdue / Blocked */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">{t('dashboard.dueSoon.title')}</h2>
            <Clock size={15} className="text-slate-400" />
          </div>

          {dueSoonItems.length === 0 ? (
            <p className="text-sm text-slate-400">{t('dashboard.dueSoon.empty')}</p>
          ) : (
            <ul className="space-y-2">
              {dueSoonItems.map(({ product, inquiry, deadline, blocked, client }) => {
                const badge = deadlineBadge(deadline)
                return (
                  <li
                    key={product.id}
                    className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800">{product.name}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {client?.name ?? '—'} · {product.lifecyclePhaseId}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                      {blocked ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-rose-600">
                          <AlertTriangle size={11} />
                          {t('dashboard.dueSoon.blocked')}
                        </span>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <p className="text-sm text-slate-500">{t('dashboard.footerNote')}</p>
    </div>
  )
}
