import { useMemo, useReducer, useState } from 'react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import {
  computeOfferProgress,
} from '../../../services/offers/offerSubStateMachine.js'
import {
  selectQuoteApprovals,
  selectQuoteLineItems,
  selectQuoteVersions,
  selectQuoteVersionById,
} from '../../../domains/quotations/selectors.js'
import OfferStepper from './OfferStepper.jsx'
import OfferCalculationPanel from './OfferCalculationPanel.jsx'
import OfferVersionList from './OfferVersionList.jsx'
import OfferApprovalPanel from './OfferApprovalPanel.jsx'
import OfferPreview from './OfferPreview.jsx'
import OfferSendDialog from './OfferSendDialog.jsx'
import OfferStatusBadge from './OfferStatusBadge.jsx'
import FeasibilityPanel from './FeasibilityPanel.jsx'

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
  const lastSentEmail = (db.outboundEmails ?? [])
    .filter((m) => m.productId === productId)
    .slice(-1)[0]

  return (
    <div className="space-y-4">
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
            {t('offer.nextStep')}: {t(`offer.step.${progress.nextStep}`, progress.nextStep)} — {progress.blockers[0]}
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
          {version && version.status === 'approved' ? (
            <button
              type="button"
              onClick={() => setSendOpen(true)}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              {t('offer.send')}
            </button>
          ) : null}
        </header>
        <OfferVersionList
          versions={versions}
          currentVersionId={chosenVersionId ?? undefined}
          onSelect={setSelectedVersionId}
        />
      </section>

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
