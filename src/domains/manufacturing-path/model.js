/**
 * @typedef {Object} PathGraphNodeData
 * @property {string} label
 * @property {'start' | 'sector' | 'operation' | 'machine' | 'end'} kind
 * @property {string} [operationId]
 * @property {string} [machineId]
 */

/**
 * @typedef {Object} PathGraphNode
 * @property {string} id
 * @property {{ x: number; y: number }} position
 * @property {PathGraphNodeData} data
 */

/**
 * @typedef {Object} PathGraphEdge
 * @property {string} id
 * @property {string} source
 * @property {string} target
 */

/**
 * Canonical manufacturing path template (routing) for a product family or SKU pattern.
 * @typedef {Object} ManufacturingPathTemplate
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string[]} operationStepCodes — ordered codes resolved in operations domain
 * @property {PathGraphNode[]} [graphNodes]
 * @property {PathGraphEdge[]} [graphEdges]
 */

/**
 * @typedef {Object} ProductPathLink
 * @property {string} productId
 * @property {string} pathTemplateId
 */
