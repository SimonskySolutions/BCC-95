import { getMockDatabase } from './mockDatabase.js'

/**
 * Tiny version-keyed store wrapping the in-memory mock database.
 *
 * Why this exists: the mock db is a single mutable object and mutations update
 * it in place (`db.quoteDrafts.push(...)`). Components used to re-render via
 * their own local `forceRefresh`, which left sibling views — and any `useMemo`
 * keyed on a (stable) `db.x` array reference — stale.
 *
 * The store exposes a monotonically increasing `version`. Every mutation goes
 * through `commit`, which bumps the version and notifies subscribers. UI reads
 * the version with `useSyncExternalStore` (see `StoreProvider`) so a commit
 * anywhere triggers a consistent re-render everywhere, and version-keyed memos
 * recompute deterministically.
 */

let version = 0
/** @type {Set<() => void>} */
const listeners = new Set()

/** @returns {import('./mockDatabase.js').MockDatabase} */
export function getDb() {
  return getMockDatabase()
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
 * Run a mutation against the db, then notify subscribers.
 * The mutator typically calls one or more `domains/*/mutations.js` functions.
 * Returns whatever the mutator returns, so call sites can use created records.
 *
 * @template T
 * @param {(db: import('./mockDatabase.js').MockDatabase) => T} [mutator]
 * @returns {T}
 */
export function commit(mutator) {
  const result = mutator ? mutator(getDb()) : /** @type {T} */ (undefined)
  version += 1
  for (const listener of listeners) listener()
  return result
}
