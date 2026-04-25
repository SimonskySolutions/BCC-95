/** @type {import('./model.js').QuoteDraft[]} */
export const quoteDrafts = [
  {
    id: 'quote-1',
    clientId: 'client-1',
    productId: 'prod-1',
    inquiryId: 'inq-seed-1',
    status: 'draft',
    subtotal: 0,
    marginPercent: 18,
    updatedAt: '2026-04-10',
    currency: 'EUR',
    language: 'en',
    currentVersionNo: 1,
    currentVersionId: 'qv-1-1',
  },
  {
    id: 'quote-hist-1',
    clientId: 'client-1',
    productId: 'prod-1',
    status: 'accepted',
    subtotal: 6564,
    marginPercent: 16,
    updatedAt: '2025-11-01',
    currency: 'EUR',
    language: 'en',
    unitPrice: 54.7,
    leadTimeDays: 45,
  },
  {
    id: 'quote-hist-2',
    clientId: 'client-2',
    productId: 'prod-2',
    status: 'accepted',
    subtotal: 8960,
    marginPercent: 20,
    updatedAt: '2026-02-15',
    currency: 'EUR',
    language: 'en',
    unitPrice: 112,
    leadTimeDays: 30,
  },
]

/** @type {import('./model.js').QuoteVersion[]} */
export const quoteVersions = [
  {
    id: 'qv-1-1',
    quoteId: 'quote-1',
    versionNo: 1,
    status: 'draft',
    createdAt: '2026-04-08T12:00:00.000Z',
    subtotal: 0,
    marginPercent: 18,
    currency: 'EUR',
    language: 'en',
    leadTimeDays: 40,
    validUntil: '2026-05-30',
    deliveryTerms: 'FCA Plovdiv (Incoterms 2020)',
    paymentTerms: '30 days net',
  },
]

/** @type {import('./model.js').QuoteLineItem[]} */
export const quoteLineItems = [
  {
    id: 'qli-1-1-1',
    quoteVersionId: 'qv-1-1',
    kind: 'material',
    description: 'Aluminum billet 6061-T6',
    quantity: 500,
    unitPrice: 4.2,
    totalPrice: 2100,
  },
  {
    id: 'qli-1-1-2',
    quoteVersionId: 'qv-1-1',
    kind: 'labor',
    description: 'CNC machining, 0.18 h/unit',
    quantity: 500,
    unitPrice: 9.5,
    totalPrice: 4750,
  },
  {
    id: 'qli-1-1-3',
    quoteVersionId: 'qv-1-1',
    kind: 'tooling',
    description: 'Fixture refresh (amortized)',
    quantity: 1,
    unitPrice: 450,
    totalPrice: 450,
  },
]

/** @type {import('./model.js').QuoteApproval[]} */
export const quoteApprovals = []

/** @type {import('./model.js').QuoteDocument[]} */
export const quoteDocuments = []

/** @type {import('./model.js').QuoteDecision[]} */
export const quoteDecisions = []
