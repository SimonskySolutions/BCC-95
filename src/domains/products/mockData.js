/** @type {import('./model.js').Product[]} */
export const products = [
  {
    id: 'prod-1',
    sku: 'SKU-1001',
    name: 'Precision Housing',
    status: 'active',
    description: 'CNC-machined aluminum housing',
    lifecyclePhaseId: 'production',
  },
  {
    id: 'prod-2',
    sku: 'SKU-1002',
    name: 'Control Module',
    status: 'active',
    description: 'PCBA + firmware bundle',
    lifecyclePhaseId: 'quality',
  },
  {
    id: 'prod-3',
    sku: 'SKU-1003',
    name: 'Legacy Bracket',
    status: 'archived',
    lifecyclePhaseId: 'released',
  },
]
