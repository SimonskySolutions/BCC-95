/** @type {import('./model.js').Vendor[]} */
export const vendors = [
  { id: 'ven-1', name: 'AluSource Metals', category: 'Raw materials', status: 'preferred' },
  { id: 'ven-2', name: 'FastFlex Logistics Supplies', category: 'Consumables', status: 'active' },
]

/** @type {import('./model.js').Material[]} */
export const materials = [
  { id: 'mat-1', sku: 'AL-6061-PL', name: '6061 plate 12mm', uom: 'kg' },
  { id: 'mat-2', sku: 'PKG-ESD-01', name: 'ESD tray', uom: 'ea' },
]

/** @type {import('./model.js').PurchaseOrder[]} */
export const purchaseOrders = [
  { id: 'po-1', vendorId: 'ven-1', orderedAt: '2026-03-01', status: 'received' },
  { id: 'po-2', vendorId: 'ven-2', orderedAt: '2026-04-02', status: 'partial' },
  { id: 'po-3', vendorId: 'ven-1', orderedAt: '2026-04-08', status: 'sent' },
]

/** @type {import('./model.js').PurchaseOrderLine[]} */
export const purchaseOrderLines = [
  { id: 'pol-1', purchaseOrderId: 'po-1', materialId: 'mat-1', qty: 500, unitCost: 2.4 },
  { id: 'pol-2', purchaseOrderId: 'po-2', materialId: 'mat-2', qty: 2000, unitCost: 0.35 },
  { id: 'pol-3', purchaseOrderId: 'po-3', materialId: 'mat-1', qty: 320, unitCost: 2.55 },
]

/** @type {import('./model.js').GoodsReceipt[]} */
export const goodsReceipts = [
  { id: 'gr-1', purchaseOrderId: 'po-1', receivedAt: '2026-03-10', lineId: 'pol-1' },
  { id: 'gr-2', purchaseOrderId: 'po-2', receivedAt: '2026-04-05', lineId: 'pol-2' },
]

/** @type {import('./model.js').VendorInvoice[]} */
export const vendorInvoices = [
  { id: 'vinv-1', vendorId: 'ven-1', purchaseOrderId: 'po-1', amount: 1200, issuedAt: '2026-03-11' },
  { id: 'vinv-2', vendorId: 'ven-2', purchaseOrderId: 'po-2', amount: 420, issuedAt: '2026-04-06' },
]
