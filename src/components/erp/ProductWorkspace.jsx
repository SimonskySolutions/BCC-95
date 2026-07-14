import { useMemo, useState } from 'react'
import { useDb } from '../../data/useDb.js'
import { useToast } from '../ui/feedbackContext.js'
import { ChevronRight } from 'lucide-react'
import TaskTable from './TaskTable.jsx'
import TaskDetailDrawer from './TaskDetailDrawer.jsx'
import OperationList from './OperationList.jsx'
import BomEditor from './BomEditor.jsx'
import InquiryIntakeForm from './offers/InquiryIntakeForm.jsx'
import OfferHistory from './offers/OfferHistory.jsx'
import ProductDocuments from './ProductDocuments.jsx'
import { ensureQuoteForProduct } from '../../services/offers/index.js'
import AuditTimeline from './AuditTimeline.jsx'
import { useLanguage } from '../../i18n/useLanguage.js'
import { selectInquiriesByProduct } from '../../domains/inquiries/selectors.js'
import { selectAuditByProduct } from '../../domains/audit/selectors.js'
import { LIFECYCLE_PHASE_DEFINITIONS, LIFECYCLE_PHASE_ORDER, ALLOWED_PHASE_TRANSITIONS } from '../../domains/lifecycle/model.js'
import { attemptPhaseTransition } from '../../services/lifecycle/phaseTransitionService.js'
import { computeOfferProgress } from '../../services/offers/offerSubStateMachine.js'

const TAB_IDS = /** @type {const} */ (['overview', 'inquiry', 'offer', 'documents', 'bom', 'operations', 'tasks', 'timeline'])

const TAB_FALLBACKS = {
  overview:   'Overview',
  inquiry:    'Inquiry',
  offer:      'Offer',
  documents:  'Documents',
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

/** Human-readable, localized blocker hints */
function blockerHint(blocker = '', t) {
  if (blocker.startsWith('task:quote-tech-review')) return t('pws.blocker.techReview', 'Complete the Technical Review task')
  if (blocker.startsWith('task:quote-costing'))     return t('pws.blocker.costing', 'Complete the Costing task')
  if (blocker.startsWith('task:'))                  return `${t('pws.blocker.task', 'Complete task:')} ${blocker.replace('task:', '')}`
  if (blocker === 'feasibility:not_recorded')        return t('pws.blocker.feasibility', 'Record the feasibility result in the Inquiry tab')
  if (blocker === 'quote:no_version')                return t('pws.blocker.noVersion', 'Create a quote version')
  if (blocker === 'quote:not_approved')              return t('pws.blocker.notApproved', 'Get the quote internally approved')
  if (blocker === 'quote:not_sent')                  return t('pws.blocker.notSent', 'Send the quote to the client')
  if (blocker === 'customer:pending')                return t('pws.blocker.customerPending', 'Waiting for the client decision')
  if (blocker.startsWith('intake:'))                 return `${t('pws.blocker.intake', 'Fill in the missing fields:')} ${blocker.replace('intake:', '')}`
  return blocker
}

/**
 * @param {{
 *   db: import('../../data/mockDatabase.js').MockDatabase
 *   bundle: object | null
 *   onOpenReports?: () => void
 * }} props
 */
export default function ProductWorkspace({ db, bundle, onOpenOffer }) {
  const { t } = useLanguage()
  const toast = useToast()
  const { commit } = useDb()
  const forceRefresh = () => commit()
  const [openTaskId, setOpenTaskId] = useState(/** @type {string | null} */ (null))

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
    const result = commit(() => attemptPhaseTransition(db, productId, targetPhaseId))
    if (result.ok) {
      toast(t('pws.phaseAdvanced', 'Phase advanced to {phase}.').replace('{phase}', t(`lifecycle.phase.${targetPhaseId}`, targetPhaseId)))
    } else {
      toast(result.message ?? t('pws.phaseChangeFailed', 'Unable to change phase.'), { type: 'error' })
    }
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
                    {t('pws.advanceTo', 'Advance to {phase}').replace('{phase}', t(`lifecycle.phase.${target}`, def?.label ?? target))}
                    <ChevronRight size={12} />
                  </button>
                )
              })}
            </div>
          )}
          {allowedTargets.length === 0 && lifecycle?.phaseId === 'released' && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">{t('lifecycle.phase.released', 'Released')}</span>
          )}
        </div>

        {/* Product name */}
        <h2 className="mt-2 text-xl font-bold text-slate-900">{product.name}</h2>

        {/* Description (skip when it just repeats the name) */}
        {product.description && product.description.trim() !== product.name.trim() && (
          <p className="mt-0.5 text-sm text-slate-500 line-clamp-2">{product.description}</p>
        )}

        {/* Metadata chips */}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          {product.uom && <span>{t('pws.uom', 'UoM')}: <span className="font-medium text-slate-600">{product.uom}</span></span>}
          {product.priceAverage != null && <span>{t('pws.avgPrice', 'Avg price')}: <span className="font-medium text-slate-600">€{product.priceAverage.toFixed(2)}</span></span>}
          {bundle.pathTemplate && <span>{t('pws.path', 'Path')}: <span className="font-medium text-slate-600">{bundle.pathTemplate.name}</span></span>}
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
                  {done ? '✓ ' : ''}{t(`lifecycle.phase.${phase.id}`, phase.label)}
                </span>
              </span>
            )
          })}
          {lifecycle?.blocked && (
            <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">
              ⚠ {t('pws.blocked', 'Blocked')}
            </span>
          )}
        </div>

      </div>

      {/* ── Tab bar ──────────────────────────────────────────────── */}
      <nav className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-card" role="tablist">
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
              className={`relative rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                tab === id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              {t(`pws.tab.${id}`, TAB_FALLBACKS[id])}
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

      {/* ── Tab content ─────────────────────────────────────────── */}

      <div key={tab} className="animate-fade-in-up">
      {tab === 'overview' && (
        <div className="space-y-3">
          {/* Next action card */}
          {progress?.nextStep && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">{t('pws.nextStepLabel', 'Next step')}</p>
              <p className="mt-0.5 text-sm font-semibold text-blue-900">
                {t(`offer.step.${progress.nextStep}`, progress.nextStep.replace(/_/g, ' '))}
              </p>
              {progress.blockers[0] && (
                <p className="mt-0.5 text-xs text-blue-700">{blockerHint(progress.blockers[0], t)}</p>
              )}
              <button
                type="button"
                onClick={() => setTab(stepToTab(progress.nextStep))}
                className="mt-2.5 flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                {t('pws.goTo', 'Go to {tab}').replace('{tab}', t(`pws.tab.${stepToTab(progress.nextStep)}`, TAB_FALLBACKS[stepToTab(progress.nextStep)]))}
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
                {t('pws.prevInquiries', 'Previous inquiries')} ({inquiries.length - 1})
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

      {tab === 'offer' && (() => {
        const inq = (db.inquiries ?? []).find(
          (i) => i.productId === product.id || (i.extraProducts ?? []).some((e) => e.productId === product.id),
        )
        const offerQuote = inq
          ? (db.quoteDrafts ?? []).find((q) => q.inquiryId === inq.id)
          : (db.quoteDrafts ?? []).find((q) => q.productId === product.id)
        const count = inq ? 1 + (inq.extraProducts ?? []).filter((e) => e.productId).length : 1
        const combined = count > 1
        const openOffer = () => {
          let q = offerQuote
          if (!q) {
            const primaryId = inq?.productId ?? product.id
            q = commit(() => ensureQuoteForProduct(db, { productId: primaryId, clientId: product.customerId, inquiryId: inq?.id }))
          }
          if (q) onOpenOffer?.(q.id)
        }
        return (
          <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              {t(combined ? 'pw.offer.combinedTitle' : 'pw.offer.singleTitle')}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {combined
                ? t('pw.offer.combinedDesc').replace('{n}', String(count))
                : t('pw.offer.singleDesc')}
              {offerQuote?.offerNo ? ` · ${offerQuote.offerNo}` : ''}
            </p>
            <button
              type="button"
              onClick={openOffer}
              className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {t(combined ? 'pw.offer.openCombined' : 'pw.offer.openOffer')} →
            </button>
          </section>
          <OfferHistory db={db} productId={product.id} onOpenOffer={onOpenOffer} />
          </div>
        )
      })()}

      {tab === 'documents' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">{t('pdocs.title')}</h3>
          <ProductDocuments db={db} productId={product.id} />
        </section>
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
          <TaskTable db={db} tasks={tasks} onOpenTask={setOpenTaskId} />
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

      {openTaskId ? (
        <TaskDetailDrawer
          db={db}
          taskId={openTaskId}
          actorId={db.employees[0]?.id}
          onClose={() => setOpenTaskId(null)}
          onChange={forceRefresh}
        />
      ) : null}
    </div>
  )
}
