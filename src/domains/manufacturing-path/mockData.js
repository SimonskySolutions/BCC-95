/** @type {import('./model.js').ManufacturingPathTemplate[]} */
export const pathTemplates = [
  {
    id: 'path-standard-machining',
    name: 'Tube leg line',
    description: 'Cut → weld → powder coat → inspect & pack',
    operationStepCodes: ['cut', 'weld', 'coat', 'pack'],
  },
  {
    id: 'path-press-shop',
    name: 'Press shop line',
    description: 'Press & bend → weld seam inspection',
    operationStepCodes: ['press', 'seam_check'],
  },
]

/** @type {import('./model.js').ProductPathLink[]} */
export const productPathLinks = [
  { productId: 'prod-1', pathTemplateId: 'path-standard-machining' },
  { productId: 'prod-2', pathTemplateId: 'path-press-shop' },
  { productId: 'prod-3', pathTemplateId: 'path-standard-machining' },
]
