import { getMockDatabase } from './mockDatabase.js'
import { syncCounters as syncQuoteCounters } from '../domains/quotations/mutations.js'
import { syncCounters as syncCrmCounters } from '../domains/crm/mutations.js'
import { syncCounters as syncTaskCounters } from '../domains/tasks/mutations.js'
import { syncCounters as syncNotifCounters } from '../domains/notifications/mutations.js'

/** Reseed all domain id counters past the ids already present in the db. */
function syncAllCounters(db) {
  syncQuoteCounters(db)
  syncCrmCounters(db)
  syncTaskCounters(db)
  syncNotifCounters(db)
}

/**
 * Version-keyed store wrapping the in-memory ERP database, persisted to
 * **Postgres** (via the `/api` service) — the single source of truth.
 *
 * Flow: mutations update the db object in place; `commit` bumps a version so
 * `useSyncExternalStore` consumers re-render, then debounce-saves the whole
 * dataset to the backend. On boot the store loads the saved document from the
 * backend (async) and notifies once it arrives. There is no localStorage: an
 * empty system simply has no row in the database.
 *
 * Bump SCHEMA_VERSION whenever the seed shape changes so stale documents from
 * older deploys are discarded instead of breaking the UI.
 */

const API_BASE = '/api'
const SCHEMA_VERSION = 8
const SAVE_DEBOUNCE_MS = 400

let version = 0
let loadStarted = false
let nomsLoaded = false
let pendingSave = false
let saveTimer = null
/** @type {Set<() => void>} */
const listeners = new Set()

// Master-data collections sourced from relational tables (/api/nomenclatures,
// /api/users), NOT from the working-data document. They are loaded separately,
// excluded from what we persist, and never overwritten by the working snapshot.
const NOMENCLATURE_KEYS = ['vendors', 'costCatalog', 'employees']
/** Which nomenclature tab maps to which cost-sheet group. */
const TAB_TO_GROUP = {
  materials: 'material',
  operations: 'operation',
  tools: 'tooling',
  overheads: 'other',
  logistics: 'logistics',
}

function notify() {
  version += 1
  for (const listener of listeners) listener()
}

/** Copy a document's collections onto the live db object (kept by reference everywhere). */
function applySnapshot(db, snapshot) {
  for (const key of Object.keys(snapshot)) {
    if (NOMENCLATURE_KEYS.includes(key)) continue // master data owns these
    db[key] = snapshot[key]
  }
}

/** Load master data (suppliers + cost catalogs) from the relational tables. */
function loadNomenclatures(db) {
  if (nomsLoaded || typeof fetch === 'undefined') return
  nomsLoaded = true
  fetch(`${API_BASE}/nomenclatures`)
    .then((res) => (res.ok ? res.json() : null))
    .then((noms) => {
      if (!noms) return
      db.vendors = (noms.suppliers ?? []).map((s) => ({
        id: `sup-${s.id}`,
        name: s.name,
        category: 'Supplier',
        status: 'active',
        country: s.country ?? undefined,
        postCode: s.post_code ?? undefined,
        city: s.city ?? undefined,
        address: s.address ?? undefined,
        vat: s.vat ?? undefined,
        phone: s.phone ?? undefined,
        email: s.email ?? undefined,
      }))
      db.costCatalog = Object.entries(TAB_TO_GROUP).flatMap(([tab, group]) =>
        (noms[tab] ?? []).map((c) => ({
          id: c.code,
          group,
          driver: c.driver,
          label: c.label,
          defaults: c.defaults ?? {},
        })),
      )
      notify()
    })
    .catch(() => {
      // Backend unreachable — dropdowns just stay empty until reload.
    })
}

let usersLoaded = false

/**
 * Load users from the relational `users` table into `db.employees` so existing
 * employee-aware code keeps working, while users/roles live as master data.
 * Carries the effective permission list + an `active` flag onto each employee.
 */
function loadUsers(db) {
  if (usersLoaded || typeof fetch === 'undefined') return
  usersLoaded = true
  return refreshUsers(db)
}

/** Re-fetch users (after a create/edit) and re-map into db.employees. */
export function refreshUsers(db = getDb()) {
  if (typeof fetch === 'undefined') return Promise.resolve()
  return fetch(`${API_BASE}/users`)
    .then((res) => (res.ok ? res.json() : null))
    .then((users) => {
      if (!users) return
      db.employees = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email ?? undefined,
        role: u.roleName ?? u.roleId ?? '',
        roleId: u.roleId,
        active: u.active,
        permissions: u.permissions ?? [],
        canApproveQuotes: (u.permissions ?? []).includes('offer.approve') || (u.permissions ?? []).includes('*'),
      }))
      notify()
    })
    .catch(() => {})
}

/** Load the saved dataset from the backend once, then notify subscribers. */
function loadFromApi(db) {
  if (loadStarted || typeof fetch === 'undefined') return
  loadStarted = true
  fetch(`${API_BASE}/state`)
    .then((res) => (res.ok ? res.json() : null))
    .then((payload) => {
      if (payload && payload.v === SCHEMA_VERSION && payload.db) {
        applySnapshot(db, payload.db)
        syncAllCounters(db) // never reissue an id that already exists
        notify()
      }
    })
    .catch(() => {
      // Backend unreachable — run with the empty in-memory db. A later commit
      // will retry the save; nothing is silently lost on the client.
    })
}

/** Persist the whole dataset to the backend (debounced to coalesce bursts). */
function persist(db) {
  if (typeof fetch === 'undefined') return
  pendingSave = true
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    // Persist working data only — master data lives in the nomenclature tables.
    const doc = {}
    for (const key of Object.keys(db)) {
      if (!NOMENCLATURE_KEYS.includes(key)) doc[key] = db[key]
    }
    fetch(`${API_BASE}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ v: SCHEMA_VERSION, db: doc }),
    })
      .catch(() => {})
      .finally(() => {
        pendingSave = false
      })
  }, SAVE_DEBOUNCE_MS)
}

/**
 * Pull the latest saved dataset from the backend and apply it. Used to refresh
 * after the window regains focus (replaces the old cross-tab localStorage sync),
 * e.g. so the originating tab sees a decision made on the public acceptance page.
 * Skipped while a local save is pending, to avoid clobbering unsaved edits.
 */
function refetch() {
  if (pendingSave || typeof fetch === 'undefined') return
  // Remember the local version before the (async) GET. If any local edit or save
  // happens while it's in flight, skip applying so we don't clobber unsaved
  // changes — e.g. a photo added right after the file dialog refocused the window.
  const startVersion = version
  fetch(`${API_BASE}/state`)
    .then((res) => (res.ok ? res.json() : null))
    .then((payload) => {
      if (pendingSave || version !== startVersion) return
      if (payload && payload.v === SCHEMA_VERSION && payload.db) {
        const db = getDb()
        applySnapshot(db, payload.db)
        syncAllCounters(db)
        notify()
      }
    })
    .catch(() => {})
}

if (typeof window !== 'undefined') {
  window.addEventListener('focus', refetch)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refetch()
  })
}

/** @returns {import('./mockDatabase.js').MockDatabase} */
export function getDb() {
  const db = getMockDatabase()
  loadFromApi(db)
  loadNomenclatures(db)
  loadUsers(db)
  return db
}

/** Current store version. Stable identity (number) — safe for getSnapshot. */
export function getVersion() {
  return version
}

/**
 * Subscribe to store changes. Returns an unsubscribe function.
 * @param {() => void} listener
 */
export function subscribe(listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Run a mutation against the db, persist to the backend, then notify subscribers.
 * The mutator typically calls one or more domain mutation helpers.
 * Returns whatever the mutator returns, so call sites can use created records.
 *
 * @template T
 * @param {(db: import('./mockDatabase.js').MockDatabase) => T} [mutator]
 * @returns {T}
 */
export function commit(mutator) {
  const db = getDb()
  const result = mutator ? mutator(db) : /** @type {T} */ (undefined)
  persist(db)
  notify()
  return result
}

/**
 * Factory reset — drop all data from the database, then reload so the app
 * rehydrates into a clean, empty system.
 */
export function factoryReset() {
  const reload = () => {
    if (typeof window !== 'undefined') window.location.reload()
  }
  if (typeof fetch === 'undefined') return reload()
  fetch(`${API_BASE}/factory-reset`, { method: 'POST' })
    .then(reload)
    .catch(reload)
}
