/** @type {import('./model.js').ManufacturingPathTemplate[]} */
export const pathTemplates = [
  {
    id: 'path-standard-machining',
    name: 'Standard machining + assembly',
    description: 'Mill → deburr → assemble → test',
    operationStepCodes: ['mill', 'deburr', 'assemble', 'test'],
  },
  {
    id: 'path-pcba',
    name: 'PCBA build',
    description: 'SMT → AOI → firmware → burn-in',
    operationStepCodes: ['smt', 'aoi', 'firmware', 'burn_in'],
  },
]

/** @type {import('./model.js').ProductPathLink[]} */
export const productPathLinks = [
  { productId: 'prod-1', pathTemplateId: 'path-standard-machining' },
  { productId: 'prod-2', pathTemplateId: 'path-pcba' },
  { productId: 'prod-3', pathTemplateId: 'path-standard-machining' },
]
