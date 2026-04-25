import { useState } from 'react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { submitApproval } from '../../../services/offers/quoteApprovalService.js'

/**
 * @param {{
 *   db: import('../../../data/mockDatabase.js').MockDatabase
 *   version?: import('../../../domains/quotations/model.js').QuoteVersion
 *   approvals: import('../../../domains/quotations/model.js').QuoteApproval[]
 *   actorId?: string
 *   onChange?: () => void
 * }} props
 */
export default function OfferApprovalPanel({ db, version, approvals, actorId, onChange }) {
  const { t } = useLanguage()
  const [approverId, setApproverId] = useState(actorId ?? db.employees[0]?.id ?? '')
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState(/** @type {string | null} */ (null))

  function decide(decision) {
    if (!version) return
    const res = submitApproval(db, {
      quoteVersionId: version.id,
      approverEmployeeId: approverId,
      decision,
      note,
    })
    if (res.ok) {
      setFlash(decision === 'approved' ? t('approval.approved') : t('approval.rejected'))
      onChange?.()
    } else {
      setFlash(res.message ?? t('approval.error'))
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{t('approval.title')}</h3>
      </header>
      <p className="text-xs text-slate-500">{t('approval.desc')}</p>

      {approvals.length > 0 ? (
        <ul className="space-y-1 text-xs">
          {approvals.map((a) => (
            <li key={a.id} className="rounded bg-slate-50 px-2 py-1 text-slate-700">
              <span className="font-medium">{t(`approval.decision.${a.decision}`, a.decision)}</span>{' '}
              by {a.approverEmployeeId} — {a.decidedAt.slice(0, 16).replace('T', ' ')}
              {a.note ? ` — “${a.note}”` : ''}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block text-xs font-medium text-slate-600">
          {t('approval.approver')}
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={approverId}
            onChange={(e) => setApproverId(e.target.value)}
          >
            {db.employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.role})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-600 md:col-span-2">
          {t('approval.note')}
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{flash ?? ''}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => decide('rejected')}
            className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
            disabled={!version || version.status !== 'draft'}
          >
            {t('approval.reject')}
          </button>
          <button
            type="button"
            onClick={() => decide('approved')}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            disabled={!version || version.status !== 'draft'}
          >
            {t('approval.approve')}
          </button>
        </div>
      </div>
    </div>
  )
}
