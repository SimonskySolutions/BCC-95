import { getMockDatabase } from './mockDatabase.js'

/**
 * Tiny version-keyed store wrapping the in-memory mock database, persisted to
 * localStorage so data survives reloads and is shared across browser tabs.
 *
 * Why: mutations update the db in place; the store bumps a version on every
 * `commit` so `useSyncExternalStore` consumers re-render consistently. The
 * commit also snapshots the db to localStorage, and a `storage` listener
 * applies snapshots written by *other* tabs — which is what makes the public
 * acceptance link (opened in a new tab) able to see offers created here, and
 * lets the originating tab observe the customer's decision live.
 *
 * Bump SCHEMA_VERSION whenever the seed shape changes so stale snapshots from
 * older deploys are discarded instead of breaking the UI.
 */

const STORAGE_KEY = 'bcc95-erp-db'
const SCHEMA_VERSION = 6

let version = 0
let hydrated = false
/** @type {Set<() => void>} */
const listeners = new Set()

function notify() {
  version += 1
  for (const listener of listeners) listener()
}

function persist(db) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: SCHEMA_VERSION, db }))
  } catch {
    // quota / private mode — keep running in-memory only
  }
}

/** Copy a parsed snapshot's collections onto the live db object (kept by reference everywhere). */
function applySnapshot(db, snapshot) {
  for (const key of Object.keys(snapshot)) {
    db[key] = snapshot[key]
  }
}

function hydrate(db) {
  hydrated = true
  try {
    if (typeof localStorage === 'undefined') return
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (parsed?.v !== SCHEMA_VERSION || !parsed.db) return
    applySnapshot(db, parsed.db)
  } catch {
    // corrupt snapshot — fall back to the fresh seed
  }
}

// Live cross-tab sync: another tab committed — apply its snapshot here.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return
    try {
      const parsed = JSON.parse(e.newValue)
      if (parsed?.v !== SCHEMA_VERSION || !parsed.db) return
      applySnapshot(getDb(), parsed.db)
      notify()
    } catch {
      // ignore malformed cross-tab payloads
    }
  })
}

/** @returns {import('./mockDatabase.js').MockDatabase} */
export function getDb() {
  const db = getMockDatabase()
  if (!hydrated) hydrate(db)
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
 * Run a mutation against the db, persist, then notify subscribers.
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

/** Wipe the persisted snapshot and reload with fresh seed data. */
export function resetDemoData() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined') window.location.reload()
}
