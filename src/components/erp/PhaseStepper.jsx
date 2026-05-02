import { LIFECYCLE_PHASE_DEFINITIONS, LIFECYCLE_PHASE_ORDER } from '../../domains/lifecycle/model.js'
import { useLanguage } from '../../i18n/useLanguage.js'

/**
 * @param {{ currentPhaseId?: string; blocked?: boolean; blockedReason?: string }} props
 */
export default function PhaseStepper({ currentPhaseId, blocked, blockedReason }) {
  const { t } = useLanguage()
  const idx = currentPhaseId ? LIFECYCLE_PHASE_ORDER.indexOf(currentPhaseId) : -1
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{t('phase.title')}</h3>
        {blocked ? (
          <span
            className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200"
            title={blockedReason ?? t('phase.blockedHint', 'Check the Tasks tab to resolve open items.')}
          >
            ⚠ {t('phase.blocked')} — {blockedReason ?? t('phase.blockedHint', 'open items pending')}
          </span>
        ) : null}
      </div>
      <ol className="flex flex-wrap items-center gap-1">
        {LIFECYCLE_PHASE_DEFINITIONS.map((phase, i) => {
          const done = idx >= 0 && i < idx
          const active = phase.id === currentPhaseId
          const phaseLabel = t(`lifecycle.phase.${phase.id}`, phase.label)
          return (
            <li key={phase.id} className="flex items-center gap-1">
              {i > 0 && (
                <span className={`h-px w-4 shrink-0 ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />
              )}
              <span
                className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium ${
                  active
                    ? 'border-blue-200 bg-blue-50 text-blue-800'
                    : done
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                  done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {done ? '✓' : i + 1}
                </span>
                {phaseLabel}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
