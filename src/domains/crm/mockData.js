/** @type {import('./model.js').Client[]} */
export const clients = [
  {
    id: 'client-1',
    name: 'IKEA Supply AG',
    segment: 'Retail furniture',
    region: 'CH',
    notes: 'Frame agreement; weekly call-offs against rolling forecast.',
    companyName: 'IKEA Supply AG',
    vat: 'CHE-116.302.213 MWST',
    address: 'Grüssenweg 25',
    city: 'Pratteln',
    postCode: '4133',
    country: 'Switzerland',
    email: 'supply.orders@ikea.com',
    contactName: 'Ingrid Lund',
    contactEmail: 'ingrid.lund@ikea.com',
    contacts: [
      { id: 'cct-1-1', name: 'Ingrid Lund', title: 'Ms.', email: 'ingrid.lund@ikea.com', phone: '+41 61 555 01 22' },
      { id: 'cct-1-2', name: 'Johan Pettersson', title: 'Mr.', email: 'johan.pettersson@ikea.com' },
    ],
    addresses: [
      { id: 'cad-1-1', label: 'HQ Pratteln', address: 'Grüssenweg 25', city: 'Pratteln', postCode: '4133', country: 'Switzerland' },
      { id: 'cad-1-2', label: 'DC Älmhult', address: 'Ikeagatan 1', city: 'Älmhult', postCode: '343 81', country: 'Sweden' },
    ],
  },
  {
    id: 'client-2',
    name: 'IKEA Components',
    segment: 'Retail furniture',
    region: 'SK',
    companyName: 'IKEA Components s.r.o.',
    vat: 'SK2020298551',
    address: 'Továrenská 2614/19',
    city: 'Malacky',
    postCode: '901 01',
    country: 'Slovakia',
    email: 'components.orders@ikea.com',
    contactName: 'Klaus Werner',
    contactEmail: 'klaus.werner@ikea.com',
    contacts: [
      { id: 'cct-2-1', name: 'Klaus Werner', title: 'Mr.', email: 'klaus.werner@ikea.com', phone: '+421 34 555 0100' },
    ],
    addresses: [
      { id: 'cad-2-1', label: 'Plant Malacky', address: 'Továrenská 2614/19', city: 'Malacky', postCode: '901 01', country: 'Slovakia' },
    ],
  },
]

/** @type {import('./model.js').ClientOrder[]} */
export const clientOrders = [
  {
    id: 'ord-1',
    clientId: 'client-1',
    productId: 'prod-1',
    orderedAt: '2025-11-10',
    status: 'shipped',
    quoteId: 'quote-hist-1',
  },
  {
    id: 'ord-2',
    clientId: 'client-2',
    productId: 'prod-2',
    orderedAt: '2026-03-02',
    status: 'in_production',
    quoteId: 'quote-hist-2',
  },
]

/** @type {import('./model.js').OrderLine[]} */
export const orderLines = [
  { id: 'ol-1', orderId: 'ord-1', description: 'ADILS leg 70 cm — lot A', qty: 120, unitPrice: 48.5 },
  { id: 'ol-2', orderId: 'ord-1', description: 'Finish option — powder RAL 9016', qty: 120, unitPrice: 6.2 },
  { id: 'ol-3', orderId: 'ord-2', description: 'LERBERG side frame — batch', qty: 80, unitPrice: 112 },
]

/** @type {import('./model.js').OrderExecutionRecord[]} */
export const orderExecutionRecords = [
  { id: 'ex-1', orderId: 'ord-1', milestone: 'Material release', completedAt: '2025-11-12T08:00:00Z' },
  { id: 'ex-2', orderId: 'ord-1', milestone: 'First article', completedAt: '2025-12-01T14:30:00Z', notes: 'FAIR signed' },
  { id: 'ex-3', orderId: 'ord-2', milestone: 'Sheet blanks intake', completedAt: '2026-03-05T09:00:00Z' },
]

/** @type {import('./model.js').OrderMachineUsage[]} */
export const orderMachineUsages = [
  { id: 'mu-1', orderId: 'ord-1', machineId: 'mach-1', hours: 42 },
  { id: 'mu-2', orderId: 'ord-1', machineId: 'mach-2', hours: 11 },
  { id: 'mu-3', orderId: 'ord-2', machineId: 'mach-3', hours: 28 },
]

/** @type {import('./model.js').OrderTimeLog[]} */
export const orderTimeLogs = [
  { id: 'tl-1', orderId: 'ord-1', phase: 'Cutting & welding', plannedHours: 40, actualHours: 44 },
  { id: 'tl-2', orderId: 'ord-1', phase: 'QC', plannedHours: 8, actualHours: 7 },
  { id: 'tl-3', orderId: 'ord-2', phase: 'Press & bend', plannedHours: 36, actualHours: 30 },
]

/** @type {import('./model.js').OrderIssue[]} */
export const orderIssues = [
  {
    id: 'iss-1',
    orderId: 'ord-1',
    severity: 'medium',
    description: 'Powder adhesion defects on 3% of first article batch',
    reportedAt: '2025-11-28',
    status: 'resolved',
  },
  {
    id: 'iss-2',
    orderId: 'ord-2',
    severity: 'low',
    description: 'IKEA label stock mismatch — rework scheduled',
    reportedAt: '2026-03-20',
    status: 'open',
  },
]

/** @type {import('./model.js').Invoice[]} */
export const invoices = [
  {
    id: 'inv-1',
    orderId: 'ord-1',
    clientId: 'client-1',
    amount: 7200,
    issuedAt: '2025-12-15',
    dueAt: '2026-01-14',
  },
  {
    id: 'inv-2',
    orderId: 'ord-2',
    clientId: 'client-2',
    amount: 5600,
    issuedAt: '2026-03-25',
    dueAt: '2026-04-24',
  },
]

/** @type {import('./model.js').PaymentRecord[]} */
export const paymentRecords = [
  { id: 'pay-1', invoiceId: 'inv-1', clientId: 'client-1', amount: 7200, paidAt: '2026-01-10', daysLate: 0 },
  { id: 'pay-2', invoiceId: 'inv-2', clientId: 'client-2', amount: 2000, paidAt: '2026-04-28', daysLate: 4 },
]

/** @type {import('./model.js').SchematicDocument[]} */
export const schematicDocuments = [
  {
    id: 'sch-1',
    orderId: 'ord-1',
    clientId: 'client-1',
    title: 'ADILS leg weldment',
    revision: 'C',
    url: 'https://example.com/docs/adils-leg-revC.pdf',
  },
  {
    id: 'sch-2',
    orderId: 'ord-2',
    clientId: 'client-2',
    title: 'LERBERG frame bend drawing',
    revision: 'A',
    url: 'https://example.com/docs/lerberg-frame-A.pdf',
  },
]
