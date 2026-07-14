import { selectMachineById } from '../../domains/machines/selectors.js'
import { selectEmployeeById } from '../../domains/people/selectors.js'
import { useLanguage } from '../../i18n/useLanguage.js'
import OperationActions, { OperationStatusChip } from './OperationActions.jsx'

/**
 * @param {{
 *   db: import('../../data/mockDatabase.js').MockDatabase
 *   operations: import('../../domains/operations/model.js').Operation[]
 * }} props
 */
export default function OperationList({ db, operations }) {
  const { t } = useLanguage()

  if (operations.length === 0) {
    return <p className="text-sm text-slate-500">{t('opList.empty')}</p>
  }
  return (
    <ul className="space-y-2">
      {operations.map((op) => {
        const machine = op.machineId ? selectMachineById(db, op.machineId) : undefined
        const owner = op.ownerId ? selectEmployeeById(db, op.ownerId) : undefined
        const kpi = op.dailyKpiTarget
        return (
          <li
            key={op.id}
            className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-slate-900">
                {op.sequence}. {op.name}
                {op.stationCode ? (
                  <span className="ml-2 font-normal text-slate-500">({op.stationCode})</span>
                ) : null}
              </p>
              <p className="text-xs text-slate-500">
                {machine ? machine.name : t('opList.unassignedMachine')}
                {op.silo ? ` · ${op.silo}` : ''}
                {Number.isFinite(op.standardMinutes) ? ` · ${op.standardMinutes} ${t('opList.minStd')}` : ''}
              </p>
              {owner ? (
                <p className="text-xs text-slate-600">
                  {t('opList.owner')} <span className="font-medium">{owner.name}</span>
                </p>
              ) : null}
              {kpi ? (
                <p className="text-xs text-slate-500">
                  {t('opList.kpiTarget')} {kpi.targetUnitsPerShift} {t('opList.unitsPerShift')} · {t('opList.cycle')}{' '}
                  {kpi.targetCycleMinutes} {t('opList.min')} · {t('opList.scrapCap')} {kpi.maxDefectRatePercent}%
                </p>
              ) : null}
            </div>
            <span className="flex shrink-0 items-center gap-1.5">
              <OperationStatusChip status={op.status} />
              <OperationActions operation={op} />
            </span>
          </li>
        )
      })}
    </ul>
  )
}
