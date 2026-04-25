import { computeQualityMetrics } from '../services/kpis/kpiCalculator.js'
import { useLanguage } from '../i18n/useLanguage.js'

/**
 * @param {{ db: import('../data/mockDatabase.js').MockDatabase }} props
 */
export default function QualityPage({ db }) {
  const { t } = useLanguage()
  const q = computeQualityMetrics(db)
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="text-lg font-semibold text-slate-900">{t('quality.snapshot')}</h2>
      <dl className="grid gap-3 sm:grid-cols-3 text-sm">
        <div>
          <dt className="text-slate-500">{t('quality.firstPass')}</dt>
          <dd className="text-2xl font-semibold text-slate-900">{q.firstPassYieldPercent}%</dd>
        </div>
        <div>
          <dt className="text-slate-500">{t('quality.fails')}</dt>
          <dd className="text-2xl font-semibold text-slate-900">{q.failCount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{t('quality.samples')}</dt>
          <dd className="text-2xl font-semibold text-slate-900">{q.sampleCount}</dd>
        </div>
      </dl>
    </div>
  )
}
