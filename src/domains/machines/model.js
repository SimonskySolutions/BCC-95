/**
 * @typedef {'idle' | 'running' | 'down'} MachineOperationalStatus
 */

/**
 * @typedef {'low' | 'medium' | 'high'} MachineQualityRisk
 */

/**
 * @typedef {Object} MaintenanceEvent
 * @property {string} date — ISO date
 * @property {string} description
 */

/**
 * @typedef {Object} Machine
 * @property {string} id
 * @property {string} name
 * @property {string} workCenterCode
 * @property {MachineOperationalStatus} status
 * @property {string[]} capabilities
 * @property {number} hourlyRate
 * @property {number} utilization — 0-100
 * @property {MaintenanceEvent[]} maintenanceHistory
 * @property {number} downtimeHours — YTD or rolling
 * @property {MachineQualityRisk} qualityRisk
 * @property {string} notes
 */

export {}
