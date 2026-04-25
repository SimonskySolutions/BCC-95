export const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', active: true },
  { id: 'documentation', label: 'Documentation', icon: 'BookText' },
  { id: 'staff', label: 'Staff', icon: 'Users' },
  { id: 'circulars', label: 'Circulars', icon: 'FileText' },
  { id: 'maintenance', label: 'Maintenance', icon: 'Wrench' },
  { id: 'logistics', label: 'Logistics', icon: 'Truck' },
  { id: 'projects', label: 'Project Navigation', icon: 'Map' },
  { id: 'inventory', label: 'Inventory', icon: 'Boxes' },
  { id: 'notifications', label: 'Notifications', icon: 'Bell' },
  { id: 'procurements', label: 'Procurements', icon: 'ReceiptText' },
]

export const kpiCards = [
  {
    id: 'staff',
    label: 'Total number of staff',
    value: '1,284',
    trend: '+6.2% vs last month',
    positive: true,
    icon: 'Users',
  },
  {
    id: 'applications',
    label: 'Total applications',
    value: '3,762',
    trend: '+12.4% this quarter',
    positive: true,
    icon: 'ClipboardList',
  },
  {
    id: 'projects',
    label: 'Total projects',
    value: '186',
    trend: '-2.1% delayed delivery',
    positive: false,
    icon: 'FolderKanban',
  },
  {
    id: 'departments',
    label: 'Total departments',
    value: '24',
    trend: '+1 newly created',
    positive: true,
    icon: 'Building2',
  },
]

export const applicationsStatusData = [
  { name: 'Pending', value: 34, color: '#f59e0b' },
  { name: 'Approved', value: 52, color: '#10b981' },
  { name: 'Rejected', value: 14, color: '#ef4444' },
]

export const payrollSummaryData = [
  { month: 'Jan', base: 120, overtime: 16, bonus: 10 },
  { month: 'Feb', base: 122, overtime: 14, bonus: 12 },
  { month: 'Mar', base: 125, overtime: 18, bonus: 9 },
  { month: 'Apr', base: 128, overtime: 17, bonus: 11 },
  { month: 'May', base: 130, overtime: 16, bonus: 14 },
  { month: 'Jun', base: 134, overtime: 19, bonus: 13 },
  { month: 'Jul', base: 136, overtime: 21, bonus: 12 },
  { month: 'Aug', base: 137, overtime: 20, bonus: 15 },
  { month: 'Sep', base: 139, overtime: 22, bonus: 16 },
  { month: 'Oct', base: 142, overtime: 23, bonus: 14 },
  { month: 'Nov', base: 145, overtime: 22, bonus: 17 },
  { month: 'Dec', base: 148, overtime: 24, bonus: 18 },
]

export const incomeTrendData = [
  { month: 'Jan', income: 240 },
  { month: 'Feb', income: 255 },
  { month: 'Mar', income: 248 },
  { month: 'Apr', income: 268 },
  { month: 'May', income: 275 },
  { month: 'Jun', income: 286 },
  { month: 'Jul', income: 294 },
  { month: 'Aug', income: 309 },
  { month: 'Sep', income: 321 },
  { month: 'Oct', income: 336 },
  { month: 'Nov', income: 332 },
  { month: 'Dec', income: 348 },
]

export const paymentVouchers = [
  { sn: '01', subject: 'Vendor settlement for packaging material', date: '2026-03-02', status: 'Approved' },
  { sn: '02', subject: 'Transport invoice for IKEA dispatch', date: '2026-03-04', status: 'Pending' },
  { sn: '03', subject: 'Machine maintenance contract renewal', date: '2026-03-06', status: 'Approved' },
  { sn: '04', subject: 'Insurance adjustment for fleet services', date: '2026-03-08', status: 'Rejected' },
  { sn: '05', subject: 'Industrial cleaning services payment', date: '2026-03-10', status: 'Pending' },
]

export const budgetHistory = [
  { sn: '01', budgetNo: 'BG-2026-101', budgetedAmount: '$420,000', actualAmount: '$401,600', date: '2026-01-30' },
  { sn: '02', budgetNo: 'BG-2026-118', budgetedAmount: '$190,000', actualAmount: '$198,700', date: '2026-02-18' },
  { sn: '03', budgetNo: 'BG-2026-129', budgetedAmount: '$560,000', actualAmount: '$548,900', date: '2026-02-27' },
  { sn: '04', budgetNo: 'BG-2026-144', budgetedAmount: '$280,000', actualAmount: '$286,200', date: '2026-03-05' },
  { sn: '05', budgetNo: 'BG-2026-155', budgetedAmount: '$760,000', actualAmount: '$742,300', date: '2026-03-11' },
]

export const documentationStats = [
  { label: 'Total process docs', value: '124', note: 'Across operations and quality' },
  { label: 'Published this quarter', value: '18', note: 'Includes policy updates' },
  { label: 'Pending review', value: '7', note: 'Need owner approval' },
  { label: 'Archived versions', value: '36', note: 'Retained for audit trail' },
]

export const documentationLibrary = [
  {
    sn: '01',
    doc: 'VSM Documentation AS-IS',
    owner: 'Operations Excellence',
    version: 'v2.4',
    updated: '2026-03-12',
    status: 'Approved',
  },
  {
    sn: '02',
    doc: 'VSM Documentation TO-BE',
    owner: 'Transformation Office',
    version: 'v0.9',
    updated: '2026-03-14',
    status: 'Pending',
  },
  {
    sn: '03',
    doc: 'Manufacturing Route Governance',
    owner: 'Production Planning',
    version: 'v1.6',
    updated: '2026-03-09',
    status: 'Approved',
  },
  {
    sn: '04',
    doc: 'Quality Control Escalation SOP',
    owner: 'Quality Team',
    version: 'v1.2',
    updated: '2026-03-08',
    status: 'Rejected',
  },
  {
    sn: '05',
    doc: 'Procurement Threshold Policy',
    owner: 'Finance Operations',
    version: 'v3.1',
    updated: '2026-03-11',
    status: 'Approved',
  },
]
