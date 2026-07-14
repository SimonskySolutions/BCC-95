import { selectOffersByClient } from '../../domains/quotations/selectors.js'

/** Bulgarian Cyrillic → Latin, so "Гетов" and "Getov" resolve to each other. */
const CYR_LAT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
}

/** Lowercase, transliterate Cyrillic, drop punctuation → space-separated tokens. */
function normalize(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[а-я]/g, (c) => CYR_LAT[c] ?? c)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Days between today and an ISO date (positive = future). */
function daysUntil(iso, today = new Date()) {
  if (!iso) return null
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return Math.round((d.getTime() - new Date(today.toISOString().slice(0, 10) + 'T00:00:00').getTime()) / 86400000)
}

function validityNote(validUntil) {
  const n = daysUntil(validUntil)
  if (n == null) return ''
  if (n > 0) return ` · valid until ${validUntil} (${n} day${n === 1 ? '' : 's'} left)`
  if (n === 0) return ` · valid until ${validUntil} (expires today)`
  return ` · valid until ${validUntil} (EXPIRED ${-n} day${n === -1 ? '' : 's'} ago)`
}

/**
 * Resolve which clients a free-text question refers to, matching on company or
 * contact name across Cyrillic/Latin.
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} query
 */
function matchClients(db, query) {
  const q = normalize(query)
  if (!q) return []
  const qTokens = new Set(q.split(' '))
  const hit = (text) => {
    const name = normalize(text)
    if (!name) return false
    if (q.includes(name)) return true
    // any significant name token present in the question
    return name.split(' ').some((tok) => tok.length >= 3 && qTokens.has(tok))
  }
  return (db.clients ?? []).filter((c) => {
    if (hit(c.companyName ?? c.name ?? '')) return true
    // also match the contact person's name (e.g. "Getsov", "Konstantin")
    if (hit(c.contactName ?? '')) return true
    return (c.contacts ?? []).some((p) => hit(p?.name ?? ''))
  })
}

/**
 * Build an authoritative, compact facts block for the local model to answer
 * questions like "what was the offer we gave to X", "how many offers to X",
 * "how much time is left on the X offer". Returns '' when nothing is relevant.
 *
 * @param {import('../../data/mockDatabase.js').MockDatabase} db
 * @param {string} query  the user's latest message
 */
export function buildErpContext(db, query) {
  const today = new Date().toISOString().slice(0, 10)
  const versions = new Map((db.quoteVersions ?? []).map((v) => [v.id, v]))
  const matched = matchClients(db, query)
  const lines = [`Today is ${today}.`]

  if (matched.length) {
    for (const client of matched.slice(0, 5)) {
      const name = client.companyName ?? client.name ?? client.id
      const offers = selectOffersByClient(db, client.id)
      lines.push('', `Client "${name}": ${offers.length} offer${offers.length === 1 ? '' : 's'}.`)
      if (!offers.length) lines.push('- (no offers on record)')
      for (const o of offers.slice(0, 20)) {
        const vu = versions.get(o.versionId)?.validUntil
        lines.push(
          `- Offer ${o.offerNo} v${o.versionNo} · product "${o.productName}" · ${o.total.toFixed(2)} ${o.currency}` +
          ` · status ${o.status}${o.date ? ` · dated ${o.date}` : ''}${validityNote(vu)}` +
          `${o.kind === 'tooling' ? ' · (tooling offer)' : ''}`,
        )
      }
    }
    return lines.join('\n')
  }

  // No specific client matched — give a small directory so the model can answer
  // "how many offers to X" or ask the user to clarify the name.
  const clients = (db.clients ?? [])
    .map((c) => ({ name: c.companyName ?? c.name ?? c.id, count: selectOffersByClient(db, c.id).length }))
    .filter((c) => c.name)
    .sort((a, b) => b.count - a.count)
  if (!clients.length) return ''
  lines.push('', 'No specific client was recognised in the question. Known clients and their offer counts:')
  for (const c of clients.slice(0, 40)) lines.push(`- ${c.name}: ${c.count} offer${c.count === 1 ? '' : 's'}`)
  if (clients.length > 40) lines.push(`- …and ${clients.length - 40} more`)
  return lines.join('\n')
}
