/** @type {import('./model.js').KpiTarget[]} */
export const kpiTargets = [
  { id: 'on-time', label: 'On-time task completion', targetPercent: 92 },
  { id: 'fpq', label: 'First-pass quality', targetPercent: 97 },
  { id: 'utilization', label: 'Machine utilization', targetPercent: 78 },
]

/** Incident log driving quality KPIs (first-pass fail counts). */
export const qualityIncidents = [
  { id: 'qi-1', productId: 'prod-1', operationId: 'op-3', failedFirstPass: true },
  { id: 'qi-2', productId: 'prod-2', operationId: 'op-6', failedFirstPass: false },
]
