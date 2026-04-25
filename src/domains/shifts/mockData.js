/** @type {import('./model.js').ShiftTemplate[]} */
export const shiftTemplates = [
  { id: 'shift-a', label: 'A', startTime: '06:00', endTime: '14:00' },
  { id: 'shift-b', label: 'B', startTime: '14:00', endTime: '22:00' },
  { id: 'shift-c', label: 'C', startTime: '22:00', endTime: '06:00' },
]

/** @type {import('./model.js').ShiftAssignment[]} */
export const shiftAssignments = [
  { id: 'sa-1', employeeId: 'emp-2', date: '2026-04-11', shiftTemplateId: 'shift-a' },
  { id: 'sa-2', employeeId: 'emp-1', date: '2026-04-11', shiftTemplateId: 'shift-a' },
  { id: 'sa-3', employeeId: 'emp-1', date: '2026-04-12', shiftTemplateId: 'shift-b' },
]

/**
 * Pre-linked sample: mirrors tasks shop-floor-1 / shop-owner-1 in tasks mock when present,
 * or IDs assigned at runtime in tests; seed uses consistent ids for validate script.
 * @type {import('./model.js').StationAssignment[]}
 */
export const stationAssignments = [
  {
    id: 'stn-1',
    date: '2026-04-11',
    employeeId: 'emp-2',
    stationCode: 'ST-ASSY-03',
    machineId: 'mach-3',
    operationId: 'op-3',
    ownerId: 'emp-1',
    taskId: 'task-shop-exec-1',
    ownerTaskId: 'task-shop-owner-1',
  },
]

/** @type {import('./model.js').OperationExecutionActual[]} */
export const operationExecutionActuals = [
  {
    id: 'act-1',
    date: '2026-04-11',
    stationAssignmentId: 'stn-1',
    operationId: 'op-3',
    employeeId: 'emp-2',
    ownerId: 'emp-1',
    actualStart: '2026-04-11T06:30:00',
    actualEnd: '2026-04-11T13:45:00',
    actualDurationMinutes: 420,
    actualGoodQty: 88,
    actualScrapQty: 2,
    actualDowntimeMinutes: 25,
    actualDowntimeReason: 'Material wait',
    actualMachineId: 'mach-3',
    executionNote: 'First article OK',
    linkedTaskId: 'task-shop-exec-1',
  },
]
