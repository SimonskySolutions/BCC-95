/**
 * @param {{ machines: import('./model.js').Machine[] }} db
 * @param {string} machineId
 * @returns {import('./model.js').Machine | undefined}
 */
export function selectMachineById(db, machineId) {
  return db.machines.find((m) => m.id === machineId)
}

/**
 * @param {import('./model.js').Machine} machine
 */
export function selectMachineProfileMetrics(machine) {
  const lastMaint =
    machine.maintenanceHistory.length > 0
      ? machine.maintenanceHistory.reduce((a, b) => (a.date > b.date ? a : b))
      : null
  return {
    utilizationPercent: machine.utilization,
    hourlyRate: machine.hourlyRate,
    downtimeHours: machine.downtimeHours,
    qualityRisk: machine.qualityRisk,
    capabilityCount: machine.capabilities.length,
    lastMaintenance: lastMaint,
  }
}
