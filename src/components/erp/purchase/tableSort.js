/** Next sort state after clicking a column header. */
export function toggleSort(sort, key) {
  return sort.key === key ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
}

/** Sort rows by `sort` using per-key getters ({ key: (row) => value }). */
export function sortRows(rows, sort, getters) {
  const get = getters[sort.key]
  if (!get) return rows
  const mul = sort.dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const va = get(a)
    const vb = get(b)
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mul
    return String(va ?? '').localeCompare(String(vb ?? '')) * mul
  })
}
