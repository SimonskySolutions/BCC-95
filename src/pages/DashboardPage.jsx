import { useMemo } from 'react'
import StatCard from '../components/StatCard.jsx'
import {
  computeDeliveryMetrics,
  computeProcessHealthMetrics,
  computeProductivityMetrics,
  computeQualityMetrics,
} from '../services/kpis/kpiCalculator.js'
import { useLanguage } from '../i18n/useLanguage.js'

/**
 * @param {{ db: import('../data/mockDatabase.js').MockDatabase }} props
 */
export default function DashboardPage({ db }) {
  const { t } = useLanguage()
  const ref = new Date('2026-04-10')
  const delivery = computeDeliveryMetrics(db, ref)
  const productivity = computeProductivityMetrics(db)
  const quality = computeQualityMetrics(db)
  const process = computeProcessHealthMetrics(db)

  const cards = useMemo(
    () => [
      {
        id: 'delivery',
        label: t('dashboard.card.delivery.label'),
        value: `${delivery.onTimeDoneRatioPercent}%`,
        trend: t('dashboard.card.delivery.trend').replace(
          '{overdue}',
          String(delivery.overdueOpenCount),
        ),
        positive: delivery.overdueOpenCount === 0,
        icon: 'ClipboardList',
      },
      {
        id: 'productivity',
        label: t('dashboard.card.productivity.label'),
        value: `${productivity.operationThroughputPercent}%`,
        trend: t('dashboard.card.productivity.trend')
          .replace('{done}', String(productivity.operationDoneCount))
          .replace('{total}', String(productivity.operationTotal)),
        positive: productivity.operationThroughputPercent >= 50,
        icon: 'FolderKanban',
      },
      {
        id: 'quality',
        label: t('dashboard.card.quality.label'),
        value: `${quality.firstPassYieldPercent}%`,
        trend: t('dashboard.card.quality.trend')
          .replace('{fails}', String(quality.failCount))
          .replace('{samples}', String(quality.sampleCount)),
        positive: quality.firstPassYieldPercent >= 90,
        icon: 'Building2',
      },
      {
        id: 'process',
        label: t('dashboard.card.process.label'),
        value: `${process.avgCompletionPercent}%`,
        trend: t('dashboard.card.process.trend').replace('{count}', String(process.productCount)),
        positive: process.avgCompletionPercent >= 70,
        icon: 'Users',
      },
    ],
    [delivery, productivity, quality, process, t],
  )

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
          <StatCard key={item.id} item={item} />
        ))}
      </section>
      <p className="text-sm text-slate-500">{t('dashboard.footerNote')}</p>
    </div>
  )
}
