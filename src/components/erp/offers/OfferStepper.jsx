import { useLanguage } from '../../../i18n/useLanguage.js'
import { OFFER_STEP_ORDER } from '../../../services/offers/offerSubStateMachine.js'

/**
 * @param {{ progress: import('../../../services/offers/offerSubStateMachine.js').ReturnType<typeof import('../../../services/offers/offerSubStateMachine.js').computeOfferProgress> | ReturnType<typeof import('../../../services/offers/offerSubStateMachine.js').computeOfferProgress> }} props
 */
export default function OfferStepper({ progress }) {
  const { t } = useLanguage()
  return (
    <ol className="flex flex-wrap gap-2">
      {OFFER_STEP_ORDER.map((step) => {
        const done = Boolean(progress.status[step])
        const current = progress.nextStep === step
        return (
          <li
            key={step}
            className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-medium ${
              current
                ? 'border-blue-200 bg-blue-50 text-blue-800'
                : done
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
            }`}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full border text-[10px]">
              {done ? '✓' : current ? '•' : ''}
            </span>
            <span>{t(`offer.step.${step}`, step.replace(/_/g, ' '))}</span>
          </li>
        )
      })}
    </ol>
  )
}
