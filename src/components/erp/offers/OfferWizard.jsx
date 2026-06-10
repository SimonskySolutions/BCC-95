import { useMemo, useState } from 'react'
import { CheckCircle2, AlertTriangle, RotateCcw, Paperclip, GitCompare, Layers, Plus, ChevronDown, Check } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { useDb } from '../../../data/useDb.js'
import { APP_TODAY } from '../../../lib/clock.js'
import {
  computeOfferProgress,
} from '../../../services/offers/offerSubStateMachine.js'
import { convertAcceptedOfferToOrder } from '../../../services/offers/orderHandoffService.js'
import { mandatoryQuotationTaskKeysForProduct } from '../../../services/quotations/quotationAutomationService.js'
import { patchTask } from '../../../domains/tasks/mutations.js'
import {
  selectQuoteApprovals,
  selectQuoteDocuments,
  selectQuoteDecision,
  selectQuoteLineItems,
  selectQuoteVersions,
  selectQuoteVersionById,
  selectOfferLinesTotal,
} from '../../../domains/quotations/selectors.js'
import {
  appendQuoteDocument,
  appendQuoteLineItem,
  clearQuoteLineItems,
  patchQuote,
  buildQuoteVersion,
  appendQuoteVersion,
  patchQuoteVersion,
} from '../../../domains/quotations/mutations.js'
import OfferCalculationPanel from './OfferCalculationPanel.jsx'
import OfferDetailsPanel from './OfferDetailsPanel.jsx'
import OfferVersionList from './OfferVersionList.jsx'
import OfferApprovalPanel from './OfferApprovalPanel.jsx'
import OfferPreview from './OfferPreview.jsx'
import OfferSendDialog from './OfferSendDialog.jsx'
import OfferStatusBadge from './OfferStatusBadge.jsx'
import FeasibilityPanel from './FeasibilityPanel.jsx'

function VersionDelta({ vA, vB, t }) {
  if (!vA || !vB) return null
  const FIELDS = ['subtotal', 'marginPercent', 'unitPrice', 'toolingCost', 'leadTimeDays', 'validUntil', 'moq', 'deliveryTerms', 'paymentTerms']
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white text-xs">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-slate-500">{t('offer.compare.field')}</th>
            <th className="px-3 py-2 text-left font-medium text-blue-600">v{vA.versionNo}</th>
            <th className="px-3 py-2 text-left font-medium text-violet-600">v{vB.versionNo}</th>
            <th className="px-3 py-2 text-center font-medium text-slate-400" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {FIELDS.map((f) => {
            const a = vA[f] ?? '—'
            const b = vB[f] ?? '—'
            const changed = String(a) !== String(b)
            return (
              <tr key={f} className={changed ? 'bg-amber-50/60' : ''}>
                <td className="px-3 py-1.5 font-medium text-slate-600">{f}</td>
                <td className="px-3 py-1.5 text-slate-700">{String(a)}</td>
                <td className="px-3 py-1.5 text-slate-700">{String(b)}</td>
                <td className="px-3 py-1.5 text-center">
                  {changed ? <span className="text-amber-600 font-bold">●</span> : <span className="text-slate-200">·</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const LINE_TEMPLATES = {
  standard: [
    { kind: 'material',  description: 'Steel (tube / sheet)',     quantity: 1, unitPrice: 0 },
    { kind: 'labor',     description: 'Cut + weld + powder coat', quantity: 1, unitPrice: 0 },
    { kind: 'logistics', description: 'Freight & packaging',      quantity: 1, unitPrice: 0 },
  ],
  toolingLabor: [
    { kind: 'tooling',   description: 'Jig / die setup',          quantity: 1, unitPrice: 0 },
    { kind: 'labor',     description: 'Labor',                    quantity: 1, unitPrice: 0 },
  ],
  materialsOnly: [
    { kind: 'material',  description: 'Materials',                quantity: 1, unitPrice: 0 },
  ],
}

/** Converts internal blocker codes to readable instructions. */
function blockerLabel(blocker = '') {
  if (blocker.startsWith('task:quote-tech-review')) return 'Complete the "Technical review (VSM 1.3)" task first — see the Tasks tab (it may be assigned to the engineer)'
  if (blocker.startsWith('task:quote-costing'))     return 'Complete the "Costing rollup (VSM 1.4)" task first — see the Tasks tab (it may be assigned to the planner)'
  if (blocker.startsWith('task:'))                  return `Complete the required task: ${blocker.replace('task:', '')}`
  if (blocker === 'feasibility:not_recorded')        return 'Record a feasibility result above'
  if (blocker === 'quote:no_version')                return 'Create a quote version in the costing step'
  if (blocker === 'quote:not_approved')              return 'Get the quote approved before sending'
  if (blocker === 'quote:not_sent')                  return 'Send the quote to the client'
  if (blocker === 'customer:pending')                return 'Waiting for the client\'s decision'
  if (blocker.startsWith('intake:'))                 return `Fill in missing inquiry fields: ${blocker.replace('intake:', '')}`
  return blocker
}

/**
 * One collapsible accordion section.
 * @param {{
 *   index: number
 *   title: string
 *   summary?: string
 *   progressLabel?: string
 *   done?: boolean
 *   open: boolean
 *   onToggle: () => void
 *   children: import('react').ReactNode
 * }} props
 */
function Section({ index, title, summary, progressLabel, done, open, onToggle, children }) {
  return (
    <div className={`overflow-hidden rounded-2xl border bg-white shadow-card transition ${open ? 'border-blue-200' : 'border-slate-200'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
      >
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          done ? 'bg-emerald-100 text-emerald-700' : open ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
        }`}>
          {done ? <Check size={14} /> : index}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-900">{title}</span>
          {!open && summary ? <span className="block truncate text-xs text-slate-500">{summary}</span> : null}
        </span>
        {progressLabel ? (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {progressLabel}
          </span>
        ) : null}
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? <div className="border-t border-slate-100 p-4">{children}</div> : null}
    </div>
  )
}

/** Maps a sub-state-machine step to the accordion section that resolves it. */
const STEP_TO_SECTION = {
  inquiry_received: 'feasibility',
  intake_complete: 'feasibility',
  feasibility_done: 'feasibility',
  tech_review_done: 'costing',
  costing_done: 'costing',
  quote_drafted: 'costing',
  approved: 'send',
  sent: 'send',
  decided_accepted: 'send',
}

const SECTION_STEPS = {
  feasibility: ['inquiry_received', 'intake_complete', 'feasibility_done'],
  costing: ['tech_review_done', 'costing_done', 'quote_drafted'],
  send: ['approved', 'sent', 'decided_accepted'],
}

/**
 * The two mandatory VSM gate tasks (tech review + costing), resolvable inline
 * so the user is never sent hunting through assignee-filtered task boards.
 * @param {{
 *   db: import('../../../data/mockDatabase.js').MockDatabase
 *   productId: string
 *   onChange: () => void
 * }} props
 */
function GateTasksPanel({ db, productId, onChange }) {
  const { t } = useLanguage()
  const keys = mandatoryQuotationTaskKeysForProduct(productId)
  const gateTasks = keys.map((key) => ({
    key,
    task: db.tasks.find((x) => x.productId === productId && x.taskKey === key && x.workstream === 'quotation'),
  }))
  if (gateTasks.every(({ task }) => task?.status === 'resolved')) return null
  return (
    <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
      <p className="text-xs font-semibold text-amber-900">{t('offer.gateTasks.title')}</p>
      <p className="mt-0.5 text-[11px] text-amber-700">{t('offer.gateTasks.hint')}</p>
      <ul className="mt-2 space-y-1.5">
        {gateTasks.map(({ key, task }) => {
          const assignee = task ? db.employees.find((e) => e.id === task.assigneeId) : undefined
          const resolved = task?.status === 'resolved'
          return (
            <li key={key} className="flex flex-wrap items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-amber-100">
              <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${resolved ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="min-w-0 flex-1 text-xs font-medium text-slate-800">
                {task?.title ?? key}
                {assignee ? <span className="ml-2 font-normal text-slate-400">{assignee.name}</span> : null}
              </span>
              {resolved ? (
                <span className="text-[10px] font-semibold text-emerald-600">✓ {t('offer.gateTasks.resolved')}</span>
              ) : task ? (
                <button
                  type="button"
                  onClick={() => {
                    patchTask(db, task.id, { status: 'resolved', completedAt: new Date().toISOString().slice(0, 10) })
                    onChange()
                  }}
                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                >
                  {t('offer.gateTasks.resolve')}
                </button>
              ) : (
                <span className="text-[10px] text-slate-400">{t('offer.gateTasks.missing')}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * Main "Offer" tab in Product Workspace — a 4-step accordion:
 *   1. Feasibility (VSM 1.3)
 *   2. Costing — internal cost rollup that drives the sell price
 *   3. Offer — customer-facing terms + offer lines
 *   4. Approve & send — approval gate, preview, send, versions
 *
 * @param {{
 *   db: import('../../../data/mockDatabase.js').MockDatabase
 *   productId: string
 *   actorId?: string
 *   onOpenReports?: () => void
 * }} props
 */
export default function OfferWizard({ db, productId, actorId, onOpenReports }) {
  const { t } = useLanguage()
  const { commit, version: dbVersion } = useDb()
  const onChange = () => commit()
  const [sendOpen, setSendOpen] = useState(false)
  const [selectedVersionId, setSelectedVersionId] = useState(/** @type {string | null} */ (null))
  const [compareMode, setCompareMode] = useState(false)
  const [compareA, setCompareA] = useState(/** @type {string|null} */ (null))
  const [compareB, setCompareB] = useState(/** @type {string|null} */ (null))
  const [attachForm, setAttachForm] = useState(false)
  const [attachName, setAttachName] = useState('')
  const [attachKind, setAttachKind] = useState(/** @type {'drawing'|'spec'|'other'} */ ('drawing'))
  const [openSection, setOpenSection] = useState(/** @type {string | null} */ (null))
  const [orderFlash, setOrderFlash] = useState('')

  const progress = useMemo(() => computeOfferProgress(db, productId), [db, productId, dbVersion])
  const activeQuote = progress.activeQuote
  const versions = useMemo(
    () => (activeQuote ? selectQuoteVersions(db, activeQuote.id) : []),
    [db, activeQuote, dbVersion],
  )
  const chosenVersionId = selectedVersionId ?? activeQuote?.currentVersionId
  const version = chosenVersionId ? selectQuoteVersionById(db, chosenVersionId) : undefined
  const lineItems = version ? selectQuoteLineItems(db, version.id) : []
  const approvals = version ? selectQuoteApprovals(db, version.id) : []
  const attachments = version ? selectQuoteDocuments(db, version.id) : []
  const decision = version ? selectQuoteDecision(db, version.id) : undefined
  const lastSentEmail = (db.outboundEmails ?? [])
    .filter((m) => m.productId === productId)
    .slice(-1)[0]

  // Which section should be open by default
  const activeSection = !progress.status.feasibility_done
    ? 'feasibility'
    : !version
      ? 'costing'
      : !progress.status.approved
        ? 'offer'
        : 'send'
  const effectiveOpen = openSection ?? activeSection
  const toggle = (id) => setOpenSection((cur) => ((cur ?? activeSection) === id ? '__none__' : id))

  // Expiration
  const validUntilStr = version?.validUntil ?? activeQuote?.validUntil
  const daysUntilExpiry = validUntilStr
    ? Math.round((new Date(validUntilStr) - APP_TODAY) / 86400000)
    : null

  function applyTemplate(key) {
    if (!version || !activeQuote) return
    clearQuoteLineItems(db, version.id)
    const rows = LINE_TEMPLATES[key] ?? []
    for (const row of rows) {
      appendQuoteLineItem(db, { ...row, quoteVersionId: version.id, totalPrice: 0 })
    }
    onChange()
  }

  function handleCreateRevision() {
    if (!activeQuote || !version) return
    const nextNo = (activeQuote.currentVersionNo ?? 1) + 1
    const newV = buildQuoteVersion(activeQuote.id, nextNo, {
      ...version,
      id: undefined,
      status: 'draft',
      createdAt: new Date().toISOString(),
      sentAt: undefined,
      lockedAt: undefined,
      supersedesVersionId: version.id,
    })
    appendQuoteVersion(db, newV)
    patchQuoteVersion(db, version.id, { status: 'superseded' })
    patchQuote(db, activeQuote.id, {
      status: 'draft',
      currentVersionNo: nextNo,
      currentVersionId: newV.id,
    })
    setSelectedVersionId(newV.id)
    onChange()
  }

  function handleCreateOrder() {
    if (!activeQuote) return
    const res = convertAcceptedOfferToOrder(db, activeQuote.id)
    if (res.ok) {
      setOrderFlash(res.created ? t('offer.accepted.orderCreated') : t('offer.accepted.orderExists'))
      onChange()
    } else {
      setOrderFlash(t('offer.error'))
    }
  }

  const clientId = activeQuote?.clientId ?? progress.inquiry?.customerId ?? db.clients[0]?.id ?? ''
  const clientName = db.clients.find((c) => c.id === clientId)?.name
  const offerTotal = version ? selectOfferLinesTotal(db, version.id) : 0

  /** Per-section "x/y" sub-progress from the state machine. */
  function sectionProgress(sectionId) {
    const steps = SECTION_STEPS[sectionId]
    if (!steps) return undefined
    const done = steps.filter((s) => progress.status[s]).length
    return `${done}/${steps.length}`
  }

  // Between drafting and approval the customer-facing offer must be completed
  // (validity + at least one line) — route the primary action there first.
  const offerIncomplete = Boolean(version) && (!version.validUntil || offerTotal === 0)

  /** The one primary button: open the section that resolves the next step. */
  function goToNextStep() {
    const next = progress.nextStep
    if (!next) return
    if (next === 'approved' && offerIncomplete) {
      setOpenSection('offer')
      return
    }
    const target = STEP_TO_SECTION[next] ?? 'feasibility'
    setOpenSection(target)
    if (next === 'sent' && version?.status === 'approved') setSendOpen(true)
  }

  return (
    <div className="space-y-4">

      {/* Post-acceptance banner */}
      {activeQuote?.status === 'accepted' ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-900">{t('offer.accepted.banner')}</p>
              <p className="mt-0.5 text-xs text-emerald-700">{t('offer.accepted.subtitle')}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCreateOrder}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  {t('offer.accepted.createOrder')}
                </button>
                {orderFlash ? <span className="text-xs font-medium text-emerald-800">{orderFlash}</span> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Revision request banner */}
      {activeQuote?.status === 'revision_requested' ? (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <RotateCcw size={16} className="mt-0.5 shrink-0 text-orange-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-900">{t('offer.revision.banner')}</p>
              {decision?.comment ? (
                <p className="mt-1 text-xs text-orange-800">
                  <span className="font-medium">{t('offer.revision.comment')}</span> {decision.comment}
                </p>
              ) : null}
              <button
                type="button"
                onClick={handleCreateRevision}
                className="mt-3 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
              >
                {t('offer.revision.createVersion')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Expiration warning */}
      {daysUntilExpiry !== null && activeQuote && !['accepted', 'rejected'].includes(activeQuote.status) ? (
        daysUntilExpiry < 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700">
            <AlertTriangle size={13} /> {t('offer.expiredBanner')}
          </div>
        ) : daysUntilExpiry <= 7 ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-700">
            <AlertTriangle size={13} /> {t('offer.expiresSoon').replace('{n}', String(daysUntilExpiry))}
          </div>
        ) : null
      ) : null}

      {/* Sticky summary + guided action bar */}
      <div className="sticky top-0 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-card backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">{t('offer.title')}</h3>
              {activeQuote ? <OfferStatusBadge status={activeQuote.status} /> : null}
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {clientName ?? '—'}
              {version ? <> · {t('offer.details.total')}: <span className="font-semibold text-slate-700">{offerTotal.toFixed(2)} {version.currency ?? 'EUR'}</span> · v{version.versionNo}</> : null}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onOpenReports ? (
              <button
                type="button"
                onClick={onOpenReports}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {t('offer.openReports')}
              </button>
            ) : null}
            {progress.nextStep ? (
              <button
                type="button"
                onClick={goToNextStep}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {progress.nextStep === 'approved' && offerIncomplete
                  ? t('offer.next.fillOffer')
                  : t(`offer.next.${progress.nextStep}`, t(`offer.step.${progress.nextStep}`, progress.nextStep))} →
              </button>
            ) : null}
          </div>
        </div>
        {progress.blockers.length > 0 && progress.nextStep ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
            {blockerLabel(progress.blockers[0])}
          </p>
        ) : null}
      </div>

      {/* Step 1 — Feasibility */}
      <Section
        index={1}
        title={t('offer.section.feasibility')}
        progressLabel={sectionProgress('feasibility')}
        done={progress.status.feasibility_done}
        summary={progress.inquiry?.feasibilityResult && progress.inquiry.feasibilityResult !== 'not_assessed'
          ? t(`feasibility.${progress.inquiry.feasibilityResult}`, progress.inquiry.feasibilityResult)
          : t('offer.section.feasibility.todo')}
        open={effectiveOpen === 'feasibility'}
        onToggle={() => toggle('feasibility')}
      >
        {progress.inquiry ? (
          <FeasibilityPanel db={db} inquiry={progress.inquiry} actorId={actorId} onChange={onChange} />
        ) : (
          <p className="text-xs text-slate-500">{t('offer.section.feasibility.noInquiry')}</p>
        )}
      </Section>

      {/* Step 2 — Costing (internal) */}
      <Section
        index={2}
        title={t('offer.section.costing')}
        progressLabel={sectionProgress('costing')}
        done={Boolean(version)}
        summary={version
          ? `${t('offer.section.costing.sell')}: ${(version.unitPrice ?? 0).toFixed(2)} ${version.currency ?? 'EUR'}`
          : t('offer.section.costing.todo')}
        open={effectiveOpen === 'costing'}
        onToggle={() => toggle('costing')}
      >
        <GateTasksPanel db={db} productId={productId} onChange={onChange} />
        {version && version.status === 'draft' ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Layers size={12} /> {t('offer.templates')}:
            </span>
            {['standard', 'toolingLabor', 'materialsOnly'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => applyTemplate(key)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-700 transition"
              >
                {t(`offer.template.${key}`)}
              </button>
            ))}
          </div>
        ) : null}
        <OfferCalculationPanel
          db={db}
          productId={productId}
          clientId={clientId}
          inquiryId={progress.inquiry?.id}
          quote={activeQuote}
          version={version}
          lineItems={lineItems}
          actorId={actorId}
          onChange={onChange}
        />
      </Section>

      {/* Step 3 — Offer (customer-facing) */}
      <Section
        index={3}
        title={t('offer.section.offer')}
        done={Boolean(version) && progress.status.approved}
        summary={version
          ? t('offer.section.offer.summary')
          : t('offer.section.offer.todo')}
        open={effectiveOpen === 'offer'}
        onToggle={() => toggle('offer')}
      >
        <OfferDetailsPanel
          db={db}
          version={version}
          clientId={clientId}
          actorId={actorId}
          onChange={onChange}
        />
      </Section>

      {/* Step 4 — Approve & send */}
      <Section
        index={4}
        title={t('offer.section.send')}
        progressLabel={sectionProgress('send')}
        done={progress.status.sent}
        summary={progress.status.sent
          ? t('offer.section.send.sent')
          : progress.status.approved
            ? t('offer.section.send.readyToSend')
            : t('offer.section.send.todo')}
        open={effectiveOpen === 'send'}
        onToggle={() => toggle('send')}
      >
        <div className="space-y-4">
          {/* The document is the hero — what the customer will actually see */}
          {version && activeQuote ? (
            <OfferPreview
              db={db}
              quote={activeQuote}
              version={version}
              acceptanceLink={lastSentEmail?.acceptanceLink}
            />
          ) : null}

          {version ? (
            <OfferApprovalPanel
              db={db}
              version={version}
              approvals={approvals}
              onChange={onChange}
            />
          ) : (
            <p className="text-xs text-slate-500">{t('offer.section.send.needVersion')}</p>
          )}

          {version && version.status === 'approved' ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSendOpen(true)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                {t('offer.send')} →
              </button>
            </div>
          ) : null}

          <details className="rounded-2xl border border-slate-200 bg-white shadow-card">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              {t('offer.history')}
            </summary>
            <div className="space-y-4 border-t border-slate-100 p-4">

          <section className="space-y-3">
            <header className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">{t('offer.versions')}</h3>
              <div className="flex items-center gap-2">
                {versions.length >= 2 ? (
                  <button
                    type="button"
                    onClick={() => { setCompareMode((v) => !v); setCompareA(null); setCompareB(null) }}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${compareMode ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    <GitCompare size={12} /> {t('offer.compare')}
                  </button>
                ) : null}
              </div>
            </header>

            {compareMode && versions.length >= 2 ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-700">{t('offer.compare.title')}</p>
                <div className="flex flex-wrap gap-3">
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-[10px] text-slate-500 mb-1">{t('offer.compare.vA')}</label>
                    <select value={compareA ?? ''} onChange={(e) => setCompareA(e.target.value || null)}
                      className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs focus:outline-none">
                      <option value="">— select —</option>
                      {versions.map((v) => <option key={v.id} value={v.id}>v{v.versionNo} ({v.status})</option>)}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-[10px] text-slate-500 mb-1">{t('offer.compare.vB')}</label>
                    <select value={compareB ?? ''} onChange={(e) => setCompareB(e.target.value || null)}
                      className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs focus:outline-none">
                      <option value="">— select —</option>
                      {versions.map((v) => <option key={v.id} value={v.id}>v{v.versionNo} ({v.status})</option>)}
                    </select>
                  </div>
                </div>
                {compareA && compareB && compareA !== compareB ? (
                  <VersionDelta
                    vA={versions.find((v) => v.id === compareA)}
                    vB={versions.find((v) => v.id === compareB)}
                    t={t}
                  />
                ) : null}
              </div>
            ) : null}

            <OfferVersionList
              versions={versions}
              currentVersionId={chosenVersionId ?? undefined}
              onSelect={setSelectedVersionId}
            />
          </section>

          {/* Attachments */}
          {version ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Paperclip size={14} className="text-slate-400" />
                  {t('offer.attachments')} {attachments.length > 0 ? `(${attachments.length})` : ''}
                </h3>
                <button
                  type="button"
                  onClick={() => setAttachForm((v) => !v)}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Plus size={11} /> {t('offer.attachments.add')}
                </button>
              </div>
              {attachments.length === 0 && !attachForm ? (
                <p className="text-xs text-slate-400">{t('offer.attachments.empty')}</p>
              ) : null}
              {attachments.length > 0 ? (
                <div className="space-y-1.5 mb-3">
                  {attachments.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        doc.kind === 'drawing' ? 'bg-blue-100 text-blue-700'
                        : doc.kind === 'spec' ? 'bg-violet-100 text-violet-700'
                        : 'bg-slate-100 text-slate-600'
                      }`}>{doc.kind}</span>
                      <span className="flex-1 text-xs font-medium text-slate-800 truncate">{doc.name}</span>
                      <span className="text-[10px] text-slate-400">{doc.createdAt.slice(0, 10)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {attachForm ? (
                <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-[10px] text-slate-500 mb-1">{t('offer.attachments.name')}</label>
                    <input type="text" value={attachName} onChange={(e) => setAttachName(e.target.value)}
                      placeholder="e.g. Drawing_rev2.pdf"
                      className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                  <div className="w-28">
                    <label className="block text-[10px] text-slate-500 mb-1">{t('offer.attachments.kind')}</label>
                    <select value={attachKind} onChange={(e) => setAttachKind(/** @type {any} */ (e.target.value))}
                      className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs focus:outline-none">
                      {['drawing', 'spec', 'other'].map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!attachName.trim()) return
                      appendQuoteDocument(db, { quoteVersionId: version.id, kind: attachKind, name: attachName.trim() })
                      setAttachName('')
                      setAttachForm(false)
                      onChange()
                    }}
                    className="h-8 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    {t('offer.attachments.add')}
                  </button>
                  <button type="button" onClick={() => setAttachForm(false)}
                    className="h-8 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-500 hover:bg-slate-50">
                    {t('common.cancel')}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {lastSentEmail ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <h3 className="text-sm font-semibold text-slate-900">{t('offer.lastEmail')}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {t('offer.sentAt')}: {lastSentEmail.sentAt.replace('T', ' ').slice(0, 16)} →{' '}
                {lastSentEmail.to.join(', ')}
              </p>
              <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-800">
{`${t('send.subject')}: ${lastSentEmail.subject}

${lastSentEmail.body}`}
              </pre>
              {lastSentEmail.acceptanceLink ? (
                <p className="mt-2 text-xs">
                  {t('offer.acceptanceLink')}:{' '}
                  <a href={lastSentEmail.acceptanceLink} className="font-medium text-blue-700 hover:text-blue-900">
                    {lastSentEmail.acceptanceLink}
                  </a>
                </p>
              ) : null}
            </div>
          ) : null}
            </div>
          </details>
        </div>
      </Section>

      <OfferSendDialog
        db={db}
        quote={activeQuote ?? undefined}
        version={version}
        actorId={actorId}
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        onSent={() => {
          setSendOpen(false)
          onChange()
        }}
      />
    </div>
  )
}
