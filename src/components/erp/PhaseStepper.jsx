import { LIFECYCLE_PHASE_DEFINITIONS, LIFECYCLE_PHASE_ORDER } from '../../domains/lifecycle/model.js'
import { useLanguage } from '../../i18n/useLanguage.js'

/**
 * @param {{ currentPhaseId?: string; blocked?: boolean }} props
 */
export default function PhaseStepper({ currentPhaseId, blocked }) {
  const { t } = useLanguage()
  const idx = currentPhaseId ? LIFECYCLE_PHASE_ORDER.indexOf(currentPhaseId) : -1
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{t('phase.title')}</h3>
        {blocked ? (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
            {t('phase.blocked')}
          </span>
        ) : null}
      </div>
      <ol className="flex flex-wrap gap-2">
        {LIFECYCLE_PHASE_DEFINITIONS.map((phase, i) => {
          const done = idx >= 0 && i < idx
          const active = phase.id === currentPhaseId
          const phaseLabel = t(`lifecycle.phase.${phase.id}`, phase.label)
          return (
            <li
              key={phase.id}
              className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                active
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : done
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              {phaseLabel}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
