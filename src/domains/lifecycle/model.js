/**
 * Ordered lifecycle phases for manufactured products.
 * @typedef {'concept' | 'design' | 'prototype' | 'production' | 'quality' | 'released'} LifecyclePhaseId
 */

/** @type {LifecyclePhaseId[]} */
export const LIFECYCLE_PHASE_ORDER = ['concept', 'design', 'prototype', 'production', 'quality', 'released']

/**
 * @typedef {Object} LifecyclePhaseDefinition
 * @property {LifecyclePhaseId} id
 * @property {string} label
 * @property {boolean} requiresApprovalToExit — gate before leaving this phase
 * @property {number} minCompletionToExit — 0–100; enforced when exiting to next phase
 */

/** @type {LifecyclePhaseDefinition[]} */
export const LIFECYCLE_PHASE_DEFINITIONS = [
  { id: 'concept', label: 'Concept', requiresApprovalToExit: false, minCompletionToExit: 40 },
  { id: 'design', label: 'Design', requiresApprovalToExit: true, minCompletionToExit: 60 },
  { id: 'prototype', label: 'Prototype', requiresApprovalToExit: false, minCompletionToExit: 80 },
  { id: 'production', label: 'Production', requiresApprovalToExit: false, minCompletionToExit: 70 },
  { id: 'quality', label: 'Quality', requiresApprovalToExit: true, minCompletionToExit: 90 },
  { id: 'released', label: 'Released', requiresApprovalToExit: false, minCompletionToExit: 100 },
]

/**
 * Adjacency: from -> allowed to[] (forward-only scaffold).
 * @type {Record<string, LifecyclePhaseId[]>}
 */
export const ALLOWED_PHASE_TRANSITIONS = {
  concept: ['design'],
  design: ['prototype'],
  prototype: ['production'],
  production: ['quality'],
  quality: ['released'],
  released: [],
}

/**
 * @typedef {Object} ProductLifecycleState
 * @property {string} productId
 * @property {LifecyclePhaseId} phaseId
 * @property {number} completionPercent
 * @property {boolean} blocked
 * @property {string[]} pendingApprovalStages — phase ids awaiting sign-off
 * @property {string[]} completedGates — arbitrary gate ids satisfied for this product
 */

/**
 * @param {unknown} id
 * @returns {id is LifecyclePhaseId}
 */
export function isLifecyclePhaseId(id) {
  return typeof id === 'string' && LIFECYCLE_PHASE_ORDER.includes(/** @type {LifecyclePhaseId} */ (id))
}
