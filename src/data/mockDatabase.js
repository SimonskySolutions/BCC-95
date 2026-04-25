import { products } from '../domains/products/mockData.js'
import { productLifecycleStates } from '../domains/lifecycle/mockData.js'
import { tasks } from '../domains/tasks/mockData.js'
import { pathTemplates, productPathLinks } from '../domains/manufacturing-path/mockData.js'
import { operations } from '../domains/operations/mockData.js'
import { machines } from '../domains/machines/mockData.js'
import { employees } from '../domains/people/mockData.js'
import { kpiTargets, qualityIncidents } from '../domains/kpis/mockData.js'
import { plans } from '../domains/planning/mockData.js'
import { scheduleBuckets } from '../domains/scheduling/mockData.js'
import {
  shiftTemplates,
  shiftAssignments,
  stationAssignments,
  operationExecutionActuals,
} from '../domains/shifts/mockData.js'
import { standardCosts } from '../domains/costing/mockData.js'
import { telemetrySamples } from '../domains/iot/mockData.js'
import {
  clients,
  clientOrders,
  orderLines,
  orderExecutionRecords,
  orderMachineUsages,
  orderTimeLogs,
  orderIssues,
  invoices,
  paymentRecords,
  schematicDocuments,
} from '../domains/crm/mockData.js'
import { shipments } from '../domains/shipping/mockData.js'
import {
  vendors,
  materials,
  purchaseOrders,
  purchaseOrderLines,
  goodsReceipts,
  vendorInvoices,
} from '../domains/purchase/mockData.js'
import {
  quoteDrafts,
  quoteVersions,
  quoteLineItems,
  quoteApprovals,
  quoteDocuments,
  quoteDecisions,
} from '../domains/quotations/mockData.js'
import { inquiries } from '../domains/inquiries/mockData.js'
import { auditEntries } from '../domains/audit/mockData.js'
import { outboundEmails } from '../domains/communications/mockData.js'

/**
 * Single composed in-memory ERP database for UI and services.
 * @typedef {ReturnType<typeof createMockDatabase>} MockDatabase
 */

export function createMockDatabase() {
  return {
    products: structuredClone(products),
    productLifecycleStates: structuredClone(productLifecycleStates),
    tasks: structuredClone(tasks),
    pathTemplates: structuredClone(pathTemplates),
    productPathLinks: structuredClone(productPathLinks),
    operations: structuredClone(operations),
    machines: structuredClone(machines),
    employees: structuredClone(employees),
    kpiTargets: structuredClone(kpiTargets),
    qualityIncidents: structuredClone(qualityIncidents),
    plans: structuredClone(plans),
    scheduleBuckets: structuredClone(scheduleBuckets),
    shiftTemplates: structuredClone(shiftTemplates),
    shiftAssignments: structuredClone(shiftAssignments),
    stationAssignments: structuredClone(stationAssignments),
    operationExecutionActuals: structuredClone(operationExecutionActuals),
    standardCosts: structuredClone(standardCosts),
    telemetrySamples: structuredClone(telemetrySamples),
    clients: structuredClone(clients),
    clientOrders: structuredClone(clientOrders),
    orderLines: structuredClone(orderLines),
    orderExecutionRecords: structuredClone(orderExecutionRecords),
    orderMachineUsages: structuredClone(orderMachineUsages),
    orderTimeLogs: structuredClone(orderTimeLogs),
    orderIssues: structuredClone(orderIssues),
    invoices: structuredClone(invoices),
    paymentRecords: structuredClone(paymentRecords),
    schematicDocuments: structuredClone(schematicDocuments),
    shipments: structuredClone(shipments),
    vendors: structuredClone(vendors),
    materials: structuredClone(materials),
    purchaseOrders: structuredClone(purchaseOrders),
    purchaseOrderLines: structuredClone(purchaseOrderLines),
    goodsReceipts: structuredClone(goodsReceipts),
    vendorInvoices: structuredClone(vendorInvoices),
    quoteDrafts: structuredClone(quoteDrafts),
    quoteVersions: structuredClone(quoteVersions),
    quoteLineItems: structuredClone(quoteLineItems),
    quoteApprovals: structuredClone(quoteApprovals),
    quoteDocuments: structuredClone(quoteDocuments),
    quoteDecisions: structuredClone(quoteDecisions),
    inquiries: structuredClone(inquiries),
    auditEntries: structuredClone(auditEntries),
    outboundEmails: structuredClone(outboundEmails),
  }
}

/** @type {MockDatabase | null} */
let singleton = null

/** Shared read-only default instance for React tree (reset in tests via resetMockDatabase). */
export function getMockDatabase() {
  if (!singleton) singleton = createMockDatabase()
  return singleton
}

export function resetMockDatabase() {
  singleton = createMockDatabase()
}
