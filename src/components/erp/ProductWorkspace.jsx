import { useMemo, useReducer, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import TaskTable from './TaskTable.jsx'
import OperationList from './OperationList.jsx'
import BomEditor from './BomEditor.jsx'
import InquiryIntakeForm from './offers/InquiryIntakeForm.jsx'
import OfferWizard from './offers/OfferWizard.jsx'
import AuditTimeline from './AuditTimeline.jsx'
import { useLanguage } from '../../i18n/useLanguage.js'
import { selectInquiriesByProduct } from '../../domains/inquiries/selectors.js'
import { selectAuditByProduct } from '../../domains/audit/selectors.js'
import { LIFECYCLE_PHASE_DEFINITIONS, LIFECYCLE_PHASE_ORDER, ALLOWED_PHASE_TRANSITIONS } from '../../domains/lifecycle/model.js'
import { attemptPhaseTransition } from '../../services/lifecycle/phaseTransitionService.js'
import { computeOfferProgress } from '../../services/offers/offerSubStateMachine.js'

const TAB_IDS = /** @type {const} */ (['overview', 'inquiry', 'offer', 'bom', 'operations', 'tasks', 'timeline'])

const TAB_LABELS = {
  overview:   'Overview',
  inquiry:    'Inquiry',
  offer:      'Offer',
  bom:        'BOM',
  operations: 'Operations',
  tasks:      'Tasks',
  timeline:   'Timeline',
}

const PRODUCT_TYPE_STYLES = {
  raw_material:  'bg-amber-100 text-amber-800',
  semi_finished: 'bg-violet-100 text-violet-800',
  finished_good: 'bg-emerald-100 text-emerald-800',
}

/** Maps offer step → tab to navigate to */
function stepToTab(step) {
  if (!step) return 'overview'
  if (step === 'inquiry_received' || step === 'intake_complete') return 'inquiry'
  return 'offer'
}

/** Human-readable blocker hints */
function blockerHint(blocker = '') {
  if (blocker.startsWith('task:quote-tech-review')) return 'Complete the Technical Review task'
  if (blocker.startsWith('task:quote-costing'))     return 'Complete the Costing task'
  if (blocker.startsWith('task:'))                  return `Complete task: ${blocker.replace('task:', '')}`
  if (blocker === 'feasibility:not_recorded')        return 'Record feasibility result in Inquiry tab'
  if (blocker === 'quote:no_version')                return 'Create a quote version'
  if (blocker === 'quote:not_approved')              return 'Get the quote internally approved'
  if (blocker === 'quote:not_sent')                  return 'Send the quote to the client'
  if (blocker === 'customer:pending')                return 'Waiting for client decision'
  if (blocker.startsWith('intake:'))                 return `Fill in missing fields: ${blocker.replace('intake:', '')}`
  return blocker
}

/**
 * @param {{
 *   db: import('../../data/mockDatabase.js').MockDatabase
 *   bundle: object | null
 *   onOpenReports?: () => void
 * }} props
 */
export default function ProductWorkspace({ db, bundle, onOpenReports }) {
  const { t } = useLanguage()
  const [, forceRefresh] = useReducer((x) => x + 1, 0)
  const [transitionMsg, setTransitionMsg] = useState(/** @type {string | null} */ (null))

  const productId = bundle?.product?.id ?? null

  // Compute default tab before useState — valid since these are plain expressions, not hooks
  const _inquiries = productId ? selectInquiriesByProduct(db, productId) : []
  const _hasActiveQuote = (db.quoteDrafts ?? []).some(
    (q) => q.productId === productId && !['accepted', 'rejected'].includes(q.status),
  )
  const _defaultTab = _inquiries.length === 0 ? 'overview' : _hasActiveQuote ? 'offer' : 'inquiry'

  const [tab, setTab] = useState(/** @type {typeof TAB_IDS[number]} */ (_defaultTab))

  const inquiries = useMemo(
    () => (productId ? selectInquiriesByProduct(db, productId) : []),
    [db, productId],
  )
  const auditEntries = useMemo(
    () => (productId ? selectAuditByProduct(db, productId) : []),
    [db, productId],
  )
  const employeeLookup = useMemo(
    () => Object.fromEntries(db.employees.map((e) => [e.id, e.name])),
    [db],
  )

  if (!bundle) {
    return <p className="text-sm text-slate-500">{t('pws.notFound')}</p>
  }

  const { product, lifecycle, tasks, operations } = bundle
  const latestInquiry = inquiries[inquiries.length - 1]

  const phaseIdx = lifecycle?.phaseId ? LIFECYCLE_PHASE_ORDER.indexOf(lifecycle.phaseId) : -1
  const allowedTargets = lifecycle?.phaseId ? (ALLOWED_PHASE_TRANSITIONS[lifecycle.phaseId] ?? []) : []

  const openTaskCount = tasks?.filter((x) => x.status !== 'resolved').length ?? 0
  const pendingInquiryCount = inquiries.filter((i) => i.status === 'received' || i.status === 'intake_pending').length

  const progress = productId ? computeOfferProgress(db, productId) : null

  function handleMoveToPhase(targetPhaseId) {
    const result = attemptPhaseTransition(db, productId, targetPhaseId)
    setTransitionMsg(result.ok ? `Phase advanced to ${targetPhaseId}.` : (result.message ?? 'Unable to change phase.'))
  }

  return (
    <div className="space-y-4">
      {/* ── Compact unified header card ─────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* Top row: meta + type badge + phase advance */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500 tracking-wide">
              {product.sku}
            </span>
            {product.type ? (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PRODUCT_TYPE_STYLES[product.type] ?? 'bg-slate-100 text-slate-600'}`}>
                {t(`product.type.${product.type}`)}
              </span>
            ) : null}
          </div>
          {/* Phase advance button */}
          {allowedTargets.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {allowedTargets.map((target) => {
                const def = LIFECYCLE_PHASE_DEFINITIONS.find((d) => d.id === target)
                return (
                  <button
                    key={target}
                    type="button"
                    onClick={() => handleMoveToPhase(target)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition"
                  >
                    Advance to {def?.label ?? target}
                    <ChevronRight size={12} />
                  </button>
                )
              })}
            </div>
          )}
          {allowedTargets.length === 0 && lifecycle?.phaseId === 'released' && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Released</span>
          )}
        </div>

        {/* Product name */}
        <h2 className="mt-2 text-xl font-bold text-slate-900">{product.name}</h2>

        {/* Description */}
        {product.description && (
          <p className="mt-0.5 text-sm text-slate-500 line-clamp-2">{product.description}</p>
        )}

        {/* Metadata chips */}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          {product.uom && <span>UoM: <span className="font-medium text-slate-600">{product.uom}</span></span>}
          {product.priceAverage != null && <span>Avg price: <span className="font-medium text-slate-600">€{product.priceAverage.toFixed(2)}</span></span>}
          {bundle.pathTemplate && <span>Path: <span className="font-medium text-slate-600">{bundle.pathTemplate.name}</span></span>}
        </div>

        {/* Inline phase strip */}
        <div className="mt-3 flex flex-wrap items-center gap-1">
          {LIFECYCLE_PHASE_DEFINITIONS.map((phase, i) => {
            const done = phaseIdx >= 0 && i < phaseIdx
            const active = phase.id === lifecycle?.phaseId
            return (
              <span key={phase.id} className="flex items-center gap-1">
                {i > 0 && <span className={`inline-block h-px w-3 ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  active  ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300'
                  : done  ? 'bg-emerald-100 text-emerald-700'
                  :          'bg-slate-100 text-slate-400'
                }`}>
                  {done ? '✓ ' : ''}{phase.label}
                </span>
              </span>
            )
          })}
          {lifecycle?.blocked && (
            <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">
              ⚠ Blocked
            </span>
          )}
        </div>

        {transitionMsg && (
          <p className="mt-2 text-xs text-slate-500">{transitionMsg}</p>
        )}
      </div>

      {/* ── Sticky tab bar ──────────────────────────────────────── */}
      <div className="sticky top-0 z-10 -mx-4 bg-slate-100/95 px-4 pb-1 pt-1.5 backdrop-blur md:-mx-0 md:px-0">
        <nav className="flex flex-wrap gap-1.5" role="tablist">
          {TAB_IDS.map((id) => {
            const badge = id === 'tasks' && openTaskCount > 0
              ? openTaskCount
              : id === 'inquiry' && pendingInquiryCount > 0
                ? pendingInquiryCount
                : null
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`relative rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  tab === id
                    ? 'bg-slate-900 text-white shadow'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {TAB_LABELS[id]}
                {badge ? (
                  <span className={`ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                    tab === id ? 'bg-white/20 text-white' : 'bg-rose-500 text-white'
                  }`}>
                    {badge}
                  </span>
                ) : null}
              </button>
            )
          })}
        </nav>
      </div>

      {/* ── Tab content ─────────────────────────────────────────── */}

      {tab === 'overview' && (
        <div className="space-y-3">
          {/* Next action card */}
          {progress?.nextStep && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Next step</p>
              <p className="mt-0.5 text-sm font-semibold text-blue-900">
                {t(`offer.step.${progress.nextStep}`, progress.nextStep.replace(/_/g, ' '))}
              </p>
              {progress.blockers[0] && (
                <p className="mt-0.5 text-xs text-blue-700">{blockerHint(progress.blockers[0])}</p>
              )}
              <button
                type="button"
                onClick={() => setTab(stepToTab(progress.nextStep))}
                className="mt-2.5 flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Go to {TAB_LABELS[stepToTab(progress.nextStep)]}
                <ChevronRight size={12} />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {/* Quick stats */}
            <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('pws.quickStats')}</h3>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setTab('tasks')}
                  className="rounded-lg border border-slate-100 p-2.5 text-left hover:border-slate-200 hover:bg-slate-50 transition"
                >
                  <dt className="text-slate-500">{t('pws.openTasks')}</dt>
                  <dd className={`mt-0.5 text-2xl font-bold ${openTaskCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {openTaskCount}
                  </dd>
                </button>
                <button
                  type="button"
                  onClick={() => setTab('inquiry')}
                  className="rounded-lg border border-slate-100 p-2.5 text-left hover:border-slate-200 hover:bg-slate-50 transition"
                >
                  <dt className="text-slate-500">{t('pws.inquiries')}</dt>
                  <dd className="mt-0.5 text-2xl font-bold text-slate-800">{inquiries.length}</dd>
                </button>
                <div className="rounded-lg border border-slate-100 p-2.5">
                  <dt className="text-slate-500">{t('pws.phase')}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-800">
                    {t(`lifecycle.phase.${lifecycle?.phaseId}`, lifecycle?.phaseId ?? '—')}
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-100 p-2.5">
                  <dt className="text-slate-500">{t('pws.completion')}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-800">
                    {lifecycle?.completionPercent ?? 0}%
                  </dd>
                </div>
              </dl>
            </section>

            {/* Recent activity */}
            <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('pws.recentActivity')}</h3>
              <div className="mt-2">
                <AuditTimeline entries={auditEntries.slice(-5)} employeeLookup={employeeLookup} />
              </div>
            </section>
          </div>
        </div>
      )}

      {tab === 'inquiry' && (
        <div className="space-y-3">
          <InquiryIntakeForm
            db={db}
            productId={product.id}
            defaultClientId={latestInquiry?.customerId}
            inquiry={latestInquiry}
            onChange={forceRefresh}
          />
          {inquiries.length > 1 && (
            <details className="rounded-xl border border-slate-200 bg-white p-3">
              <summary className="cursor-pointer text-xs font-semibold text-slate-600">
                Previous inquiries ({inquiries.length - 1})
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-slate-500">
                {inquiries.slice(0, -1).map((i) => (
                  <li key={i.id} className="flex items-center gap-2">
                    <span className="font-mono text-slate-400">#{i.id}</span>
                    <span>{i.receivedAt.slice(0, 10)}</span>
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-slate-600">{i.status}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {tab === 'offer' && (
        <OfferWizard
          db={db}
          productId={product.id}
          actorId={db.employees[0]?.id}
          onOpenReports={onOpenReports}
        />
      )}

      {tab === 'bom' && (
        <BomEditor db={db} productId={product.id} />
      )}

      {tab === 'operations' && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">{t('pws.operations')}</h3>
          <OperationList db={db} operations={operations} />
        </section>
      )}

      {tab === 'tasks' && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">{t('pws.tasks')}</h3>
          <TaskTable db={db} tasks={tasks} />
        </section>
      )}

      {tab === 'timeline' && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">{t('pws.timeline')}</h3>
          <div className="mt-3">
            <AuditTimeline entries={auditEntries} employeeLookup={employeeLookup} />
          </div>
        </section>
      )}
    </div>
  )
}
