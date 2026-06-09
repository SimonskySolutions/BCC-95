import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getDb, getVersion, subscribe, commit } from './store.js'

/**
 * Subscribe a component to the store. Re-renders on every `commit`.
 *
 * @returns {{
 *   db: import('./mockDatabase.js').MockDatabase,
 *   version: number,
 *   commit: typeof commit,
 * }}
 */
export function useDb() {
  const version = useSyncExternalStore(subscribe, getVersion, getVersion)
  return { db: getDb(), version, commit }
}

/**
 * `useMemo` that also recomputes whenever the store version changes — so derived
 * data stays correct even though mutations update `db` arrays in place.
 *
 * @template T
 * @param {() => T} factory
 * @param {import('react').DependencyList} [deps]
 * @returns {T}
 */
export function useDbMemo(factory, deps = []) {
  const { version } = useDb()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, [version, ...deps])
}
