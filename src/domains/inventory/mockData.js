/** @type {import('./model.js').StockLocation[]} */
export const stockLocations = [
  { id: 'loc-sup',   name: 'Suppliers',        code: 'VIRTUAL/SUP',   type: 'supplier' },
  { id: 'loc-cust',  name: 'Customers',         code: 'VIRTUAL/CUST',  type: 'customer' },
  { id: 'loc-raw',   name: 'Raw Materials',     code: 'WH/RAW',        type: 'internal', usage: 'raw_material' },
  { id: 'loc-wip',   name: 'Work in Progress',  code: 'WH/WIP',        type: 'internal', usage: 'wip' },
  { id: 'loc-fg',    name: 'Finished Goods',    code: 'WH/FG',         type: 'internal', usage: 'finished_good' },
  { id: 'loc-scrap', name: 'Scrap',             code: 'VIRTUAL/SCRAP', type: 'virtual' },
]

/** @type {import('./model.js').StockQuant[]} */
export const stockQuants = [
  // Raw materials
  { id: 'sq-1', productId: 'prod-rm-1', locationId: 'loc-raw', qty: 180, reservedQty: 20,  uom: 'kg',  lastUpdated: '2026-04-22' },
  { id: 'sq-2', productId: 'prod-rm-2', locationId: 'loc-raw', qty: 500, reservedQty: 50,  uom: 'ea',  lastUpdated: '2026-04-22' },
  { id: 'sq-3', productId: 'prod-rm-3', locationId: 'loc-raw', qty: 40,  reservedQty: 5,   uom: 'ea',  lastUpdated: '2026-04-20' },
  { id: 'sq-4', productId: 'prod-rm-4', locationId: 'loc-raw', qty: 40,  reservedQty: 5,   uom: 'ea',  lastUpdated: '2026-04-20' },
  { id: 'sq-5', productId: 'prod-rm-5', locationId: 'loc-raw', qty: 200, reservedQty: 0,   uom: 'ea',  lastUpdated: '2026-04-18' },

  // WIP (fabrications in progress)
  { id: 'sq-6', productId: 'prod-1', locationId: 'loc-wip', qty: 12, reservedQty: 0, uom: 'ea', lastUpdated: '2026-04-25' },
  { id: 'sq-7', productId: 'prod-2', locationId: 'loc-wip', qty: 8,  reservedQty: 0, uom: 'ea', lastUpdated: '2026-04-24' },

  // Finished goods
  { id: 'sq-8', productId: 'prod-1',     locationId: 'loc-fg', qty: 25, reservedQty: 10, uom: 'ea', lastUpdated: '2026-04-26' },
  { id: 'sq-9', productId: 'prod-pkg-1', locationId: 'loc-fg', qty: 5,  reservedQty: 2,  uom: 'ea', lastUpdated: '2026-04-27' },
]

/** @type {import('./model.js').StockMove[]} */
export const stockMoves = [
  // Goods receipt from supplier → raw materials
  { id: 'sm-1', productId: 'prod-rm-1', fromLocationId: 'loc-sup',  toLocationId: 'loc-raw',  qty: 200, uom: 'kg',  state: 'done', origin: 'PO-001', date: '2026-04-10' },
  { id: 'sm-2', productId: 'prod-rm-3', fromLocationId: 'loc-sup',  toLocationId: 'loc-raw',  qty: 50,  uom: 'ea',  state: 'done', origin: 'PO-002', date: '2026-04-12' },
  { id: 'sm-3', productId: 'prod-rm-4', fromLocationId: 'loc-sup',  toLocationId: 'loc-raw',  qty: 50,  uom: 'ea',  state: 'done', origin: 'PO-002', date: '2026-04-12' },

  // Manufacturing consumption: raw → WIP
  { id: 'sm-4', productId: 'prod-rm-1', fromLocationId: 'loc-raw',  toLocationId: 'loc-wip',  qty: 20,  uom: 'kg',  state: 'done', origin: 'MO-001', date: '2026-04-15' },
  { id: 'sm-5', productId: 'prod-rm-2', fromLocationId: 'loc-raw',  toLocationId: 'loc-wip',  qty: 80,  uom: 'ea',  state: 'done', origin: 'MO-001', date: '2026-04-15' },
  { id: 'sm-6', productId: 'prod-rm-3', fromLocationId: 'loc-raw',  toLocationId: 'loc-wip',  qty: 10,  uom: 'ea',  state: 'done', origin: 'MO-002', date: '2026-04-16' },
  { id: 'sm-7', productId: 'prod-rm-4', fromLocationId: 'loc-raw',  toLocationId: 'loc-wip',  qty: 10,  uom: 'ea',  state: 'done', origin: 'MO-002', date: '2026-04-16' },

  // Production output: WIP → finished goods
  { id: 'sm-8', productId: 'prod-1', fromLocationId: 'loc-wip',  toLocationId: 'loc-fg',   qty: 10, uom: 'ea', state: 'done', origin: 'MO-001', date: '2026-04-18' },
  { id: 'sm-9', productId: 'prod-2', fromLocationId: 'loc-wip',  toLocationId: 'loc-fg',   qty: 8,  uom: 'ea', state: 'done', origin: 'MO-002', date: '2026-04-20' },

  // Delivery to customer: FG → customer
  { id: 'sm-10', productId: 'prod-1', fromLocationId: 'loc-fg', toLocationId: 'loc-cust', qty: 8,  uom: 'ea', state: 'done', origin: 'SO-001', date: '2026-04-22' },

  // Packaging assembly: FG → FG (pkg)
  { id: 'sm-11', productId: 'prod-pkg-1', fromLocationId: 'loc-wip', toLocationId: 'loc-fg', qty: 5, uom: 'ea', state: 'done', origin: 'MO-003', date: '2026-04-27' },

  // Pending moves (confirmed, not done yet)
  { id: 'sm-12', productId: 'prod-rm-1', fromLocationId: 'loc-sup',  toLocationId: 'loc-raw', qty: 100, uom: 'kg', state: 'confirmed', origin: 'PO-003', date: '2026-04-30' },
]
