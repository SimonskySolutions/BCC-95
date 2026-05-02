import { useState } from 'react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { FEASIBILITY_RESULTS } from '../../../domains/inquiries/model.js'
import { recordFeasibility } from '../../../services/offers/feasibilityService.js'

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
  const [result, setResult] = useState(inquiry.feasibilityResult ?? 'not_assessed')
  const [note, setNote] = useState(inquiry.feasibilityNote ?? '')
  const [flash, setFlash] = useState(/** @type {string | null} */ (null))

  function save() {
    const res = recordFeasibility(db, inquiry.id, {
      result: /** @type {import('../../../domains/inquiries/model.js').FeasibilityResult} */ (result),
      note,
      actorId,
    })
    if (res.ok) {
      setFlash(t('feasibility.saved'))
      onChange?.()
    } else {
      setFlash(t('feasibility.error'))
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{t('feasibility.title')}</h3>
        {inquiry.missingFields && inquiry.missingFields.length > 0 ? (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
            {t('feasibility.blockedByIntake')}
          </span>
        ) : null}
      </header>
      <p className="text-xs text-slate-500">{t('feasibility.desc')}</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block text-xs font-medium text-slate-600">
          {t('feasibility.result')}
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={result}
            onChange={(e) => setResult(e.target.value)}
          >
            {FEASIBILITY_RESULTS.map((r) => (
              <option key={r} value={r}>
                {t(`feasibility.result.${r}`, r)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-600 md:col-span-2">
          {t('feasibility.note')}
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </div>
      <div className="flex items-center justify-between">
        {flash ? (
          <p className={`rounded-lg px-3 py-1.5 text-xs font-medium ${flash === t('feasibility.saved') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {flash}
          </p>
        ) : <span />}
        <button
          type="button"
          onClick={save}
          className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={(inquiry.missingFields ?? []).length > 0}
          title={(inquiry.missingFields ?? []).length > 0
            ? `Complete intake form first: ${(inquiry.missingFields ?? []).join(', ')}`
            : undefined}
        >
          {t('feasibility.save')}
        </button>
      </div>
    </div>
  )
}
