import { useLanguage } from '../../../i18n/useLanguage.js'
import { FEASIBILITY_RESULTS } from '../../../domains/inquiries/model.js'
import { recordProductFeasibility } from '../../../services/offers/feasibilityService.js'
import { updateInquiry } from '../../../services/offers/inquiryIntakeService.js'
import AttachmentEditor from './AttachmentEditor.jsx'

const RESULT_STYLE = {
  feasible: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  feasible_with_conditions: 'bg-amber-50 text-amber-700 ring-amber-200',
  blocked: 'bg-rose-50 text-rose-700 ring-rose-200',
  not_assessed: 'bg-slate-50 text-slate-500 ring-slate-200',
}

/**
 * @param {{
 *   db: import('../../../data/mockDatabase.js').MockDatabase
 *   inquiry: import('../../../domains/inquiries/model.js').Inquiry
 *   actorId?: string
 *   onChange?: () => void
 * }} props
 */
export default function FeasibilityPanel({ db, inquiry, actorId, onChange }) {
  const { t } = useLanguage()
  const missing = inquiry.missingFields ?? []
  const intakeIncomplete = missing.length > 0

  // Every product in the inquiry (primary + extras), each assessed on its own.
  const primary = db.products.find((p) => p.id === inquiry.productId)
  const products = [
    { productId: inquiry.productId, name: primary?.name ?? inquiry.productId },
    ...((inquiry.extraProducts ?? []).filter((e) => e.productId).map((e) => ({ productId: e.productId, name: e.name }))),
  ]
  const pf = inquiry.productFeasibility ?? {}

  function setProduct(productId, result) {
    recordProductFeasibility(db, inquiry.id, productId, result, actorId)
    onChange?.()
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{t('feasibility.title')}</h3>
        <div className="flex items-center gap-2">
          {inquiry.noAttachments ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-300">
              {t('inquiry.noFilesBadge')}
            </span>
          ) : null}
          {intakeIncomplete ? (
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
              {t('feasibility.blockedByIntake')}
            </span>
          ) : null}
        </div>
      </header>
      <p className="text-xs text-slate-500">{t('feasibility.descPerProduct')}</p>

      {/* Per-product feasibility */}
      <div className="space-y-2">
        {products.map((p) => {
          const result = pf[p.productId] ?? 'not_assessed'
          return (
            <div key={p.productId} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">{p.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${RESULT_STYLE[result] ?? RESULT_STYLE.not_assessed}`}>
                {t(`feasibility.result.${result}`, result)}
              </span>
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:bg-slate-50 disabled:text-slate-400"
                value={result}
                disabled={intakeIncomplete}
                onChange={(e) => setProduct(p.productId, e.target.value)}
              >
                {FEASIBILITY_RESULTS.map((r) => (
                  <option key={r} value={r}>{t(`feasibility.result.${r}`, r)}</option>
                ))}
              </select>
            </div>
          )
        })}
      </div>
      {intakeIncomplete ? (
        <p className="text-[11px] text-rose-600">{t('feasibility.completeIntakeFirst')}: {missing.join(', ')}</p>
      ) : (
        <p className="text-[11px] text-slate-400">{t('feasibility.gateNote')}</p>
      )}

      {/* Attachments */}
      <div className="border-t border-slate-100 pt-3">
        <AttachmentEditor
          attachments={inquiry.attachments ?? []}
          onChange={(next) => { updateInquiry(db, inquiry.id, { attachments: next, actorId }); onChange?.() }}
          noAttachments={inquiry.noAttachments}
          onToggleNoAttachments={(v) => { updateInquiry(db, inquiry.id, { noAttachments: v, actorId }); onChange?.() }}
        />
      </div>
    </div>
  )
}
