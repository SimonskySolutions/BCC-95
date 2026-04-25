/** @type {import('./model.js').Shipment[]} */
export const shipments = [
  {
    id: 'ship-1',
    orderId: 'ord-1',
    productId: 'prod-1',
    status: 'dispatched',
    readyAt: '2026-01-05',
    dispatchedAt: '2026-01-06',
    promisedDate: '2026-01-08',
  },
  {
    id: 'ship-2',
    orderId: 'ord-2',
    productId: 'prod-2',
    status: 'ready',
    readyAt: '2026-04-08',
    promisedDate: '2026-04-20',
  },
  {
    id: 'ship-3',
    orderId: 'ord-2',
    productId: 'prod-2',
    status: 'blocked',
    blockedReason: 'Awaiting final QC sign-off',
    promisedDate: '2026-04-22',
  },
]
