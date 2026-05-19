import { useMemo, useReducer, useState } from 'react'
import { CheckCircle2, AlertTriangle, RotateCcw, Paperclip, GitCompare, Layers, Trash2, Plus } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import {
  computeOfferProgress,
} from '../../../services/offers/offerSubStateMachine.js'
import {
  selectQuoteApprovals,
  selectQuoteDocuments,
  selectQuoteDecision,
  selectQuoteLineItems,
  selectQuoteVersions,
  selectQuoteVersionById,
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
import OfferStepper from './OfferStepper.jsx'
import OfferCalculationPanel from './OfferCalculationPanel.jsx'
import OfferVersionList from './OfferVersionList.jsx'
import OfferApprovalPanel from './OfferApprovalPanel.jsx'
import OfferPreview from './OfferPreview.jsx'
import OfferSendDialog from './OfferSendDialog.jsx'
import OfferStatusBadge from './OfferStatusBadge.jsx'
import FeasibilityPanel from './FeasibilityPanel.jsx'

const TODAY = new Date('2026-05-19')

/** @type {Record<string,'material'|'tooling'|'labor'|'operation'|'logistics'>[][]} */
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
    { kind: 'material',  description: 'Raw materials',          quantity: 1, unitPrice: 0 },
    { kind: 'labor',     description: 'CNC machining',          quantity: 1, unitPrice: 0 },
    { kind: 'logistics', description: 'Freight & packaging',    quantity: 1, unitPrice: 0 },
  ],
  toolingLabor: [
    { kind: 'tooling',   description: 'Tooling setup',          quantity: 1, unitPrice: 0 },
    { kind: 'labor',     description: 'Labor',                  quantity: 1, unitPrice: 0 },
  ],
  materialsOnly: [
    { kind: 'material',  description: 'Materials',              quantity: 1, unitPrice: 0 },
  ],
}

/** Converts internal blocker codes to readable instructions. */
function blockerLabel(blocker = '') {
  if (blocker.startsWith('task:quote-tech-review')) return 'Complete the Technical Review task first'
  if (blocker.startsWith('task:quote-costing'))     return 'Complete the Costing task first'
  if (blocker.startsWith('task:'))                  return `Complete the required task: ${blocker.replace('task:', '')}`
  if (blocker === 'feasibility:not_recorded')        return 'Record a feasibility result above'
  if (blocker === 'quote:no_version')                return 'Create a quote version in the calculation panel'
  if (blocker === 'quote:not_approved')              return 'Get the quote approved before sending'
  if (blocker === 'quote:not_sent')                  return 'Send the quote to the client'
  if (blocker === 'customer:pending')                return 'Waiting for the client\'s decision'
  if (blocker.startsWith('intake:'))                 return `Fill in missing inquiry fields: ${blocker.replace('intake:', '')}`
  return blocker
}

/**
 * Main "Offer" tab in Product Workspace. Orchestrates:
 *   - Feasibility check (VSM 1.3)
 *   - Cost calculation & versioning (VSM 1.4)
 *   - Approval gate
 *   - Send offer (email + acceptance link)
 *   - Preview & audit
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
  const [, forceRefresh] = useReducer((x) => x + 1, 0)
  const onChange = () => forceRefresh()
  const [sendOpen, setSendOpen] = useState(false)
  const [selectedVersionId, setSelectedVersionId] = useState(/** @type {string | null} */ (null))
  const [compareMode, setCompareMode] = useState(false)
  const [compareA, setCompareA] = useState(/** @type {string|null} */ (null))
  const [compareB, setCompareB] = useState(/** @type {string|null} */ (null))
  const [attachForm, setAttachForm] = useState(false)
  const [attachName, setAttachName] = useState('')
  const [attachKind, setAttachKind] = useState(/** @type {'drawing'|'spec'|'other'} */ ('drawing'))
  const [moCreated, setMoCreated] = useState(false)
  const [poCreated, setPoCreated] = useState(false)

  const progress = useMemo(() => computeOfferProgress(db, productId), [db, productId])
  const activeQuote = progress.activeQuote
  const versions = useMemo(
    () => (activeQuote ? selectQuoteVersions(db, activeQuote.id) : []),
    [db, activeQuote],
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

  // Expiration
  const validUntilStr = version?.validUntil ?? activeQuote?.validUntil
  const daysUntilExpiry = validUntilStr
    ? Math.round((new Date(validUntilStr) - TODAY) / 86400000)
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
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { setMoCreated(true); setPoCreated(false) }}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  {moCreated ? '✓ ' + t('offer.accepted.moCreated') : t('offer.accepted.createMO')}
                </button>
                <button
                  type="button"
                  onClick={() => { setPoCreated(true); setMoCreated(false) }}
                  className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                >
                  {poCreated ? '✓ ' + t('offer.accepted.poCreated') : t('offer.accepted.createPO')}
                </button>
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

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{t('offer.title')}</h3>
            <p className="text-xs text-slate-500">{t('offer.desc')}</p>
          </div>
          <div className="flex items-center gap-2">
            {activeQuote ? <OfferStatusBadge status={activeQuote.status} /> : null}
            {onOpenReports ? (
              <button
                type="button"
                onClick={onOpenReports}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {t('offer.openReports')}
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-3">
          <OfferStepper progress={progress} />
        </div>
        {progress.blockers.length > 0 && progress.nextStep ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
            {t('offer.nextStep')}: {t(`offer.step.${progress.nextStep}`, progress.nextStep.replace(/_/g, ' '))}
            {' — '}{blockerLabel(progress.blockers[0])}
          </p>
        ) : null}
      </div>

      {progress.inquiry ? (
        <FeasibilityPanel
          db={db}
          inquiry={progress.inquiry}
          actorId={actorId}
          onChange={onChange}
        />
      ) : null}

      {/* Line item templates */}
      {version && version.status === 'draft' ? (
        <div className="flex flex-wrap items-center gap-2">
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <OfferCalculationPanel
          db={db}
          productId={productId}
          clientId={activeQuote?.clientId ?? progress.inquiry?.customerId ?? db.clients[0]?.id ?? ''}
          inquiryId={progress.inquiry?.id}
          quote={activeQuote}
          version={version}
          lineItems={lineItems}
          actorId={actorId}
          onChange={onChange}
        />
        {version ? (
          <OfferApprovalPanel
            db={db}
            version={version}
            approvals={approvals}
            actorId={actorId}
            onChange={onChange}
          />
        ) : null}
      </div>

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
            {version && version.status === 'approved' ? (
              <button
                type="button"
                onClick={() => setSendOpen(true)}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                {t('offer.send')}
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

      {version && activeQuote ? (
        <OfferPreview
          db={db}
          quote={activeQuote}
          version={version}
          lineItems={lineItems}
          acceptanceLink={lastSentEmail?.acceptanceLink}
        />
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
              <a
                href={lastSentEmail.acceptanceLink}
                className="font-medium text-blue-700 hover:text-blue-900"
              >
                {lastSentEmail.acceptanceLink}
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

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
