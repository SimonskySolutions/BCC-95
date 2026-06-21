/** @type {import('./model.js').OutboundEmail[]} */
export const outboundEmails = []

/** @type {import('./model.js').InquiryMessage[]} */
export const inquiryMessages = [
  {
    id: 'msg-1',
    threadKey: 'quote-3',
    authorId: 'emp-4',
    authorLabel: 'Maria Dimitrova',
    body: 'Offer sent to IKEA. @Alex if the customer pushes back on price we may need to revisit the costing.',
    tags: ['pricing'],
    mentions: ['emp-1'],
    createdAt: '2026-05-05T09:15:00.000Z',
  },
  {
    id: 'msg-2',
    threadKey: 'quote-3',
    authorId: 'emp-1',
    authorLabel: 'Alex Rivers',
    body: 'Noted. Coating cost has room — I can shave it in a new version if needed.',
    tags: ['technical'],
    mentions: [],
    createdAt: '2026-05-05T11:40:00.000Z',
  },
]
