import { appendProduct } from '../../domains/products/mutations.js'
import { appendClient, findClientByName, patchClient } from '../../domains/crm/mutations.js'
import { appendAuditEntry } from '../../domains/audit/mutations.js'
import { patchInquiry } from '../../domains/inquiries/mutations.js'
import { appendTask } from '../../domains/tasks/mutations.js'
import { registerInquiry, ensureQuotationGateTasks } from './inquiryIntakeService.js'

/** Create a product record (+ lifecycle state + audit) in the concept phase. */
function createConceptProduct(db, { name, description, clientId, actorId, type, uom }) {
  const product = appendProduct(db, {
    name: name.trim(),
    description,
    customerId: clientId,
    status: 'draft',
    lifecyclePhaseId: 'concept',
    type,
    uom,
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
    actorId,
    meta: { customerId: clientId, sku: product.sku },
  })
  return product
}

/**
 * @typedef {Object} NewInquiryClientInput
 * @property {string} [existingId]     — pick a client already in CRM
 * @property {string} [name]           — required when existingId is omitted
 * @property {string} [contactName]
 * @property {string} [contactEmail]
 * @property {string} [segment]
 * @property {string} [region]
 * @property {string} [country]
 * @property {string} [city]
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
 * @property {boolean} [noAttachments]
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
    // Keep the client's spoken language up to date if chosen on this inquiry.
    if (input.client.spokenLanguage && client.spokenLanguage !== input.client.spokenLanguage) {
      patchClient(db, client.id, { spokenLanguage: input.client.spokenLanguage })
    }
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
        country: input.client.country,
        city: input.client.city,
        spokenLanguage: input.client.spokenLanguage,
        eik: input.client.eik,
        vat: input.client.vat,
        address: input.client.address,
      })
  }

  const product = createConceptProduct(db, {
    name: input.product.name,
    description: input.product.description,
    type: input.product.type,
    uom: input.product.uom,
    clientId: client.id,
    actorId: input.actorId,
  })

  const inquiryResult = registerInquiry(db, {
    productId: product.id,
    customerId: client.id,
    channel: input.inquiry.channel,
    summary: input.inquiry.summary,
    requestedQuantity: input.inquiry.requestedQuantity,
    requestedQuantities: input.inquiry.requestedQuantities,
    extraProducts: input.inquiry.extraProducts,
    requestedDeadline: input.inquiry.requestedDeadline,
    specificationNote: input.inquiry.specificationNote,
    customerContactName: input.client.contactName,
    customerContactEmail: input.client.contactEmail,
    attachments: input.inquiry.attachments,
    noAttachments: input.inquiry.noAttachments,
    taskAssignees: input.tasks ? { tech: input.tasks.techAssigneeId, cost: input.tasks.costAssigneeId } : undefined,
    actorId: input.actorId,
  })
  if (!inquiryResult?.ok) {
    return { ok: /** @type {const} */ (false), code: 'inquiry_failed' }
  }

  // Extra ad-hoc tasks the user added during intake (assigned to whoever chosen).
  const today = new Date().toISOString().slice(0, 10)
  for (const et of input.tasks?.extra ?? []) {
    if (!et.title?.trim()) continue
    appendTask(db, {
      title: et.title.trim(),
      assigneeId: et.assigneeId || undefined,
      productId: product.id,
      dueDate: et.dueDate || today,
      status: 'draft',
      plannedYear: new Date().getFullYear(),
      plannedQuarter: /** @type {import('../../domains/tasks/model.js').PlannedQuarter} */ (`Q${Math.ceil((new Date().getMonth() + 1) / 3)}`),
      phaseId: 'concept',
      workstream: 'quotation',
      priority: 'medium',
      actorId: input.actorId,
    })
  }

  // Each additional product becomes its own real product (inventory) with its
  // own VSM gate tasks; record their product ids on the inquiry.
  const extras = input.inquiry.extraProducts ?? []
  if (extras.length) {
    const withIds = extras
      .filter((ep) => ep.name?.trim())
      .map((ep) => {
        const p = createConceptProduct(db, { name: ep.name, description: ep.description, clientId: client.id, actorId: input.actorId, type: ep.type, uom: ep.uom })
        ensureQuotationGateTasks(db, p.id, input.actorId)
        return { ...ep, productId: p.id }
      })
    patchInquiry(db, inquiryResult.inquiry.id, { extraProducts: withIds })
  }

  return {
    ok: /** @type {const} */ (true),
    product,
    client,
    inquiry: inquiryResult.inquiry,
  }
}
