/**
 * A vendor category ("Metals", "Packaging", "Fasteners"…) — answers "where do
 * we buy this type of material".
 * @typedef {Object} VendorCategory
 * @property {string} id
 * @property {string} name
 */

/**
 * @typedef {Object} Vendor
 * @property {string} id
 * @property {string} name
 * @property {string} category               — legacy free-text label (pre-categories import)
 * @property {string} [categoryId]           — managed VendorCategory reference
 * @property {'preferred'|'active'|'on_hold'} status
 * @property {string} [country]
 * @property {string} [postCode]
 * @property {string} [city]
 * @property {string} [address]
 * @property {string} [vat]
 * @property {string} [phone]
 * @property {string} [email]
 * @property {string} [paymentTerms]        — e.g. "30 days net"
 * @property {number} [leadTimeDays]        — typical lead time
 * @property {string} [notes]
 * @property {VendorContact[]} [contacts]   — contact persons at this vendor
 */

/**
 * A contact person at a vendor. Position falls back to 'N/A' when unknown.
 * @typedef {Object} VendorContact
 * @property {string} id
 * @property {string} name
 * @property {string} position               — job title/role, or 'N/A'
 * @property {string} [phone]
 * @property {string} [email]
 */

/**
 * @typedef {Object} Material
 * @property {string} id
 * @property {string} sku
 * @property {string} name
 * @property {string} uom
 */

/**
 * Purchase-order lifecycle: draft → sent → confirmed → partial → received →
 * closed; cancellable until goods arrive.
 * @typedef {Object} PurchaseOrder
 * @property {string} id
 * @property {string} [no]                  — human PO number (PO-YYYY-NNNN)
 * @property {string} vendorId
 * @property {string} orderedAt             — ISO date
 * @property {string} [expectedAt]          — promised/expected delivery (ISO date)
 * @property {'draft'|'sent'|'confirmed'|'partial'|'received'|'closed'|'cancelled'} status
 * @property {string} [currency]
 * @property {string} [notes]
 * @property {string} [contractId]          — vendor contract this order falls under
 * @property {string} [createdById]
 */

/**
 * @typedef {Object} PurchaseOrderLine
 * @property {string} id
 * @property {string} purchaseOrderId
 * @property {string} [materialId]
 * @property {string} [description]         — free text when not a catalogued material
 * @property {number} qty
 * @property {string} [uom]
 * @property {number} unitCost
 * @property {number} [discountPercent]     — negotiated line discount
 * @property {number} [receivedQty]
 * @property {string} [receivedAt]          — ISO date of (last) receipt
 */

/**
 * @typedef {Object} GoodsReceipt
 * @property {string} id
 * @property {string} purchaseOrderId
 * @property {string} receivedAt
 * @property {string} [lineId]
 * @property {number} [qty]
 */

/**
 * @typedef {Object} VendorInvoice
 * @property {string} id
 * @property {string} vendorId
 * @property {string} purchaseOrderId
 * @property {number} amount
 * @property {string} issuedAt
 */

/**
 * A signed vendor contract with a validity window. Contract-level discounts
 * apply to every purchase from that vendor while valid.
 * @typedef {Object} VendorContract
 * @property {string} id
 * @property {string} vendorId
 * @property {string} title                 — e.g. "Frame agreement 2026"
 * @property {string} [refNo]               — contract number/reference
 * @property {string} [validFrom]           — ISO date
 * @property {string} [validTo]             — ISO date
 * @property {number} [discountPercent]     — general discount agreed in the contract
 * @property {string} [terms]               — payment/delivery terms, free text
 * @property {string} [fileId]              — scanned signed contract in file storage
 * @property {string} [fileName]
 * @property {string} createdAt
 */

/**
 * A special negotiated discount — vendor-wide or scoped to one material —
 * optionally with a validity window and a minimum quantity.
 * @typedef {Object} VendorDiscount
 * @property {string} id
 * @property {string} vendorId
 * @property {string} [materialId]          — empty = applies to everything from this vendor
 * @property {string} [scope]               — free-text scope when not a catalogued material
 * @property {number} percent
 * @property {number} [minQty]
 * @property {string} [validTo]             — ISO date
 * @property {string} [note]
 * @property {string} createdAt
 */

/**
 * A vendor's quoted price for an item — the raw material of offer comparison
 * when shopping the same product across vendors.
 * @typedef {Object} VendorQuote
 * @property {string} id
 * @property {string} vendorId
 * @property {string} [materialId]
 * @property {string} itemName              — what is being quoted (shared across vendors to compare)
 * @property {number} [qty]                 — quoted quantity
 * @property {number} unitPrice
 * @property {string} [currency]
 * @property {number} [leadTimeDays]
 * @property {string} [validUntil]          — ISO date
 * @property {string} [note]
 * @property {string} [rfqId]               — RFQ this quote answers
 * @property {string} receivedAt            — when we got the quote (ISO date)
 */

/**
 * A request for quotation: one item sent to several vendors; their replies
 * are VendorQuotes carrying this RFQ's id, compared side by side.
 * @typedef {Object} RfqRequest
 * @property {string} id
 * @property {string} [no]                  — human number (RFQ-YYYY-NNNN)
 * @property {string} itemName
 * @property {string} [materialId]
 * @property {number} [qty]
 * @property {string} [uom]
 * @property {string} [neededBy]            — ISO date
 * @property {string} [notes]
 * @property {string[]} vendorIds           — vendors we asked
 * @property {'draft'|'sent'|'closed'} status
 * @property {string} createdAt
 * @property {string} [sentAt]
 * @property {string} [createdById]
 */

export {}
