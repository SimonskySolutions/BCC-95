import { useLanguage } from '../../../i18n/useLanguage.js'
import { OFFER_STEP_ORDER } from '../../../services/offers/offerSubStateMachine.js'

/**
 * @param {{ progress: ReturnType<import('../../../services/offers/offerSubStateMachine.js').computeOfferProgress> }} props
 */
export default function OfferStepper({ progress }) {
  const { t } = useLanguage()
  return (
    <ol className="flex flex-wrap items-center gap-1">
      {OFFER_STEP_ORDER.map((step, i) => {
        const done = Boolean(progress.status[step])
        const current = progress.nextStep === step
        return (
          <li key={step} className="flex items-center gap-1">
            {i > 0 && (
              <span className={`h-px w-3 shrink-0 ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />
            )}
            <span
              className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium ${
                current
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : done
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
              }`}
            >
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                done ? 'bg-emerald-500 text-white' : current ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {done ? '✓' : i + 1}
              </span>
              <span>{t(`offer.step.${step}`, step.replace(/_/g, ' '))}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
