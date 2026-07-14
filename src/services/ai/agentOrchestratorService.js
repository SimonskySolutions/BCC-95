import { computeWorkloadByEmployee } from '../kpis/kpiCalculator.js'
import { selectOverdueTasks } from '../../domains/tasks/selectors.js'

/**
 * @typedef {'dashboard'|'products'|'tasks'|'planning'|'manufacturing'|'machines'|'purchase'|'shipping'|'people'|'quality'|'analytics'|'crm'|'quotations'} AgentModuleId
 */

/**
 * @typedef {Object} AgentAction
 * @property {string} id
 * @property {string} label
 * @property {'low'|'medium'|'high'} impact
 * @property {boolean} requiresApproval
 */

/**
 * @typedef {Object} AgentResult
 * @property {AgentModuleId} moduleId
 * @property {string} agentName
 * @property {string} summary
 * @property {string[]} recommendations
 * @property {AgentAction[]} actions
 */

/** @type {AgentModuleId[]} */
export const AI_AGENT_MODULES = [
  'dashboard',
  'products',
  'tasks',
  'planning',
  'manufacturing',
  'machines',
  'purchase',
  'shipping',
  'people',
  'quality',
  'analytics',
  'crm',
  'quotations',
]

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {AgentModuleId} moduleId
 * @returns {AgentResult}
 */
export function runModuleAgent(db, moduleId) {
  const today = new Date('2026-04-10')
  switch (moduleId) {
    case 'tasks': {
      const overdue = selectOverdueTasks(db, today)
      const blocked = db.tasks.filter((t) => t.status === 'blocked')
      return {
        moduleId,
        agentName: 'Tasks Agent',
        summary: `${overdue.length} overdue and ${blocked.length} blocked tasks detected.`,
        recommendations: [
          overdue.length > 0
            ? `Prioritize overdue tasks for the next 48 hours (${overdue.slice(0, 3).map((t) => t.id).join(', ')})`
            : 'No overdue tasks right now.',
          blocked.length > 0
            ? `Review blockers with owners: ${blocked.slice(0, 3).map((t) => t.id).join(', ')}`
            : 'No blocked tasks right now.',
        ],
        actions: [
          {
            id: 'tasks_start_drafts',
            label: 'Move draft tasks due within 7 days to in_progress',
            impact: 'medium',
            requiresApproval: true,
          },
        ],
      }
    }
    case 'planning': {
      const conflicts = db.stationAssignments.filter((assignment) =>
        db.stationAssignments.some(
          (other) =>
            other.id !== assignment.id &&
            other.date === assignment.date &&
            (other.employeeId === assignment.employeeId || other.stationCode === assignment.stationCode),
        ),
      )
      return {
        moduleId,
        agentName: 'Planning Agent',
        summary: `${conflicts.length} potential assignment conflicts found.`,
        recommendations: [
          conflicts.length > 0
            ? 'Rebalance duplicated employee/station assignments on the same date.'
            : 'No immediate assignment conflicts.',
          'Use shift templates as default and only override by exception.',
        ],
        actions: [
          {
            id: 'planning_balance_unassigned',
            label: 'Auto-assign unassigned employees to least-loaded shift',
            impact: 'high',
            requiresApproval: true,
          },
        ],
      }
    }
    case 'manufacturing': {
      const blocked = db.operations.filter((operation) => operation.status === 'blocked')
      const queued = db.operations.filter((operation) => operation.status === 'queued')
      return {
        moduleId,
        agentName: 'Manufacturing Agent',
        summary: `${blocked.length} blocked and ${queued.length} queued operations.`,
        recommendations: [
          blocked.length > 0
            ? `Escalate blocked operations: ${blocked.slice(0, 3).map((op) => op.id).join(', ')}`
            : 'No blocked operations now.',
          'Promote critical queued operations with available machine + owner.',
        ],
        actions: [
          {
            id: 'manufacturing_start_queued',
            label: 'Start top 5 queued operations with owners',
            impact: 'medium',
            requiresApproval: true,
          },
        ],
      }
    }
    case 'machines': {
      const down = db.machines.filter((machine) => machine.status === 'down')
      return {
        moduleId,
        agentName: 'Machines Agent',
        summary: `${down.length} machines in down status.`,
        recommendations: [
          down.length > 0
            ? `Plan maintenance for ${down.slice(0, 3).map((machine) => machine.name).join(', ')}`
            : 'Machine availability is stable.',
          'Route high-risk quality operations away from unstable machines.',
        ],
        actions: [],
      }
    }
    case 'purchase': {
      const openPos = db.purchaseOrders.filter((po) => po.status === 'sent' || po.status === 'partial')
      return {
        moduleId,
        agentName: 'Purchase Agent',
        summary: `${openPos.length} purchase orders still open.`,
        recommendations: [
          openPos.length > 0
            ? `Follow up open POs: ${openPos.slice(0, 3).map((po) => po.id).join(', ')}`
            : 'No pending supplier follow-ups.',
          'Trigger RFQ early for materials with repeated partial receipts.',
        ],
        actions: [
          {
            id: 'purchase_close_received',
            label: 'Auto-close POs with receipts and matching invoice',
            impact: 'medium',
            requiresApproval: true,
          },
        ],
      }
    }
    case 'shipping': {
      const blocked = db.shipments.filter((shipment) => shipment.status === 'blocked')
      const ready = db.shipments.filter((shipment) => shipment.status === 'ready')
      return {
        moduleId,
        agentName: 'Shipping Agent',
        summary: `${ready.length} ready and ${blocked.length} blocked shipments.`,
        recommendations: [
          ready.length > 0 ? 'Prioritize ready shipments by promised date.' : 'No ready shipments pending dispatch.',
          blocked.length > 0 ? 'Clear QC and document blockers before dispatch window.' : 'No blocked shipments.',
        ],
        actions: [
          {
            id: 'shipping_dispatch_ready',
            label: 'Dispatch all ready shipments',
            impact: 'high',
            requiresApproval: true,
          },
        ],
      }
    }
    case 'crm': {
      const latePayments = db.paymentRecords.filter((payment) => payment.daysLate > 0)
      return {
        moduleId,
        agentName: 'CRM Agent',
        summary: `${latePayments.length} late payment records in client history.`,
        recommendations: [
          latePayments.length > 0
            ? `Flag clients with recurring late payments before new offers (${latePayments
                .slice(0, 3)
                .map((record) => record.clientId)
                .join(', ')})`
            : 'Payment behavior currently healthy.',
          'Reuse accepted quotations from similar clients to speed proposal cycle.',
        ],
        actions: [],
      }
    }
    case 'quotations': {
      const drafts = db.quoteDrafts.filter((quote) => quote.status === 'draft')
      const revision = db.quoteDrafts.filter((quote) => quote.status === 'revision_requested')
      return {
        moduleId,
        agentName: 'Quotation Agent',
        summary: `${drafts.length} draft and ${revision.length} revision-requested quotations.`,
        recommendations: [
          drafts.length > 0 ? 'Auto-build sent-ready packages for draft quotations with complete task gates.' : 'No draft backlog.',
          revision.length > 0 ? 'Prioritize quotations in revision_requested to preserve hit rate.' : 'No revisions pending.',
        ],
        actions: [
          {
            id: 'quotations_send_drafts',
            label: 'Mark all drafts as sent (with timestamp update)',
            impact: 'high',
            requiresApproval: true,
          },
        ],
      }
    }
    case 'products': {
      const blocked = db.productLifecycleStates.filter((state) => state.blocked)
      return {
        moduleId,
        agentName: 'Products Agent',
        summary: `${blocked.length} products are currently lifecycle-blocked.`,
        recommendations: [
          blocked.length > 0
            ? `Resolve blocked products first: ${blocked.slice(0, 3).map((state) => state.productId).join(', ')}`
            : 'No blocked lifecycle states.',
          'Enforce phase gate exit criteria in task planning reviews.',
        ],
        actions: [],
      }
    }
    case 'people': {
      const workloads = computeWorkloadByEmployee(db)
      if (workloads.length === 0) {
        return {
          moduleId,
          agentName: 'People Agent',
          summary: 'No assignable workload yet.',
          recommendations: [
            'Add employees and assign tasks to see workload balance.',
            'No rebalancing needed while the queue is empty.',
          ],
          actions: [],
        }
      }
      const max = workloads.reduce((a, b) => (a.openTaskCount > b.openTaskCount ? a : b), workloads[0])
      const min = workloads.reduce((a, b) => (a.openTaskCount < b.openTaskCount ? a : b), workloads[0])
      return {
        moduleId,
        agentName: 'People Agent',
        summary: `Workload spread is ${max.openTaskCount - min.openTaskCount} tasks between busiest and lightest assignee.`,
        recommendations: [
          'Rebalance assignments for next sprint planning to reduce queue variance.',
          `Candidate shift: move one low-priority task from ${max.employeeId} to ${min.employeeId}.`,
        ],
        actions: [],
      }
    }
    case 'quality': {
      const failures = db.qualityIncidents.filter((incident) => incident.failedFirstPass)
      return {
        moduleId,
        agentName: 'Quality Agent',
        summary: `${failures.length} first-pass failures tracked.`,
        recommendations: [
          failures.length > 0
            ? `Run containment on failed operations: ${failures.slice(0, 3).map((incident) => incident.operationId).join(', ')}`
            : 'First-pass quality trend is clean.',
          'Tie recurring defects to machine and owner coaching plans.',
        ],
        actions: [],
      }
    }
    case 'analytics':
      return {
        moduleId,
        agentName: 'Analytics Agent',
        summary: 'KPI feeds are ready for weekly executive pack.',
        recommendations: [
          'Track quote turnaround time and win-rate trend weekly.',
          'Monitor overdue and blocked task ratio by lifecycle phase.',
        ],
        actions: [],
      }
    case 'dashboard':
    default:
      return {
        moduleId: 'dashboard',
        agentName: 'Dashboard Agent',
        summary: 'Cross-module health snapshot generated.',
        recommendations: [
          'Review tasks, manufacturing, shipping, and quotations agents for top actions.',
          'Use approval gates for all high-impact autonomous actions.',
        ],
        actions: [],
      }
  }
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ goal: string }} input
 * @returns {{ selectedModules: AgentModuleId[]; explanation: string; results: AgentResult[] }}
 */
export function runAiOrchestrator(db, input) {
  const query = input.goal.trim().toLowerCase()
  if (!query) {
    const defaultModules = /** @type {AgentModuleId[]} */ (['dashboard', 'tasks', 'manufacturing', 'shipping', 'quotations'])
    return {
      selectedModules: defaultModules,
      explanation: 'No goal provided. Running default cross-functional agent set.',
      results: defaultModules.map((moduleId) => runModuleAgent(db, moduleId)),
    }
  }

  /** @type {Record<AgentModuleId, string[]>} */
  const keywords = {
    dashboard: ['overall', 'health', 'overview'],
    products: ['product', 'lifecycle', 'phase'],
    tasks: ['task', 'overdue', 'blocked', 'kanban'],
    planning: ['plan', 'schedule', 'shift', 'station'],
    manufacturing: ['manufacturing', 'operation', 'machine flow', 'path'],
    machines: ['machine', 'downtime', 'maintenance'],
    purchase: ['purchase', 'supplier', 'po', 'vendor', 'material'],
    shipping: ['shipping', 'dispatch', 'shipment', 'delivery'],
    people: ['people', 'employee', 'workload', 'team'],
    quality: ['quality', 'defect', 'incident'],
    analytics: ['kpi', 'analytics', 'report'],
    crm: ['client', 'crm', 'customer', 'payment'],
    quotations: ['quote', 'quotation', 'offer', 'pricing'],
  }

  /** @type {AgentModuleId[]} */
  const matched = AI_AGENT_MODULES.filter((moduleId) => keywords[moduleId].some((token) => query.includes(token)))
  const selectedModules = matched.length > 0 ? matched : /** @type {AgentModuleId[]} */ (['dashboard', 'tasks', 'quotations'])

  return {
    selectedModules,
    explanation:
      matched.length > 0
        ? `Matched goal against ${matched.length} module agents.`
        : 'No direct keyword match. Ran default business control agents.',
    results: selectedModules.map((moduleId) => runModuleAgent(db, moduleId)),
  }
}

/**
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {{ moduleId: AgentModuleId; actionId: string }} input
 * @returns {{ ok: true; message: string } | { ok: false; message: string }}
 */
export function applyAgentAction(db, input) {
  const todayIso = '2026-04-10'
  if (input.moduleId === 'tasks' && input.actionId === 'tasks_start_drafts') {
    const dueCutoff = new Date('2026-04-17')
    let updated = 0
    for (const task of db.tasks) {
      if (task.status !== 'draft') continue
      if (new Date(task.dueDate) > dueCutoff) continue
      task.status = 'in_progress'
      updated += 1
    }
    return { ok: true, message: `Updated ${updated} tasks to in_progress.` }
  }
  if (input.moduleId === 'manufacturing' && input.actionId === 'manufacturing_start_queued') {
    let updated = 0
    for (const operation of db.operations) {
      if (updated >= 5) break
      if (operation.status !== 'queued' || !operation.ownerId) continue
      operation.status = 'in_progress'
      updated += 1
    }
    return { ok: true, message: `Started ${updated} queued operations.` }
  }
  if (input.moduleId === 'shipping' && input.actionId === 'shipping_dispatch_ready') {
    let updated = 0
    for (const shipment of db.shipments) {
      if (shipment.status !== 'ready') continue
      shipment.status = 'dispatched'
      shipment.dispatchedAt = todayIso
      updated += 1
    }
    return { ok: true, message: `Dispatched ${updated} ready shipments.` }
  }
  if (input.moduleId === 'purchase' && input.actionId === 'purchase_close_received') {
    let updated = 0
    for (const po of db.purchaseOrders) {
      if (po.status !== 'partial' && po.status !== 'sent') continue
      const hasReceipt = db.goodsReceipts.some((receipt) => receipt.purchaseOrderId === po.id)
      const hasInvoice = db.vendorInvoices.some((invoice) => invoice.purchaseOrderId === po.id)
      if (!hasReceipt || !hasInvoice) continue
      po.status = 'closed'
      updated += 1
    }
    return { ok: true, message: `Closed ${updated} purchase orders.` }
  }
  if (input.moduleId === 'quotations' && input.actionId === 'quotations_send_drafts') {
    let updated = 0
    for (const quote of db.quoteDrafts) {
      if (quote.status !== 'draft') continue
      quote.status = 'sent'
      quote.updatedAt = todayIso
      updated += 1
    }
    return { ok: true, message: `Moved ${updated} quotations from draft to sent.` }
  }

  return { ok: false, message: 'Action is not available.' }
}
