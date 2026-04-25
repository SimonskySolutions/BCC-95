import { useState } from 'react'
import ProductWorkspace from '../components/erp/ProductWorkspace.jsx'
import { selectProductWorkspaceBundle } from '../data/relations.js'
import { ALLOWED_PHASE_TRANSITIONS } from '../domains/lifecycle/model.js'
import { attemptPhaseTransition } from '../services/lifecycle/phaseTransitionService.js'
import { useLanguage } from '../i18n/useLanguage.js'

/**
 * @param {{
 *   db: import('../data/mockDatabase.js').MockDatabase
 *   productId: string
 *   onBack: () => void
 *   onOpenReports?: () => void
 * }} props
 */
export default function ProductWorkspacePage({ db, productId, onBack, onOpenReports }) {
  const { t } = useLanguage()
  const [transitionMessage, setTransitionMessage] = useState(/** @type {string | null} */ (null))
  const bundle = selectProductWorkspaceBundle(db, productId)
  const currentPhase = bundle?.lifecycle?.phaseId
  const allowedTargets = currentPhase ? ALLOWED_PHASE_TRANSITIONS[currentPhase] ?? [] : []

  function handleMoveToPhase(targetPhaseId) {
    const result = attemptPhaseTransition(db, productId, targetPhaseId)
    if (!result.ok) {
      setTransitionMessage(result.message ?? t('pw.phaseUnable'))
      return
    }
    setTransitionMessage(`${t('pw.phaseUpdated')} ${targetPhaseId}.`)
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-blue-700 hover:text-blue-900"
      >
        {t('pw.back')}
      </button>
      {bundle?.lifecycle ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('pw.phaseControl')}</p>
              <p className="text-sm text-slate-600">
                {t('pw.currentPhase')}{' '}
                <span className="font-semibold text-slate-900">{bundle.lifecycle.phaseId}</span>
              </p>
            </div>
            {allowedTargets.length > 0 ? (
              <div className="flex gap-2">
                {allowedTargets.map((targetPhaseId) => (
                  <button
                    key={targetPhaseId}
                    type="button"
                    onClick={() => handleMoveToPhase(targetPhaseId)}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    {t('pw.setPhase')} {targetPhaseId}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs font-medium text-emerald-700">{t('pw.finalPhase')}</p>
            )}
          </div>
          {transitionMessage ? <p className="mt-3 text-sm text-slate-600">{transitionMessage}</p> : null}
        </div>
      ) : null}
      <ProductWorkspace db={db} bundle={bundle} onOpenReports={onOpenReports} />
    </div>
  )
}
