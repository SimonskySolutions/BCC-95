/**
 * High-level quote header status.
 * Back-compat with earlier scaffold: `draft | sent | revision_requested | accepted | rejected`.
 * @typedef {'draft' | 'pending_approval' | 'approved' | 'sent' | 'revision_requested' | 'accepted' | 'rejected'} QuoteStatus
 */

/**
 * @typedef {'BGN' | 'EUR' | 'USD'} QuoteCurrency
 */

/**
 * @typedef {Object} QuoteDraft
 * @property {string} id
 * @property {string} clientId
 * @property {string} productId
 * @property {string} [inquiryId]                       — link back to the source inquiry
 * @property {QuoteStatus} status
 * @property {number} subtotal
 * @property {number} marginPercent
 * @property {string} [revisionNote]
 * @property {string} updatedAt                         — ISO date
 * @property {QuoteCurrency} [currency]
 * @property {string} [language]                        — `en` | `bg`
 * @property {number} [unitPrice]
 * @property {number} [toolingCost]
 * @property {number} [leadTimeDays]
 * @property {string} [validUntil]                      — ISO date
 * @property {string} [deliveryTerms]
 * @property {string} [paymentTerms]
 * @property {number} [moq]
 * @property {number} [currentVersionNo]
 * @property {string} [currentVersionId]
 * @property {string} [offerNo]                         — customer-facing offer number (OF-YYYY-####)
 */

/**
 * An immutable snapshot of a quote. A new version is created whenever the user
 * revises, so sent versions can never be edited.
 * @typedef {'draft' | 'approved' | 'sent' | 'superseded' | 'decided'} QuoteVersionStatus
 */

/**
 * @typedef {Object} QuoteVersion
 * @property {string} id
 * @property {string} quoteId
 * @property {number} versionNo
 * @property {QuoteVersionStatus} status
 * @property {string} createdAt                        — ISO datetime
 * @property {string} [sentAt]
 * @property {string} [lockedAt]
 * @property {string} [supersedesVersionId]
 * @property {number} subtotal
 * @property {number} marginPercent
 * @property {number} [unitPrice]
 * @property {number} [toolingCost]
 * @property {number} [leadTimeDays]
 * @property {string} [validUntil]
 * @property {string} [deliveryTerms]
 * @property {string} [paymentTerms]
 * @property {number} [moq]
 * @property {QuoteCurrency} [currency]
 * @property {string} [language]
 * @property {string} [notes]
 * @property {'exw' | 'dap' | 'both'} [priceBasis]    — which unit price the offer matrix shows
 *
 * Customer-facing header (mapped from the legacy GS "Order Confirmation"):
 * @property {string} [customerOrderRef]              — customer's own PO ref ("Ваша Поръчка #")
 * @property {string} [contactPersonId]               — FK → ClientContact.id
 * @property {string} [contactName]                   — snapshot for the printed offer
 * @property {string} [contactTitle]
 * @property {string} [deliveryAddress]               — free-text shipping address
 * @property {string} [termsOfDeliveryId]             — FK → TermsOfDelivery.id
 * @property {string} [termsOfPaymentId]              — FK → TermsOfPayment.id
 * @property {string} [orderDate]                     — ISO date
 * @property {string} [dispatchDate]                  — ISO date (planned shipment)
 * @property {string} [createdBy]                     — employee id of the issuer (GS `UserName`); also drives the approval self-check
 */

/**
 * @typedef {'material' | 'tooling' | 'labor' | 'operation' | 'logistics' | 'other'} QuoteLineItemKind
 */

/**
 * @typedef {Object} QuoteLineItem
 * @property {string} id
 * @property {string} quoteVersionId
 * @property {QuoteLineItemKind} kind
 * @property {string} description
 * @property {number} quantity
 * @property {number} unitPrice
 * @property {number} totalPrice
 */

/**
 * Manager approval gate before sending.
 * @typedef {'approved' | 'rejected'} QuoteApprovalDecision
 */

/**
 * @typedef {Object} QuoteApproval
 * @property {string} id
 * @property {string} quoteVersionId
 * @property {string} approverEmployeeId
 * @property {QuoteApprovalDecision} decision
 * @property {string} decidedAt
 * @property {string} [note]
 */

/**
 * @typedef {'drawing' | 'spec' | 'generated_offer_pdf' | 'customer_email' | 'acceptance_receipt' | 'other'} QuoteDocumentKind
 */

/**
 * @typedef {Object} QuoteDocument
 * @property {string} id
 * @property {string} quoteVersionId
 * @property {QuoteDocumentKind} kind
 * @property {string} name
 * @property {string} [storageRef]
 * @property {string} createdAt
 */

/**
 * Customer decision captured via the public acceptance form.
 * @typedef {'accepted' | 'revision_requested' | 'rejected'} QuoteDecisionOutcome
 */

/**
 * @typedef {Object} QuoteDecision
 * @property {string} id
 * @property {string} quoteVersionId
 * @property {QuoteDecisionOutcome} decision
 * @property {string} decidedAt
 * @property {string} [customerContactName]
 * @property {string} [customerContactEmail]
 * @property {string} [comment]
 * @property {string} token
 */

/** @type {QuoteStatus[]} */
export const QUOTE_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'sent',
  'revision_requested',
  'accepted',
  'rejected',
]

/** @type {QuoteVersionStatus[]} */
export const QUOTE_VERSION_STATUSES = ['draft', 'approved', 'sent', 'superseded', 'decided']

/** @type {QuoteLineItemKind[]} */
export const QUOTE_LINE_ITEM_KINDS = [
  'material',
  'tooling',
  'labor',
  'operation',
  'logistics',
  'other',
]

/**
 * A customer-facing offer line — the actual product/quantity/price quoted to the
 * customer (distinct from internal cost lines `QuoteLineItem`). Mapped from the
 * legacy GS `PartnerOrderResource`: requested vs. confirmed quantity & date, unit
 * of measure, requirements and dual-currency price.
 *
 * @typedef {Object} QuoteOfferLine
 * @property {string} id
 * @property {string} quoteVersionId
 * @property {string} [productId]                      — FK → Product.id (optional for ad-hoc lines)
 * @property {string} description                      — product name snapshot / free text
 * @property {string} [uom]                            — unit of measure (defaults from the product)
 * @property {number} requestedQty                     — what the customer asked for (CustomerQuantity)
 * @property {string} [requestedDate]                  — ISO date (ExpeditionDate)
 * @property {number} [confirmedQty]                   — what we commit to (OriginalQuantity)
 * @property {string} [confirmedDate]                  — ISO date (OriginalDate)
 * @property {number} unitPrice                        — price per unit (DAP/delivered) in the quote currency
 * @property {number} [exwUnitPrice]                   — ex-works unit price (matrix shows EXW + DAP)
 * @property {number} [priceCurrency]                  — secondary-currency price (PriceCurrency)
 * @property {number} [discountPercent]                — per-line discount (e.g. volume discount)
 * @property {string} [requirements]                   — spec / requirements (ResourceRequiments)
 * @property {string} [remark]                         — line remark (ResourceRemarks)
 * @property {number} [sortOrder]
 */

/**
 * Managed lookup — incoterm / delivery condition (legacy GS `TermsOfDelivery`).
 * @typedef {Object} TermsOfDelivery
 * @property {string} id
 * @property {string} [code]                           — e.g. "FCA", "EXW"
 * @property {string} label
 */

/**
 * Managed lookup — payment condition (legacy GS `TermsOfPayment`).
 * @typedef {Object} TermsOfPayment
 * @property {string} id
 * @property {string} [code]
 * @property {string} label
 */

/* ── Working cost sheet ──────────────────────────────────────────────────────
 * The cost sheet is the *always-editable* internal calculation that lives on the
 * quote (not on a version). Drafting/sending an offer snapshots it into the
 * immutable QuoteVersion line items — so history stays frozen while the
 * engineer can keep refining costs at any time. Modelled on the «бланка» sheet
 * of the reference calculation workbook: the cost is split into independent
 * groups that each roll up separately, then combine into cost price → EXW → DAP.
 */

/**
 * The five calculation parts, mirroring the «Номенклатури» workbook tabs. Each
 * maps onto a QuoteLineItemKind so snapshots stay backward-compatible.
 * - `material`   — материали: raw material, surface, consumables, fittings, packaging, energy
 * - `operation`  — Операции: process operations (cutting, bending, welding, assembly…) incl. labour
 * - `tooling`    — инструменти: one-off tooling ledger (billed separately or amortised)
 * - `other`      — общи разходи: overhead, admin, marketing, depreciation, financial
 * - `logistics`  — Логистика: freight that lifts EXW → DAP
 * @typedef {'material' | 'operation' | 'tooling' | 'other' | 'logistics'} CostGroup
 */

/**
 * How a line computes its per-unit amount:
 * - `count`      — qty × unitCost
 * - `weight`     — netKg × (1 + scrapPct/100) × costPerKg   (gross from net)
 * - `surface`    — areaDm2 × gPerDm2 / 1000 × costPerKg      (coating from area)
 * - `percent`    — percentOfBase % of the cost base (materials+labour+machine)
 * - `allocation` — fixedTotal ÷ allocationUnits             (fixed cost / volume)
 * - `pack`       — costPerPack ÷ unitsPerPack                (freight per unit)
 * @typedef {'count' | 'weight' | 'surface' | 'percent' | 'allocation' | 'pack'} CostDriver
 */

/**
 * @typedef {Object} CostSheet
 * @property {string} id
 * @property {string} quoteId
 * @property {string} productId
 * @property {import('./model.js').QuoteCurrency} currency
 * @property {number} marginPercent                  — profit % applied to cost price
 * @property {number} [annualQty]                    — informational (Pcs/year)
 * @property {'separate' | 'amortise'} toolingMode   — tooling billed separately or amortised into burden
 * @property {number} [amortisationUnits]            — units the tooling cost is spread over (editable)
 * @property {QuantityBreak[]} [priceBreaks]         — per-quantity margin tiers (100/200/500…)
 * @property {string} [notes]                        — free-text note for the whole calculation
 * @property {string} updatedAt
 */

/**
 * A quantity tier with its own profit margin — lets the same calculation be
 * quoted at different prices for 100 / 200 / 500 pcs, etc.
 * @typedef {Object} QuantityBreak
 * @property {string} id
 * @property {number} qty
 * @property {number} marginPercent
 */

/**
 * @typedef {Object} CostSheetLine
 * @property {string} id
 * @property {string} costSheetId
 * @property {CostGroup} group
 * @property {CostDriver} driver
 * @property {string} description
 * @property {string} [note]                         — free-text clarification next to the item (бланка col. B)
 * @property {string} [catalogRefId]                 — catalog entry it was picked from
 * @property {number} [qty]                          — count/pack driver
 * @property {number} [unitCost]                     — count driver
 * @property {number} [netKg]                        — weight driver (net mass)
 * @property {number} [scrapPct]                     — weight driver (scrap uplift %)
 * @property {number} [costPerKg]                    — weight/surface driver (€/kg)
 * @property {number} [areaDm2]                      — surface driver
 * @property {number} [gPerDm2]                      — surface driver (consumption)
 * @property {boolean} [linkNetKg]                   — weight line reads the sheet's total net kg (energy)
 * @property {number} [percent]                      — percent driver
 * @property {number} [fixedTotal]                   — allocation driver
 * @property {number} [allocationUnits]              — allocation driver
 * @property {number} [unitsPerPack]                 — pack driver
 * @property {number} [costPerPack]                  — pack driver (freight per pack)
 * @property {number} [sortOrder]
 */

/**
 * A reusable nomenclature entry — pick it on a line to pre-fill the driver
 * columns and default rate. Grouped so each cost group shows only its catalog.
 * @typedef {Object} CostCatalogEntry
 * @property {string} id
 * @property {CostGroup} group
 * @property {CostDriver} driver
 * @property {string} label
 * @property {Partial<CostSheetLine>} defaults       — values copied onto the new line
 * @property {string} [note]
 */

/** The five parts, in display order (matches the «Номенклатури» tabs). @type {CostGroup[]} */
export const COST_GROUPS = ['material', 'operation', 'tooling', 'other', 'logistics']

/** Cost groups that sum into the product cost price (before profit & logistics). */
export const COST_PRICE_GROUPS = ['material', 'operation', 'other']

/** @type {CostDriver[]} */
export const COST_DRIVERS = ['count', 'weight', 'surface', 'percent', 'allocation', 'pack']

/** Which drivers each group is allowed to use in the UI. */
export const GROUP_DRIVERS = {
  material: ['count', 'weight', 'surface'],
  operation: ['count', 'weight'],
  tooling: ['count'],
  other: ['percent', 'allocation', 'count'],
  logistics: ['pack', 'count'],
}

export {}
