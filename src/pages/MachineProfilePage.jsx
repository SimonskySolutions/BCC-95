import { selectMachineById, selectMachineProfileMetrics } from '../domains/machines/selectors.js'
import { useLanguage } from '../i18n/useLanguage.js'

/**
 * @param {{
 *   db: import('../data/mockDatabase.js').MockDatabase
 *   machineId: string
 *   onBack: () => void
 * }} props
 */
export default function MachineProfilePage({ db, machineId, onBack }) {
  const { t } = useLanguage()
  const machine = selectMachineById(db, machineId)
  if (!machine) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{t('machine.notFound')}</p>
        <button type="button" onClick={onBack} className="text-sm font-medium text-blue-700 underline">
          {t('machine.back')}
        </button>
      </div>
    )
  }
  const m = selectMachineProfileMetrics(machine)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{machine.name}</h2>
          <p className="text-sm text-slate-500">{machine.workCenterCode}</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          {t('machine.back')}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase text-slate-500">{t('common.status')}</p>
          <p className="mt-1 text-lg font-bold capitalize text-slate-900">{machine.status}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase text-slate-500">{t('machines.utilRisk')}</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{m.utilizationPercent}%</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase text-slate-500">{t('machine.hourlyRate')}</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{m.hourlyRate}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase text-slate-500">{t('machine.downtimeHrs')}</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{m.downtimeHours}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('machine.qualityRisk')}</h3>
        <p className="text-sm capitalize text-slate-700">{m.qualityRisk}</p>
        <p className="mt-3 text-sm text-slate-600">{machine.notes}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('machine.capabilities')}</h3>
        <ul className="flex flex-wrap gap-2">
          {machine.capabilities.map((c) => (
            <li key={c} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {c}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('machine.maintenance')}</h3>
        {m.lastMaintenance ? (
          <p className="mb-2 text-xs text-slate-500">
            {t('common.latest')}: {m.lastMaintenance.date}
          </p>
        ) : null}
        <ul className="space-y-2 text-sm text-slate-600">
          {machine.maintenanceHistory.map((h, i) => (
            <li key={`${h.date}-${i}`}>
              {h.date}: {h.description}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
