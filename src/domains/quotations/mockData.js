/** @type {import('./model.js').QuoteDraft[]} */
export const quoteDrafts = [
  {
    id: 'quote-1',
    clientId: 'client-1',
    productId: 'prod-1',
    inquiryId: 'inq-seed-1',
    status: 'draft',
    subtotal: 7300,
    marginPercent: 18,
    updatedAt: '2026-05-10',
    currency: 'EUR',
    language: 'en',
    unitPrice: 61.2,
    leadTimeDays: 40,
    validUntil: '2026-06-30',
    currentVersionNo: 1,
    currentVersionId: 'qv-1-1',
  },
  {
    id: 'quote-2',
    clientId: 'client-2',
    productId: 'prod-2',
    status: 'pending_approval',
    subtotal: 11200,
    marginPercent: 22,
    updatedAt: '2026-05-12',
    currency: 'EUR',
    language: 'en',
    unitPrice: 140,
    leadTimeDays: 28,
    validUntil: '2026-06-15',
    currentVersionNo: 1,
    currentVersionId: 'qv-2-1',
  },
  {
    id: 'quote-3',
    clientId: 'client-1',
    productId: 'prod-pkg-1',
    status: 'sent',
    subtotal: 4850,
    marginPercent: 15,
    updatedAt: '2026-05-05',
    currency: 'EUR',
    language: 'en',
    unitPrice: 97,
    leadTimeDays: 21,
    validUntil: '2026-05-26',
    currentVersionNo: 2,
    currentVersionId: 'qv-3-2',
  },
  {
    id: 'quote-4',
    clientId: 'client-2',
    productId: 'prod-1',
    status: 'revision_requested',
    subtotal: 9100,
    marginPercent: 17,
    updatedAt: '2026-04-28',
    currency: 'EUR',
    language: 'bg',
    unitPrice: 91,
    leadTimeDays: 35,
    validUntil: '2026-05-31',
    currentVersionNo: 1,
    currentVersionId: 'qv-4-1',
  },
  {
    id: 'quote-hist-1',
    clientId: 'client-1',
    productId: 'prod-1',
    status: 'accepted',
    subtotal: 6564,
    marginPercent: 16,
    updatedAt: '2025-11-01',
    currency: 'EUR',
    language: 'en',
    unitPrice: 54.7,
    leadTimeDays: 45,
    validUntil: '2025-12-15',
  },
  {
    id: 'quote-hist-2',
    clientId: 'client-2',
    productId: 'prod-2',
    status: 'accepted',
    subtotal: 8960,
    marginPercent: 20,
    updatedAt: '2026-02-15',
    currency: 'EUR',
    language: 'en',
    unitPrice: 112,
    leadTimeDays: 30,
    validUntil: '2026-03-31',
  },
  {
    id: 'quote-hist-3',
    clientId: 'client-1',
    productId: 'prod-rm-1',
    status: 'rejected',
    subtotal: 3200,
    marginPercent: 12,
    updatedAt: '2026-03-10',
    currency: 'EUR',
    language: 'en',
    unitPrice: 32,
    leadTimeDays: 14,
    validUntil: '2026-04-10',
  },
]

/** @type {import('./model.js').QuoteVersion[]} */
export const quoteVersions = [
  {
    id: 'qv-1-1',
    quoteId: 'quote-1',
    versionNo: 1,
    status: 'draft',
    createdAt: '2026-05-08T12:00:00.000Z',
    subtotal: 7300,
    marginPercent: 18,
    currency: 'EUR',
    language: 'en',
    unitPrice: 61.2,
    leadTimeDays: 40,
    validUntil: '2026-06-30',
    deliveryTerms: 'FCA Plovdiv (Incoterms 2020)',
    paymentTerms: '30 days net',
    moq: 100,
  },
  {
    id: 'qv-2-1',
    quoteId: 'quote-2',
    versionNo: 1,
    status: 'approved',
    createdAt: '2026-05-10T09:00:00.000Z',
    subtotal: 11200,
    marginPercent: 22,
    currency: 'EUR',
    language: 'en',
    unitPrice: 140,
    leadTimeDays: 28,
    validUntil: '2026-06-15',
    deliveryTerms: 'DAP Customer site',
    paymentTerms: '50% advance, 50% on delivery',
    moq: 80,
  },
  {
    id: 'qv-3-1',
    quoteId: 'quote-3',
    versionNo: 1,
    status: 'superseded',
    createdAt: '2026-04-20T10:00:00.000Z',
    subtotal: 5200,
    marginPercent: 14,
    currency: 'EUR',
    language: 'en',
    unitPrice: 104,
    leadTimeDays: 25,
    validUntil: '2026-05-20',
    deliveryTerms: 'EXW Plovdiv',
    paymentTerms: '30 days net',
  },
  {
    id: 'qv-3-2',
    quoteId: 'quote-3',
    versionNo: 2,
    status: 'sent',
    createdAt: '2026-05-03T14:00:00.000Z',
    sentAt: '2026-05-05T08:30:00.000Z',
    subtotal: 4850,
    marginPercent: 15,
    currency: 'EUR',
    language: 'en',
    unitPrice: 97,
    leadTimeDays: 21,
    validUntil: '2026-05-26',
    deliveryTerms: 'FCA Plovdiv (Incoterms 2020)',
    paymentTerms: '30 days net',
    moq: 50,
    supersedesVersionId: 'qv-3-1',
  },
  {
    id: 'qv-4-1',
    quoteId: 'quote-4',
    versionNo: 1,
    status: 'decided',
    createdAt: '2026-04-22T11:00:00.000Z',
    sentAt: '2026-04-25T09:00:00.000Z',
    subtotal: 9100,
    marginPercent: 17,
    currency: 'EUR',
    language: 'bg',
    unitPrice: 91,
    leadTimeDays: 35,
    validUntil: '2026-05-31',
    deliveryTerms: 'FCA Пловдив (Incoterms 2020)',
    paymentTerms: '30 дни нето',
    moq: 100,
  },
]

/** @type {import('./model.js').QuoteLineItem[]} */
export const quoteLineItems = [
  {
    id: 'qli-1-1-1',
    quoteVersionId: 'qv-1-1',
    kind: 'material',
    description: 'Steel tube Ø25×1.5 S235JR',
    quantity: 500,
    unitPrice: 4.2,
    totalPrice: 2100,
  },
  {
    id: 'qli-1-1-2',
    quoteVersionId: 'qv-1-1',
    kind: 'labor',
    description: 'Cut + weld + powder coat, 0.18 h/unit',
    quantity: 500,
    unitPrice: 9.5,
    totalPrice: 4750,
  },
  {
    id: 'qli-1-1-3',
    quoteVersionId: 'qv-1-1',
    kind: 'tooling',
    description: 'Weld jig refresh (amortized)',
    quantity: 1,
    unitPrice: 450,
    totalPrice: 450,
  },
]

/** @type {import('./model.js').QuoteApproval[]} */
export const quoteApprovals = [
  {
    id: 'qa-seed-1',
    quoteVersionId: 'qv-2-1',
    approverEmployeeId: 'emp-1',
    decision: 'approved',
    decidedAt: '2026-05-11T10:00:00.000Z',
    note: 'Margin and lead time are acceptable.',
  },
]

/** @type {import('./model.js').QuoteDocument[]} */
export const quoteDocuments = [
  {
    id: 'qdoc-seed-1',
    quoteVersionId: 'qv-1-1',
    kind: 'drawing',
    name: 'ADILS_leg_rev3.pdf',
    storageRef: 'mock://drawings/adils-leg-rev3.pdf',
    createdAt: '2026-05-09T08:00:00.000Z',
  },
]

/** @type {import('./model.js').QuoteDecision[]} */
export const quoteDecisions = [
  {
    id: 'qd-seed-1',
    quoteVersionId: 'qv-4-1',
    decision: 'revision_requested',
    decidedAt: '2026-04-28T15:30:00.000Z',
    customerContactName: 'Klaus Werner',
    customerContactEmail: 'klaus.werner@ikea.com',
    comment: 'Please reduce lead time to 25 days and provide a volume discount for 200+ units.',
    token: 'tok-seed-qv-4-1',
  },
]

/**
 * Customer-facing offer lines. Seeded empty — lines are created in the Offer tab.
 * @type {import('./model.js').QuoteOfferLine[]}
 */
export const quoteOfferLines = []

/**
 * Managed terms lookups. Seeded empty per requirements — populated via Settings → Offer terms.
 * @type {import('./model.js').TermsOfDelivery[]}
 */
export const termsOfDelivery = []

/** @type {import('./model.js').TermsOfPayment[]} */
export const termsOfPayment = []

/* ── Working cost sheets ─────────────────────────────────────────────────────
 * Seeded empty — a sheet is created on demand when the Costing step is opened.
 * The catalog below is seeded from the rows of the reference calculation
 * workbook so engineers pick standard lines instead of retyping them.
 */

/** @type {import('./model.js').CostSheet[]} */
export const costSheets = []

/** @type {import('./model.js').CostSheetLine[]} */
export const costSheetLines = []

/** @type {import('./model.js').CostCatalogEntry[]} */
export const costCatalog = [
  // Seeded from the «Номенклатури» workbook (материали / Операции /
  // инструменти / общи разходи / Логистика). Labels are the source
  // nomenclature; rates default to 0 for the engineer to fill in.
  { id: "cc-mat-01", group: "material", driver: "weight", label: "Метали тръби", defaults: { scrapPct: 3, costPerKg: 0 } },
  { id: "cc-mat-02", group: "material", driver: "weight", label: "Метали ламарина", defaults: { scrapPct: 3, costPerKg: 0 } },
  { id: "cc-mat-03", group: "material", driver: "weight", label: "Метали тел", defaults: { scrapPct: 3, costPerKg: 0 } },
  { id: "cc-mat-04", group: "material", driver: "weight", label: "Метали неръждаеми", defaults: { scrapPct: 3, costPerKg: 0 } },
  { id: "cc-mat-05", group: "material", driver: "weight", label: "Метали други", defaults: { scrapPct: 3, costPerKg: 0 } },
  { id: "cc-mat-06", group: "material", driver: "count", label: "Скрепителни елементи", defaults: { qty: 1 } },
  { id: "cc-mat-07", group: "material", driver: "count", label: "Заварочни материали", defaults: { qty: 1 } },
  { id: "cc-mat-08", group: "material", driver: "count", label: "Консумативи", defaults: { qty: 1 } },
  { id: "cc-mat-09", group: "material", driver: "surface", label: "Покритие - прахова боя", defaults: { gPerDm2: 1.8, costPerKg: 0 } },
  { id: "cc-mat-10", group: "material", driver: "count", label: "Покритие - обезмасляване", defaults: { qty: 1 } },
  { id: "cc-mat-11", group: "material", driver: "surface", label: "Покритие - галванично", defaults: { gPerDm2: 0, costPerKg: 0 } },
  { id: "cc-mat-12", group: "material", driver: "surface", label: "Покритие - горещо поцинковане", defaults: { gPerDm2: 0, costPerKg: 0 } },
  { id: "cc-mat-13", group: "material", driver: "count", label: "Компоненти - пластмаса", defaults: { qty: 1 } },
  { id: "cc-mat-14", group: "material", driver: "count", label: "Компоненти - дърво", defaults: { qty: 1 } },
  { id: "cc-mat-15", group: "material", driver: "count", label: "Компоненти - текстил", defaults: { qty: 1 } },
  { id: "cc-mat-16", group: "material", driver: "count", label: "Компоненти - други", defaults: { qty: 1 } },
  { id: "cc-mat-17", group: "material", driver: "count", label: "Опаковки - етикети", defaults: { qty: 1 } },
  { id: "cc-mat-18", group: "material", driver: "count", label: "Опаковки - инструкции", defaults: { qty: 1 } },
  { id: "cc-mat-19", group: "material", driver: "count", label: "Опаковки - полиетилен", defaults: { qty: 1 } },
  { id: "cc-mat-20", group: "material", driver: "count", label: "Опаковки - кашон,кутия", defaults: { qty: 1 } },
  { id: "cc-mat-21", group: "material", driver: "count", label: "Опаковки - пълнежи", defaults: { qty: 1 } },
  { id: "cc-mat-22", group: "material", driver: "count", label: "Опаковки - картон палети", defaults: { qty: 1 } },
  { id: "cc-mat-23", group: "material", driver: "count", label: "Опаковки - дървени палети", defaults: { qty: 1 } },
  { id: "cc-mat-24", group: "material", driver: "count", label: "Опаковки - други", defaults: { qty: 1 } },
  { id: "cc-mat-25", group: "material", driver: "weight", label: "Енергия , горива", defaults: { costPerKg: 0, linkNetKg: true } },
  { id: "cc-mat-26", group: "material", driver: "count", label: "Други материали", defaults: { qty: 1 } },
  { id: "cc-op-01", group: "operation", driver: "count", label: "Разкрояване циркулярно", defaults: { qty: 1 } },
  { id: "cc-op-02", group: "operation", driver: "count", label: "Разкрояване лазерно", defaults: { qty: 1 } },
  { id: "cc-op-03", group: "operation", driver: "count", label: "Пресоване", defaults: { qty: 1 } },
  { id: "cc-op-04", group: "operation", driver: "count", label: "Огъване", defaults: { qty: 1 } },
  { id: "cc-op-05", group: "operation", driver: "count", label: "Формоване", defaults: { qty: 1 } },
  { id: "cc-op-06", group: "operation", driver: "count", label: "Сбиване", defaults: { qty: 1 } },
  { id: "cc-op-07", group: "operation", driver: "count", label: "Направа на фаска", defaults: { qty: 1 } },
  { id: "cc-op-08", group: "operation", driver: "count", label: "Нарязване на резба", defaults: { qty: 1 } },
  { id: "cc-op-09", group: "operation", driver: "count", label: "Заваряване ръчно", defaults: { qty: 1 } },
  { id: "cc-op-10", group: "operation", driver: "count", label: "Заваряване полуавтомат", defaults: { qty: 1 } },
  { id: "cc-op-11", group: "operation", driver: "count", label: "Заваряване робот", defaults: { qty: 1 } },
  { id: "cc-op-12", group: "operation", driver: "count", label: "Дробометриране", defaults: { qty: 1 } },
  { id: "cc-op-13", group: "operation", driver: "count", label: "Шлайфане", defaults: { qty: 1 } },
  { id: "cc-op-14", group: "operation", driver: "count", label: "Обезмасляване", defaults: { qty: 1 } },
  { id: "cc-op-15", group: "operation", driver: "count", label: "ЕП прахово покритие", defaults: { qty: 1 } },
  { id: "cc-op-16", group: "operation", driver: "count", label: "Други видове покритие", defaults: { qty: 1 } },
  { id: "cc-op-17", group: "operation", driver: "count", label: "Монтиране", defaults: { qty: 1 } },
  { id: "cc-op-18", group: "operation", driver: "count", label: "Опаковане", defaults: { qty: 1 } },
  { id: "cc-op-19", group: "operation", driver: "count", label: "Други операции", defaults: { qty: 1 } },
  { id: "cc-tool-01", group: "tooling", driver: "count", label: "щанци", defaults: { qty: 1, unitCost: 0 } },
  { id: "cc-tool-02", group: "tooling", driver: "count", label: "огъвни ролки", defaults: { qty: 1, unitCost: 0 } },
  { id: "cc-tool-03", group: "tooling", driver: "count", label: "формоващи за  преси", defaults: { qty: 1, unitCost: 0 } },
  { id: "cc-tool-04", group: "tooling", driver: "count", label: "шприц  форми", defaults: { qty: 1, unitCost: 0 } },
  { id: "cc-tool-05", group: "tooling", driver: "count", label: "заварочни шаблони", defaults: { qty: 1, unitCost: 0 } },
  { id: "cc-tool-06", group: "tooling", driver: "count", label: "контролни шаблони", defaults: { qty: 1, unitCost: 0 } },
  { id: "cc-tool-07", group: "tooling", driver: "count", label: "нестандартни приспособления", defaults: { qty: 1, unitCost: 0 } },
  // Burden — computed as in «Пример опростена калкулация»: flat per-unit
  // amounts (count) or fixed ÷ volume (allocation). No percentages — only
  // profit is a % (applied in the combined summary).
  { id: "cc-bur-01", group: "other", driver: "count", label: "непряк труд", defaults: { qty: 1, unitCost: 0 } },
  { id: "cc-bur-02", group: "other", driver: "count", label: "вътрешен транспорт", defaults: { qty: 1, unitCost: 0 } },
  { id: "cc-bur-03", group: "other", driver: "count", label: "режийни и подръжка", defaults: { qty: 1, unitCost: 0 } },
  { id: "cc-bur-04", group: "other", driver: "count", label: "административни разходи", defaults: { qty: 1, unitCost: 0 } },
  { id: "cc-bur-05", group: "other", driver: "count", label: "маркетинг и реклама", defaults: { qty: 1, unitCost: 0 } },
  { id: "cc-bur-06", group: "other", driver: "allocation", label: "амортизации", defaults: { fixedTotal: 0, allocationUnits: 1 } },
  { id: "cc-bur-07", group: "other", driver: "count", label: "финансови", defaults: { qty: 1, unitCost: 0 } },
  { id: "cc-bur-08", group: "other", driver: "allocation", label: "разходи за инструменти", defaults: { fixedTotal: 0, allocationUnits: 1 } },
  { id: "cc-bur-09", group: "other", driver: "count", label: "други", defaults: { qty: 1, unitCost: 0 } },
  { id: "cc-log-01", group: "logistics", driver: "count", label: "Транспортни опаковки", defaults: { qty: 1 } },
  { id: "cc-log-02", group: "logistics", driver: "count", label: "Митническо представителство", defaults: { qty: 1 } },
  { id: "cc-log-03", group: "logistics", driver: "pack", label: "Транспорт до клиента с пълен камион", defaults: { unitsPerPack: 40, costPerPack: 0 } },
  { id: "cc-log-04", group: "logistics", driver: "pack", label: "Транспорт до клиента - на палет", defaults: { unitsPerPack: 40, costPerPack: 0 } },
  { id: "cc-log-05", group: "logistics", driver: "count", label: "Други транспротни разходи", defaults: { qty: 1 } },
]
