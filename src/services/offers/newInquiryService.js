import { appendProduct } from '../../domains/products/mutations.js'
import { appendClient, findClientByName } from '../../domains/crm/mutations.js'
import { appendAuditEntry } from '../../domains/audit/mutations.js'
import { registerInquiry } from './inquiryIntakeService.js'

/**
 * @typedef {Object} NewInquiryClientInput
 * @property {string} [existingId]     — pick a client already in CRM
 * @property {string} [name]           — required when existingId is omitted
 * @property {string} [contactName]
 * @property {string} [contactEmail]
 * @property {string} [segment]
 * @property {string} [region]
 */

/**
 * @typedef {Object} NewInquiryProductInput
 * @property {string} name
 * @property {string} [description]
 */

/**
 * @typedef {Object} NewInquiryInquiryInput
 * @property {import('../../domains/inquiries/model.js').InquiryChannel} channel
 * @property {number} [requestedQuantity]
 * @property {string} [requestedDeadline]
 * @property {string} [summary]
 * @property {string} [specificationNote]
 * @property {import('../../domains/inquiries/model.js').InquiryAttachment[]} [attachments]
 */

/**
 * @typedef {Object} StartNewInquiryInput
 * @property {NewInquiryClientInput} client
 * @property {NewInquiryProductInput} product
 * @property {NewInquiryInquiryInput} inquiry
 * @property {string} [actorId]
 */

/**
 * @typedef {Object} StartNewInquiryResult
 * @property {true} ok
 * @property {import('../../domains/products/model.js').Product} product
 * @property {import('../../domains/crm/model.js').Client} client
 * @property {import('../../domains/inquiries/model.js').Inquiry} inquiry
 */

/**
 * @typedef {Object} StartNewInquiryError
 * @property {false} ok
 * @property {'missing_client_name'|'missing_product_name'|'missing_channel'|'client_not_found'|'inquiry_failed'} code
 * @property {string} [message]
 */

/**
 * Atomically: resolve/create the client, create the product in the Inquiry &
 * Offering phase (concept), seed its lifecycle state, log a `product.created`
 * audit entry, then hand off to the existing `registerInquiry` service which
 * creates the Inquiry + Phase-1 tasks + inquiry audit entries.
 *
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {StartNewInquiryInput} input
 * @returns {StartNewInquiryResult | StartNewInquiryError}
 */
export function startNewInquiry(db, input) {
  if (!input?.product?.name?.trim()) {
    return { ok: /** @type {const} */ (false), code: 'missing_product_name' }
  }
  if (!input?.inquiry?.channel) {
    return { ok: /** @type {const} */ (false), code: 'missing_channel' }
  }

  let client
  if (input.client.existingId) {
    client = db.clients.find((c) => c.id === input.client.existingId)
    if (!client) return { ok: /** @type {const} */ (false), code: 'client_not_found' }
  } else {
    const name = input.client.name?.trim()
    if (!name) return { ok: /** @type {const} */ (false), code: 'missing_client_name' }
    client =
      findClientByName(db, name) ??
      appendClient(db, {
        name,
        contactName: input.client.contactName,
        contactEmail: input.client.contactEmail,
        segment: input.client.segment,
        region: input.client.region,
      })
  }

  const product = appendProduct(db, {
    name: input.product.name.trim(),
    description: input.product.description,
    customerId: client.id,
    status: 'draft',
    lifecyclePhaseId: 'concept',
  })

  db.productLifecycleStates.push({
    productId: product.id,
    phaseId: /** @type {import('../../domains/lifecycle/model.js').LifecyclePhaseId} */ ('concept'),
    completionPercent: 0,
    blocked: false,
    pendingApprovalStages: [],
    completedGates: [],
  })

  appendAuditEntry(db, {
    productId: product.id,
    entityType: 'product',
    entityId: product.id,
    action: 'product.created',
    actorId: input.actorId,
    meta: { customerId: client.id, sku: product.sku },
  })

  const inquiryResult = registerInquiry(db, {
    productId: product.id,
    customerId: client.id,
    channel: input.inquiry.channel,
    summary: input.inquiry.summary,
    requestedQuantity: input.inquiry.requestedQuantity,
    requestedDeadline: input.inquiry.requestedDeadline,
    specificationNote: input.inquiry.specificationNote,
    customerContactName: input.client.contactName,
    customerContactEmail: input.client.contactEmail,
    attachments: input.inquiry.attachments,
    actorId: input.actorId,
  })
  if (!inquiryResult?.ok) {
    return { ok: /** @type {const} */ (false), code: 'inquiry_failed' }
  }

  return {
    ok: /** @type {const} */ (true),
    product,
    client,
    inquiry: inquiryResult.inquiry,
  }
}
