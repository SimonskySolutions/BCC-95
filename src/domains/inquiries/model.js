/**
 * Channel the inquiry arrived through.
 * @typedef {'email' | 'phone' | 'portal' | 'referral' | 'in_person' | 'other'} InquiryChannel
 */

/**
 * VSM Фаза 1 — inquiry state (before offer is drafted).
 * @typedef {'received' | 'intake_pending' | 'intake_complete' | 'feasibility_done' | 'closed_rejected'} InquiryStatus
 */

/**
 * Feasibility outcome recorded during обсъждане (VSM 1.3).
 * @typedef {'feasible' | 'feasible_with_conditions' | 'blocked' | 'not_assessed'} FeasibilityResult
 */

/**
 * @typedef {'drawings' | 'quantity' | 'deadline' | 'specifications' | 'customerRequirements'} IntakeRequirement
 */

/**
 * @typedef {Object} InquiryAttachment
 * @property {string} id
 * @property {string} name
 * @property {string} kind                       — e.g. `drawing`, `spec`, `email`
 * @property {string} [storageRef]               — opaque reference; mocked
 */

/**
 * @typedef {Object} Inquiry
 * @property {string} id
 * @property {string} productId
 * @property {string} customerId
 * @property {string} receivedAt                 — ISO datetime
 * @property {InquiryChannel} channel
 * @property {InquiryStatus} status
 * @property {string} [summary]
 * @property {number} [requestedQuantity]
 * @property {string} [requestedDeadline]        — ISO date
 * @property {string} [specificationNote]
 * @property {string} [customerContactName]
 * @property {string} [customerContactEmail]
 * @property {IntakeRequirement[]} [missingFields]
 * @property {InquiryAttachment[]} [attachments]
 * @property {boolean} [noAttachments]            — explicitly marked as "no files provided"; satisfies the drawings intake check
 * @property {FeasibilityResult} [feasibilityResult]
 * @property {string} [feasibilityNote]
 * @property {string} [closedReason]
 */

/** @type {IntakeRequirement[]} */
export const INTAKE_REQUIREMENTS = [
  'drawings',
  'quantity',
  'deadline',
  'specifications',
  'customerRequirements',
]

/** @type {InquiryStatus[]} */
export const INQUIRY_STATUSES = [
  'received',
  'intake_pending',
  'intake_complete',
  'feasibility_done',
  'closed_rejected',
]

/** @type {FeasibilityResult[]} */
export const FEASIBILITY_RESULTS = [
  'feasible',
  'feasible_with_conditions',
  'blocked',
  'not_assessed',
]
