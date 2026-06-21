/** @type {import('./model.js').OutboundEmail[]} */
export const outboundEmails = []

/** @type {import('./model.js').InquiryMessage[]} */
export const inquiryMessages = [
  {
    id: 'msg-1',
    inquiryId: 'inq-seed-1',
    authorId: 'emp-4',
    authorLabel: 'Maria Dimitrova',
    body: 'Customer asked for a price for 4000 pcs/year. @Alex can you confirm the tube spec before we cost it?',
    tags: ['pricing'],
    mentions: ['emp-1'],
    createdAt: '2026-05-08T09:15:00.000Z',
  },
  {
    id: 'msg-2',
    inquiryId: 'inq-seed-1',
    authorId: 'emp-1',
    authorLabel: 'Alex Rivers',
    body: 'Confirmed Ø25×1.5 S235. Powder coat RAL 9005. No blockers on our side.',
    tags: ['technical'],
    mentions: [],
    createdAt: '2026-05-08T11:40:00.000Z',
  },
]
