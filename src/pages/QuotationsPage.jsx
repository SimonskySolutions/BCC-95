import { useMemo, useState } from 'react'
import { TrendingUp, Clock, CheckCircle, AlertTriangle, BarChart2, ChevronRight } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage.js'
import { QUOTE_STATUSES } from '../domains/quotations/model.js'
import { selectQuoteVersionById } from '../domains/quotations/selectors.js'

const TODAY = new Date('2026-05-19')

/** @param {string} iso */
function daysUntil(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return Math.round((d - TODAY) / 86400000)
}

/** @param {string} iso */
function daysAgo(iso) {
  const d = new Date(iso)
  return Math.round((TODAY - d) / 86400000)
}

const STATUS_CONFIG = {
  draft:              { label: 'Draft',              color: 'bg-sky-100 text-sky-700',     border: 'border-sky-200',   header: 'bg-sky-50'  },
  pending_approval:   { label: 'Pending approval',   color: 'bg-amber-100 text-amber-700', border: 'border-amber-200', header: 'bg-amber-50' },
  approved:           { label: 'Approved',           color: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-200', header: 'bg-indigo-50' },
  sent:               { label: 'Sent',               color: 'bg-violet-100 text-violet-700', border: 'border-violet-200', header: 'bg-violet-50' },
  revision_requested: { label: 'Revision requested', color: 'bg-orange-100 text-orange-700', border: 'border-orange-200', header: 'bg-orange-50' },
  accepted:           { label: 'Accepted',           color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200', header: 'bg-emerald-50' },
  rejected:           { label: 'Rejected',           color: 'bg-slate-100 text-slate-500',   border: 'border-slate-200',   header: 'bg-slate-50' },
}

const PIPELINE_STATUSES = ['draft', 'pending_approval', 'approved', 'sent', 'revision_requested']
const DECIDED_STATUSES  = ['accepted', 'rejected']

/**
 * @param {{
 *   db: import('../data/mockDatabase.js').MockDatabase
 *   onOpenProduct: (id: string) => void
 * }} props
 */
export default function QuotationsPage({ db, onOpenProduct }) {
  const { t } = useLanguage()
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('all')
  const [clientFilter, setClient]   = useState('all')
  const [showAnalytics, setShowAnalytics] = useState(false)

  const clientsById = useMemo(
    () => Object.fromEntries(db.clients.map((c) => [c.id, c])),
    [db.clients],
  )
  const productsById = useMemo(
    () => Object.fromEntries(db.products.map((p) => [p.id, p])),
    [db.products],
  )

  const enriched = useMemo(() => {
    return db.quoteDrafts.map((q) => {
      const product = productsById[q.productId]
      const client  = clientsById[q.clientId]
      const version = q.currentVersionId ? selectQuoteVersionById(db, q.currentVersionId) : undefined
      const expiry  = version?.validUntil ?? q.validUntil
      const daysExp = expiry ? daysUntil(expiry) : null
      return { q, product, client, version, daysExp }
    })
  }, [db.quoteDrafts, db.quoteVersions, productsById, clientsById])

  const filtered = useMemo(() => {
    const sq = search.trim().toLowerCase()
    return enriched.filter(({ q, product, client }) => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false
      if (clientFilter !== 'all' && q.clientId !== clientFilter) return false
      if (!sq) return true
      return (
        product?.name.toLowerCase().includes(sq) ||
        client?.name.toLowerCase().includes(sq) ||
        q.id.toLowerCase().includes(sq)
      )
    })
  }, [enriched, search, statusFilter, clientFilter])

  // KPI metrics
  const metrics = useMemo(() => {
    const active    = enriched.filter(({ q }) => PIPELINE_STATUSES.includes(q.status))
    const decided   = enriched.filter(({ q }) => DECIDED_STATUSES.includes(q.status))
    const accepted  = decided.filter(({ q }) => q.status === 'accepted')
    const winRate   = decided.length ? Math.round((accepted.length / decided.length) * 100) : 0
    const pipeline  = active.reduce((s, { q }) => s + (q.subtotal || 0), 0)
    const avgDays   = active.length
      ? Math.round(active.reduce((s, { q }) => s + daysAgo(q.updatedAt), 0) / active.length)
      : 0
    return { active: active.length, pipeline, winRate, avgDays, decided: decided.length, accepted: accepted.length, rejected: decided.length - accepted.length }
  }, [enriched])

  // Group filtered by status for kanban
  const columns = useMemo(() => {
    return PIPELINE_STATUSES.map((status) => ({
      status,
      items: filtered.filter(({ q }) => q.status === status),
    }))
  }, [filtered])

  const decidedItems = useMemo(
    () => filtered.filter(({ q }) => DECIDED_STATUSES.includes(q.status)),
    [filtered],
  )

  const uniqueClients = useMemo(
    () => [...new Map(db.quoteDrafts.map((q) => [q.clientId, clientsById[q.clientId]])).values()].filter(Boolean),
    [db.quoteDrafts, clientsById],
  )

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={<Clock size={16} />} label={t('quotations.totalActive')} value={metrics.active} color="text-sky-600" />
        <KpiCard icon={<TrendingUp size={16} />} label={t('quotations.pipelineValue')} value={`€${metrics.pipeline.toLocaleString()}`} color="text-violet-600" />
        <KpiCard icon={<CheckCircle size={16} />} label={t('quotations.winRate')} value={`${metrics.winRate}%`} color="text-emerald-600" />
        <KpiCard icon={<BarChart2 size={16} />} label={t('quotations.avgDaysOpen')} value={`${metrics.avgDays}d`} color="text-amber-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('quotations.search')}
          className="h-9 w-56 rounded-lg border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="all">{t('quotations.allStatuses')}</option>
          {QUOTE_STATUSES.map((s) => (
            <option key={s} value={s}>{t(`offer.status.${s}`)}</option>
          ))}
        </select>
        <select
          value={clientFilter}
          onChange={(e) => setClient(e.target.value)}
          className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="all">{t('quotations.allClients')}</option>
          {uniqueClients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowAnalytics((v) => !v)}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <BarChart2 size={13} />
          {t('quotations.analytics.title')}
        </button>
      </div>

      {/* Analytics panel */}
      {showAnalytics ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">{t('quotations.analytics.title')}</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <AnalyticsTile label={t('quotations.analytics.decided')} value={metrics.decided} />
            <AnalyticsTile label={t('quotations.analytics.won')} value={metrics.accepted} valueClass="text-emerald-700" />
            <AnalyticsTile label={t('quotations.analytics.lost')} value={metrics.rejected} valueClass="text-rose-600" />
            <AnalyticsTile label={t('quotations.winRate')} value={`${metrics.winRate}%`} valueClass="text-indigo-700" />
          </div>
          {/* Mini bar chart: pipeline by status */}
          <div className="mt-5">
            <p className="mb-2 text-xs font-medium text-slate-500">Pipeline by status</p>
            <div className="space-y-1.5">
              {PIPELINE_STATUSES.map((status) => {
                const count = enriched.filter(({ q }) => q.status === status).length
                const cfg = STATUS_CONFIG[status]
                const pct = metrics.active ? Math.round((count / metrics.active) * 100) : 0
                return (
                  <div key={status} className="flex items-center gap-2 text-xs">
                    <span className="w-36 truncate text-slate-600">{t(`offer.status.${status}`)}</span>
                    <div className="flex-1 rounded-full bg-slate-100 h-2">
                      <div className={`h-2 rounded-full ${cfg.color.split(' ')[0].replace('text', 'bg').replace('-700', '-400').replace('-600', '-400').replace('-500', '-400')}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 text-right font-medium text-slate-700">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* Kanban pipeline */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Active pipeline</p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {columns.map(({ status, items }) => {
            const cfg = STATUS_CONFIG[status]
            return (
              <div key={status} className={`min-w-[220px] max-w-[260px] shrink-0 rounded-xl border ${cfg.border} bg-white shadow-sm`}>
                <div className={`flex items-center justify-between rounded-t-xl px-3 py-2 ${cfg.header}`}>
                  <span className="text-xs font-semibold text-slate-700">{t(`offer.status.${status}`)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${cfg.color}`}>{items.length}</span>
                </div>
                <div className="space-y-2 p-2">
                  {items.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-400">—</p>
                  ) : (
                    items.map(({ q, product, client, daysExp }) => (
                      <QuoteCard
                        key={q.id}
                        quote={q}
                        product={product}
                        client={client}
                        daysExp={daysExp}
                        t={t}
                        onOpen={() => onOpenProduct(q.productId)}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Decided (accepted / rejected) */}
      {(statusFilter === 'all' || DECIDED_STATUSES.includes(statusFilter)) && decidedItems.length > 0 ? (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Decided</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {decidedItems.map(({ q, product, client, daysExp }) => (
              <QuoteCard
                key={q.id}
                quote={q}
                product={product}
                client={client}
                daysExp={daysExp}
                t={t}
                onOpen={() => onOpenProduct(q.productId)}
                flat
              />
            ))}
          </div>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">{t('quotations.empty')}</p>
      ) : null}
    </div>
  )
}

function KpiCard({ icon, label, value, color }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className={`mb-1 flex items-center gap-1.5 text-xs font-medium ${color}`}>
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function AnalyticsTile({ label, value, valueClass = 'text-slate-900' }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-center">
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  )
}

function QuoteCard({ quote, product, client, daysExp, t, onOpen, flat = false }) {
  const cfg = STATUS_CONFIG[quote.status] ?? STATUS_CONFIG.draft
  const isExpired     = daysExp !== null && daysExp < 0
  const expiresSoon   = daysExp !== null && daysExp >= 0 && daysExp <= 7

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group w-full rounded-lg border text-left transition hover:shadow-md ${flat ? 'border-slate-200 bg-white p-3' : 'border-slate-100 bg-slate-50/60 p-2.5 hover:bg-white'}`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2">
          {product?.name ?? quote.productId}
        </p>
        {flat ? (
          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
            {t(`offer.status.${quote.status}`)}
          </span>
        ) : null}
      </div>
      {client ? (
        <p className="mt-0.5 text-[11px] text-slate-500 truncate">{client.name}</p>
      ) : null}
      <div className="mt-2 flex items-center justify-between gap-1">
        <span className="text-sm font-bold text-slate-900">
          {quote.currency ?? 'EUR'} {(quote.subtotal || 0).toLocaleString()}
        </span>
        <ChevronRight size={13} className="text-slate-300 group-hover:text-blue-400 transition" />
      </div>
      {isExpired ? (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-red-600">
          <AlertTriangle size={10} />
          {t('quotations.expired')}
        </div>
      ) : expiresSoon ? (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-amber-600">
          <AlertTriangle size={10} />
          {t('quotations.expiresSoon').replace('{n}', String(daysExp))}
        </div>
      ) : null}
    </button>
  )
}
