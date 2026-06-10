/** @type {import('./model.js').BomHeader[]} */
export const bomHeaders = [
  {
    id: 'bom-1',
    productId: 'prod-1',
    qtyPerBom: 1,
    uom: 'ea',
    type: 'manufacture',
    version: 1,
    active: true,
    notes: 'ADILS steel leg — standard tube-leg run.',
  },
  {
    id: 'bom-2',
    productId: 'prod-2',
    qtyPerBom: 1,
    uom: 'ea',
    type: 'manufacture',
    version: 2,
    active: true,
    notes: 'LERBERG side frame — rev 2 removes a separate drilling step.',
  },
  {
    id: 'bom-3',
    productId: 'prod-pkg-1',
    qtyPerBom: 1,
    uom: 'ea',
    type: 'manufacture',
    version: 1,
    active: true,
    notes: 'LERBERG frame set — manufactured frame plus purchased fittings/carton.',
  },
]

/** @type {import('./model.js').BomLine[]} */
export const bomLines = [
  // prod-1 (ADILS Table Leg) components
  { id: 'bl-1', bomId: 'bom-1', sequence: 1, componentId: 'prod-rm-1', qty: 2.4, uom: 'kg',  bomOperationId: 'bop-1', fromStoreId: 'store-raw',  leadTimeDays: 5,  notes: '6 m bars; cutting yield ≈ 85 %' },
  { id: 'bl-2', bomId: 'bom-1', sequence: 2, componentId: 'prod-rm-2', qty: 8,   uom: 'ea',  bomOperationId: 'bop-3', fromStoreId: 'store-raw',  leadTimeDays: 2  },

  // prod-2 (LERBERG Side Frame) components
  { id: 'bl-3', bomId: 'bom-2', sequence: 1, componentId: 'prod-rm-3', qty: 1, uom: 'ea', bomOperationId: 'bop-5', fromStoreId: 'store-pcb',  leadTimeDays: 10 },
  { id: 'bl-4', bomId: 'bom-2', sequence: 2, componentId: 'prod-rm-4', qty: 1, uom: 'ea', bomOperationId: 'bop-5', fromStoreId: 'store-pcb',  leadTimeDays: 7  },

  // prod-pkg-1 (LERBERG Frame Set) — manufactured + purchased mix
  { id: 'bl-5', bomId: 'bom-3', sequence: 1, componentId: 'prod-2',    qty: 1, uom: 'ea', bomOperationId: 'bop-7', fromStoreId: 'store-wip',  leadTimeDays: 0,  notes: 'Manufactured in-house' },
  { id: 'bl-6', bomId: 'bom-3', sequence: 2, componentId: 'prod-rm-5', qty: 1, uom: 'ea', bomOperationId: 'bop-7', fromStoreId: 'store-raw',  leadTimeDays: 3,  notes: 'Externally sourced' },
]

/** @type {import('./model.js').BomOperation[]} */
export const bomOperations = [
  // prod-1 routing
  { id: 'bop-1', bomId: 'bom-1', sequence: 1, name: 'Tube cutting',        workcenterId: 'mach-1', setupMinutes: 15, cycleMinutes: 48 },
  { id: 'bop-2', bomId: 'bom-1', sequence: 2, name: 'Weld mounting plate',          workcenterId: 'mach-2', setupMinutes: 5,  cycleMinutes: 12 },
  { id: 'bop-3', bomId: 'bom-1', sequence: 3, name: 'Powder coating',        workcenterId: 'mach-3', setupMinutes: 10, cycleMinutes: 35 },
  { id: 'bop-4', bomId: 'bom-1', sequence: 4, name: 'Final inspection & pack', workcenterId: null,     setupMinutes: 5,  cycleMinutes: 20 },

  // prod-2 routing
  { id: 'bop-5', bomId: 'bom-2', sequence: 1, name: 'Press & bend', workcenterId: 'mach-4', setupMinutes: 30, cycleMinutes: 55 },
  { id: 'bop-6', bomId: 'bom-2', sequence: 2, name: 'Weld seam inspection',        workcenterId: 'mach-4', setupMinutes: 5,  cycleMinutes: 18 },

  // prod-pkg-1 routing
  { id: 'bop-7', bomId: 'bom-3', sequence: 1, name: 'Retail packing', workcenterId: null, setupMinutes: 5, cycleMinutes: 10 },
]
