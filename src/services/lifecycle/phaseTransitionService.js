import {
  ALLOWED_PHASE_TRANSITIONS,
  LIFECYCLE_PHASE_DEFINITIONS,
} from '../../domains/lifecycle/model.js'
import { selectLifecycleStateByProduct } from '../../domains/lifecycle/selectors.js'
import { selectProductById } from '../../domains/products/selectors.js'

/**
 * @typedef {'blocked' | 'invalid_transition' | 'completion' | 'approval' | 'phase_tasks_incomplete' | 'not_found' | 'ok'} PhaseTransitionCode
 */

/**
 * @typedef {Object} PhaseTransitionResult
 * @property {boolean} ok
 * @property {PhaseTransitionCode} code
 * @property {string} [message]
 */

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} productId
 * @param {import('../../domains/lifecycle/model.js').LifecyclePhaseId} targetPhaseId
 * @returns {PhaseTransitionResult}
 */
export function validatePhaseTransition(db, productId, targetPhaseId) {
  const product = selectProductById(db, productId)
  if (!product) {
    return { ok: false, code: 'not_found', message: 'Product not found' }
  }
  const state = selectLifecycleStateByProduct(db, productId)
  if (!state) {
    return { ok: false, code: 'not_found', message: 'Lifecycle state not found' }
  }
  if (state.blocked) {
    return { ok: false, code: 'blocked', message: 'Product lifecycle is blocked' }
  }
  const from = state.phaseId
  const allowed = ALLOWED_PHASE_TRANSITIONS[from] ?? []
  if (!allowed.includes(targetPhaseId)) {
    return { ok: false, code: 'invalid_transition', message: `Cannot move from ${from} to ${targetPhaseId}` }
  }
  const pendingPhaseTasks = db.tasks.filter(
    (task) => task.productId === productId && task.phaseId === from && task.status !== 'resolved',
  )
  if (pendingPhaseTasks.length > 0) {
    return {
      ok: false,
      code: 'phase_tasks_incomplete',
      message: `Complete all ${from} tasks before moving to ${targetPhaseId}`,
    }
  }
  const def = LIFECYCLE_PHASE_DEFINITIONS.find((d) => d.id === from)
  if (def && state.completionPercent < def.minCompletionToExit) {
    return {
      ok: false,
      code: 'completion',
      message: `Completion must be ≥ ${def.minCompletionToExit}% to exit ${from}`,
    }
  }
  if (def?.requiresApprovalToExit && state.pendingApprovalStages.includes(from)) {
    return {
      ok: false,
      code: 'approval',
      message: `Pending approval required to exit ${from}`,
    }
  }
  return { ok: true, code: 'ok' }
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} productId
 * @param {import('../../domains/lifecycle/model.js').LifecyclePhaseId} targetPhaseId
 * @returns {PhaseTransitionResult}
 */
export function attemptPhaseTransition(db, productId, targetPhaseId) {
  const result = validatePhaseTransition(db, productId, targetPhaseId)
  if (!result.ok) return result
  const state = selectLifecycleStateByProduct(db, productId)
  if (state) {
    state.phaseId = targetPhaseId
  }
  return { ok: true, code: 'ok' }
}
