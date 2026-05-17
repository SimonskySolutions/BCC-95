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
    notes: 'CNC-machined aluminium housing — standard single-cavity run.',
  },
  {
    id: 'bom-2',
    productId: 'prod-2',
    qtyPerBom: 1,
    uom: 'ea',
    type: 'manufacture',
    version: 2,
    active: true,
    notes: 'PCBA + firmware bundle — rev 2 eliminates through-hole step.',
  },
  {
    id: 'bom-3',
    productId: 'prod-pkg-1',
    qtyPerBom: 1,
    uom: 'ea',
    type: 'manufacture',
    version: 1,
    active: true,
    notes: 'Electronics Package A — includes manufactured Control Module and purchased ESD tray.',
  },
]

/** @type {import('./model.js').BomLine[]} */
export const bomLines = [
  // prod-1 (Precision Housing) components
  { id: 'bl-1', bomId: 'bom-1', sequence: 1, componentId: 'prod-rm-1', qty: 2.4, uom: 'kg',  bomOperationId: 'bop-1', fromStoreId: 'store-raw',  leadTimeDays: 5,  notes: 'Stock-size billet; yield ≈ 85 %' },
  { id: 'bl-2', bomId: 'bom-1', sequence: 2, componentId: 'prod-rm-2', qty: 8,   uom: 'ea',  bomOperationId: 'bop-3', fromStoreId: 'store-raw',  leadTimeDays: 2  },

  // prod-2 (Control Module) components
  { id: 'bl-3', bomId: 'bom-2', sequence: 1, componentId: 'prod-rm-3', qty: 1, uom: 'ea', bomOperationId: 'bop-5', fromStoreId: 'store-pcb',  leadTimeDays: 10 },
  { id: 'bl-4', bomId: 'bom-2', sequence: 2, componentId: 'prod-rm-4', qty: 1, uom: 'ea', bomOperationId: 'bop-5', fromStoreId: 'store-pcb',  leadTimeDays: 7  },

  // prod-pkg-1 (Electronics Package A) — manufactured + purchased mix
  { id: 'bl-5', bomId: 'bom-3', sequence: 1, componentId: 'prod-2',    qty: 1, uom: 'ea', bomOperationId: 'bop-7', fromStoreId: 'store-wip',  leadTimeDays: 0,  notes: 'Manufactured in-house' },
  { id: 'bl-6', bomId: 'bom-3', sequence: 2, componentId: 'prod-rm-5', qty: 1, uom: 'ea', bomOperationId: 'bop-7', fromStoreId: 'store-raw',  leadTimeDays: 3,  notes: 'Externally sourced' },
]

/** @type {import('./model.js').BomOperation[]} */
export const bomOperations = [
  // prod-1 routing
  { id: 'bop-1', bomId: 'bom-1', sequence: 1, name: 'CNC Mill',        workcenterId: 'mach-1', setupMinutes: 15, cycleMinutes: 48 },
  { id: 'bop-2', bomId: 'bom-1', sequence: 2, name: 'Deburr',          workcenterId: 'mach-2', setupMinutes: 5,  cycleMinutes: 12 },
  { id: 'bop-3', bomId: 'bom-1', sequence: 3, name: 'Assembly',        workcenterId: 'mach-3', setupMinutes: 10, cycleMinutes: 35 },
  { id: 'bop-4', bomId: 'bom-1', sequence: 4, name: 'Functional Test', workcenterId: null,     setupMinutes: 5,  cycleMinutes: 20 },

  // prod-2 routing
  { id: 'bop-5', bomId: 'bom-2', sequence: 1, name: 'SMT Place', workcenterId: 'mach-4', setupMinutes: 30, cycleMinutes: 55 },
  { id: 'bop-6', bomId: 'bom-2', sequence: 2, name: 'AOI',        workcenterId: 'mach-4', setupMinutes: 5,  cycleMinutes: 18 },

  // prod-pkg-1 routing
  { id: 'bop-7', bomId: 'bom-3', sequence: 1, name: 'Packaging', workcenterId: null, setupMinutes: 5, cycleMinutes: 10 },
]
