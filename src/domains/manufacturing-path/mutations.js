import { selectOperationById, selectOperationsByProduct } from '../operations/selectors.js'
import { selectPathLinkByProduct } from './selectors.js'

let pathTemplateCounter = 300

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} productId
 * @param {string} name
 * @returns {string}
 */
function ensureTemplateId(db, productId, name) {
  const linked = selectPathLinkByProduct(db, productId)
  if (linked) return linked.pathTemplateId
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `path-${slug || 'custom'}-${++pathTemplateCounter}`
}

/**
 * @param {import('./model.js').PathGraphNode[]} nodes
 * @param {import('./model.js').PathGraphEdge[]} edges
 * @returns {string[]}
 */
function orderedNodeIdsFromGraph(nodes, edges) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const outgoing = Object.fromEntries(nodes.map((n) => [n.id, /** @type {string[]} */ ([]) ]))
  const incomingCount = Object.fromEntries(nodes.map((n) => [n.id, 0]))
  for (const edge of edges) {
    if (!byId[edge.source] || !byId[edge.target]) continue
    outgoing[edge.source].push(edge.target)
    incomingCount[edge.target] += 1
  }

  /** @type {string[]} */
  const queue = nodes
    .filter((n) => n.data.kind === 'start' || incomingCount[n.id] === 0)
    .sort((a, b) => a.position.x - b.position.x)
    .map((n) => n.id)
  /** @type {string[]} */
  const ordered = []
  /** @type {Set<string>} */
  const seen = new Set()

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || seen.has(current)) continue
    seen.add(current)
    ordered.push(current)
    const next = outgoing[current]
      .map((id) => byId[id])
      .filter(Boolean)
      .sort((a, b) => a.position.x - b.position.x)
      .map((n) => n.id)
    for (const nid of next) {
      if (!seen.has(nid)) queue.push(nid)
    }
  }
  return ordered
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} productId
 * @param {import('./model.js').PathGraphNode[]} nodes
 * @param {import('./model.js').PathGraphEdge[]} edges
 * @returns {string[]}
 */
function deriveOperationStepCodes(db, productId, nodes, edges) {
  const orderedNodeIds = orderedNodeIdsFromGraph(nodes, edges)
  /** @type {Set<string>} */
  const stepCodes = new Set()
  for (const nodeId of orderedNodeIds) {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node || node.data.kind !== 'operation' || !node.data.operationId) continue
    const operation = selectOperationById(db, node.data.operationId)
    if (operation && operation.productId === productId) stepCodes.add(operation.stepCode)
  }
  if (stepCodes.size > 0) return [...stepCodes]

  return nodes
    .filter((n) => n.data.kind === 'operation' && n.data.operationId)
    .sort((a, b) => a.position.x - b.position.x)
    .map((n) => selectOperationById(db, n.data.operationId ?? ''))
    .filter((op) => Boolean(op) && op.productId === productId)
    .map((op) => op.stepCode)
}

/**
 * Save visual path graph and link it to a product.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{
 *  productId: string
 *  name: string
 *  description?: string
 *  graphNodes: import('./model.js').PathGraphNode[]
 *  graphEdges: import('./model.js').PathGraphEdge[]
 * }} input
 */
export function upsertProductPathTemplate(db, input) {
  const errors = []
  if (!db.products.some((p) => p.id === input.productId)) errors.push('product_invalid')
  if (!input.name?.trim()) errors.push('name_required')
  if (!Array.isArray(input.graphNodes) || input.graphNodes.length < 2) errors.push('graph_nodes_invalid')
  if (!Array.isArray(input.graphEdges)) errors.push('graph_edges_invalid')
  if (errors.length > 0) return { ok: false, errors }

  const productOps = selectOperationsByProduct(db, input.productId)
  const validOperationIds = new Set(productOps.map((op) => op.id))
  const invalidOpNode = input.graphNodes.find(
    (node) => node.data.kind === 'operation' && node.data.operationId && !validOperationIds.has(node.data.operationId),
  )
  if (invalidOpNode) return { ok: false, errors: ['operation_node_product_mismatch'] }

  const templateId = ensureTemplateId(db, input.productId, input.name)
  const stepCodes = deriveOperationStepCodes(db, input.productId, input.graphNodes, input.graphEdges)
  /** @type {import('./model.js').ManufacturingPathTemplate} */
  const template = {
    id: templateId,
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    operationStepCodes: stepCodes,
    graphNodes: structuredClone(input.graphNodes),
    graphEdges: structuredClone(input.graphEdges),
  }

  const existingTemplateIdx = db.pathTemplates.findIndex((t) => t.id === templateId)
  if (existingTemplateIdx >= 0) db.pathTemplates[existingTemplateIdx] = template
  else db.pathTemplates.push(template)

  const existingLink = selectPathLinkByProduct(db, input.productId)
  if (existingLink) existingLink.pathTemplateId = templateId
  else db.productPathLinks.push({ productId: input.productId, pathTemplateId: templateId })

  return { ok: true, template, productId: input.productId }
}
