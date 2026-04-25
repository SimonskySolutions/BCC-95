import { selectProductById } from '../domains/products/selectors.js'
import { selectLifecycleStateByProduct } from '../domains/lifecycle/selectors.js'
import { selectTasksByProduct } from '../domains/tasks/selectors.js'
import { selectOperationsByProduct } from '../domains/operations/selectors.js'
import { selectPathLinkByProduct, selectPathTemplateById } from '../domains/manufacturing-path/selectors.js'
import { selectClientById, selectOrdersByClient } from '../domains/crm/selectors.js'
import { selectQuotesByProduct } from '../domains/quotations/selectors.js'
import { selectShipmentsByOrder } from '../domains/shipping/selectors.js'

/**
 * Product-centric bundle: one join surface; filtering stays in domain selectors.
 * @param {import('./mockDatabase.js').MockDatabase} db
 * @param {string} productId
 */
export function selectProductWorkspaceBundle(db, productId) {
  const product = selectProductById(db, productId)
  if (!product) return null
  const lifecycle = selectLifecycleStateByProduct(db, productId)
  const tasks = selectTasksByProduct(db, productId)
  const operations = selectOperationsByProduct(db, productId)
  const pathLink = selectPathLinkByProduct(db, productId)
  const pathTemplate = pathLink ? selectPathTemplateById(db, pathLink.pathTemplateId) : undefined
  return { product, lifecycle, tasks, operations, pathLink, pathTemplate }
}

/**
 * @param {import('./mockDatabase.js').MockDatabase} db
 */
export function listProductIds(db) {
  return db.products.map((p) => p.id)
}

/**
 * Join clients ↔ orders ↔ shipments ↔ quotes for a product.
 * @param {import('./mockDatabase.js').MockDatabase} db
 * @param {string} productId
 */
export function selectProductCommercialGraph(db, productId) {
  const quotes = selectQuotesByProduct(db, productId)
  const orders = db.clientOrders.filter((o) => o.productId === productId)
  const clientIds = [...new Set(orders.map((o) => o.clientId))]
  const clients = clientIds.map((id) => selectClientById(db, id)).filter(Boolean)
  const shipmentsByOrder = Object.fromEntries(
    orders.map((o) => [o.id, selectShipmentsByOrder(db, o.id)]),
  )
  return { productId, quotes, orders, clients, shipmentsByOrder }
}

/**
 * @param {import('./mockDatabase.js').MockDatabase} db
 * @param {string} clientId
 * @param {string} productId
 */
export function selectClientProductLinks(db, clientId, productId) {
  const client = selectClientById(db, clientId)
  if (!client) return null
  const orders = selectOrdersByClient(db, clientId).filter((o) => o.productId === productId)
  const quotes = selectQuotesByProduct(db, productId).filter((q) => q.clientId === clientId)
  return { client, orders, quotes }
}
