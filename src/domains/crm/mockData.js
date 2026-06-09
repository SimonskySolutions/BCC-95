/** @type {import('./model.js').Client[]} */
export const clients = [
  {
    id: 'client-1',
    name: 'Nordic Rail AS',
    segment: 'OEM',
    region: 'NO',
    notes: 'Prefers quarterly billing.',
    companyName: 'Nordic Rail AS',
    vat: 'NO123456789MVA',
    address: 'Jernbaneveien 12',
    city: 'Oslo',
    postCode: '0154',
    country: 'Norway',
    email: 'orders@nordicrail.no',
    contactName: 'Astrid Hansen',
    contactEmail: 'astrid.hansen@nordicrail.no',
    contacts: [
      { id: 'cct-1-1', name: 'Astrid Hansen', title: 'Ms.', email: 'astrid.hansen@nordicrail.no', phone: '+47 22 00 11 22' },
      { id: 'cct-1-2', name: 'Lars Berg', title: 'Mr.', email: 'lars.berg@nordicrail.no' },
    ],
    addresses: [
      { id: 'cad-1-1', label: 'HQ', address: 'Jernbaneveien 12', city: 'Oslo', postCode: '0154', country: 'Norway' },
      { id: 'cad-1-2', label: 'Warehouse', address: 'Havnegata 4', city: 'Drammen', postCode: '3040', country: 'Norway' },
    ],
  },
  {
    id: 'client-2',
    name: 'BrightCell Energy',
    segment: 'Energy',
    region: 'DE',
    companyName: 'BrightCell Energy GmbH',
    vat: 'DE298765432',
    address: 'Industriestraße 88',
    city: 'München',
    postCode: '80339',
    country: 'Germany',
    email: 'procurement@brightcell.de',
    contactName: 'Markus Weber',
    contactEmail: 'markus.weber@brightcell.de',
    contacts: [
      { id: 'cct-2-1', name: 'Markus Weber', title: 'Mr.', email: 'markus.weber@brightcell.de', phone: '+49 89 555 0100' },
    ],
    addresses: [
      { id: 'cad-2-1', label: 'Plant', address: 'Industriestraße 88', city: 'München', postCode: '80339', country: 'Germany' },
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
  { id: 'ol-1', orderId: 'ord-1', description: 'Housing lot A', qty: 120, unitPrice: 48.5 },
  { id: 'ol-2', orderId: 'ord-1', description: 'Finish option — anodized', qty: 120, unitPrice: 6.2 },
  { id: 'ol-3', orderId: 'ord-2', description: 'Control module assembly', qty: 80, unitPrice: 112 },
]

/** @type {import('./model.js').OrderExecutionRecord[]} */
export const orderExecutionRecords = [
  { id: 'ex-1', orderId: 'ord-1', milestone: 'Material release', completedAt: '2025-11-12T08:00:00Z' },
  { id: 'ex-2', orderId: 'ord-1', milestone: 'First article', completedAt: '2025-12-01T14:30:00Z', notes: 'FAIR signed' },
  { id: 'ex-3', orderId: 'ord-2', milestone: 'PCBA intake', completedAt: '2026-03-05T09:00:00Z' },
]

/** @type {import('./model.js').OrderMachineUsage[]} */
export const orderMachineUsages = [
  { id: 'mu-1', orderId: 'ord-1', machineId: 'mach-1', hours: 42 },
  { id: 'mu-2', orderId: 'ord-1', machineId: 'mach-2', hours: 11 },
  { id: 'mu-3', orderId: 'ord-2', machineId: 'mach-3', hours: 28 },
]

/** @type {import('./model.js').OrderTimeLog[]} */
export const orderTimeLogs = [
  { id: 'tl-1', orderId: 'ord-1', phase: 'Machining', plannedHours: 40, actualHours: 44 },
  { id: 'tl-2', orderId: 'ord-1', phase: 'QC', plannedHours: 8, actualHours: 7 },
  { id: 'tl-3', orderId: 'ord-2', phase: 'Assembly', plannedHours: 36, actualHours: 30 },
]

/** @type {import('./model.js').OrderIssue[]} */
export const orderIssues = [
  {
    id: 'iss-1',
    orderId: 'ord-1',
    severity: 'medium',
    description: 'Surface porosity on 3% of first article batch',
    reportedAt: '2025-11-28',
    status: 'resolved',
  },
  {
    id: 'iss-2',
    orderId: 'ord-2',
    severity: 'low',
    description: 'Label stock mismatch — rework scheduled',
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
    title: 'Housing assembly',
    revision: 'C',
    url: 'https://example.com/docs/housing-revC.pdf',
  },
  {
    id: 'sch-2',
    orderId: 'ord-2',
    clientId: 'client-2',
    title: 'Module interconnect',
    revision: 'A',
    url: 'https://example.com/docs/module-interconnect-A.pdf',
  },
]
