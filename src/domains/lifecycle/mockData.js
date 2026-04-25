/** @type {import('./model.js').ProductLifecycleState[]} */
export const productLifecycleStates = [
  {
    productId: 'prod-1',
    phaseId: 'production',
    completionPercent: 82,
    blocked: false,
    pendingApprovalStages: [],
    completedGates: ['design_signoff'],
  },
  {
    productId: 'prod-2',
    phaseId: 'quality',
    completionPercent: 55,
    blocked: true,
    pendingApprovalStages: ['quality'],
    completedGates: ['design_signoff', 'proto_validation'],
  },
  {
    productId: 'prod-3',
    phaseId: 'released',
    completionPercent: 100,
    blocked: false,
    pendingApprovalStages: [],
    completedGates: ['design_signoff', 'quality_signoff'],
  },
]
