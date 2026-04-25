import {
  selectOperationActualsByDate,
  selectStationAssignmentsByDate,
} from '../../domains/shifts/selectors.js'

/**
 * @param {Date | string} date
 * @returns {string}
 */
function toIsoDate(date) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Daily KPI row aggregated by operation (not by employee).
 * @typedef {Object} DailyOperationKpiRow
 * @property {string} operationId
 * @property {string} operationName
 * @property {string} productId
 * @property {number} plannedTargetUnits
 * @property {number} actualGoodQty
 * @property {number} actualScrapQty
 * @property {number} defectRatePercent
 * @property {number|null} cycleAdherencePercent — 100 when actual avg cycle equals target; null if not computable
 * @property {number} participationCount — distinct employees with actuals or station assignments that day
 * @property {number} targetCycleMinutes
 * @property {number} maxDefectRatePercent
 */

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {Date | string} date
 * @returns {DailyOperationKpiRow[]}
 */
export function computeDailyOperationKpis(db, date) {
  const iso = toIsoDate(date)
  const actuals = selectOperationActualsByDate(db, iso)
  const stations = selectStationAssignmentsByDate(db, iso)

  /** @type {Map<string, DailyOperationKpiRow>} */
  const byOp = new Map()

  for (const op of db.operations) {
    const t = op.dailyKpiTarget
    if (!t) continue
    byOp.set(op.id, {
      operationId: op.id,
      operationName: op.name,
      productId: op.productId,
      plannedTargetUnits: t.targetUnitsPerShift,
      actualGoodQty: 0,
      actualScrapQty: 0,
      defectRatePercent: 0,
      cycleAdherencePercent: null,
      participationCount: 0,
      targetCycleMinutes: t.targetCycleMinutes,
      maxDefectRatePercent: t.maxDefectRatePercent,
    })
  }

  const participantsByOp = /** @type {Map<string, Set<string>>} */ (new Map())
  for (const s of stations) {
    if (!participantsByOp.has(s.operationId)) participantsByOp.set(s.operationId, new Set())
    participantsByOp.get(s.operationId).add(s.employeeId)
  }

  /** @type {Map<string, number[]>} */
  const cycleSamples = new Map()

  for (const a of actuals) {
    let row = byOp.get(a.operationId)
    if (!row) {
      const op = db.operations.find((o) => o.id === a.operationId)
      if (!op?.dailyKpiTarget) continue
      row = {
        operationId: op.id,
        operationName: op.name,
        productId: op.productId,
        plannedTargetUnits: op.dailyKpiTarget.targetUnitsPerShift,
        actualGoodQty: 0,
        actualScrapQty: 0,
        defectRatePercent: 0,
        cycleAdherencePercent: null,
        participationCount: 0,
        targetCycleMinutes: op.dailyKpiTarget.targetCycleMinutes,
        maxDefectRatePercent: op.dailyKpiTarget.maxDefectRatePercent,
      }
      byOp.set(op.id, row)
    }
    row.actualGoodQty += a.actualGoodQty ?? 0
    row.actualScrapQty += a.actualScrapQty ?? 0
    if (!participantsByOp.has(a.operationId)) participantsByOp.set(a.operationId, new Set())
    participantsByOp.get(a.operationId).add(a.employeeId)

    const dur = a.actualDurationMinutes
    if (Number.isFinite(dur) && dur > 0) {
      if (!cycleSamples.has(a.operationId)) cycleSamples.set(a.operationId, [])
      cycleSamples.get(a.operationId).push(dur)
    }
  }

  const rows = Array.from(byOp.values())
  for (const row of rows) {
    const good = row.actualGoodQty
    const scrap = row.actualScrapQty
    const denom = good + scrap
    row.defectRatePercent = denom > 0 ? (scrap / denom) * 100 : 0

    const parts = participantsByOp.get(row.operationId)
    row.participationCount = parts ? parts.size : 0

    const samples = cycleSamples.get(row.operationId)
    const target = row.targetCycleMinutes
    if (samples?.length && target > 0) {
      const avg = samples.reduce((s, x) => s + x, 0) / samples.length
      row.cycleAdherencePercent = Math.min(200, Math.round((target / avg) * 100))
    }
  }

  return rows.sort((a, b) => a.productId.localeCompare(b.productId) || a.operationName.localeCompare(b.operationName))
}
