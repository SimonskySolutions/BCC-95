/**
 * Company-registry (VIES) lookup helpers, shared by the inquiry form and the
 * client profile. Enter an ЕИК (BG) or a full EU VAT to fetch the legal name
 * and registered address.
 */

/** ISO-2 VAT country code → country name (for region auto-fill after a lookup). */
export const EU_CODE_NAME = {
  BG: 'Bulgaria', PL: 'Poland', IT: 'Italy', NL: 'Netherlands', RO: 'Romania', SK: 'Slovakia',
  DK: 'Denmark', DE: 'Germany', CZ: 'Czech Republic', AT: 'Austria', FR: 'France', ES: 'Spain',
  GR: 'Greece', HU: 'Hungary', BE: 'Belgium', SE: 'Sweden', FI: 'Finland', PT: 'Portugal',
  IE: 'Ireland', HR: 'Croatia', SI: 'Slovenia', LT: 'Lithuania', LV: 'Latvia', EE: 'Estonia',
}

/**
 * VIES returns the registered address as one free-text string. Pull out the
 * city and postcode so they can populate their own fields. Tuned for Bulgarian
 * addresses ("гр.<city>"/"с.<village>" + a 4-digit postcode); returns best-effort
 * for others.
 * @param {string} address
 * @returns {{ city: string; postCode: string }}
 */
export function parseRegisteredAddress(address) {
  const s = String(address ?? '').replace(/\s+/g, ' ').trim()
  if (!s) return { city: '', postCode: '' }
  // Postcode: the last 4-digit group (BG postcodes are 4 digits, usually at the end).
  const pc = s.match(/(\d{4})(?!.*\d)/)
  const postCode = pc ? pc[1] : ''
  // City: the token(s) after "гр." (град) or "с." (село). JS \b doesn't work
  // around Cyrillic, so anchor on start/space/comma/dot; stop at a postcode, a
  // comma, end, or the next abbreviation (общ., обл., …).
  const cm = s.match(/(?:^|[\s,.])(?:гр|с)\.?\s*([А-Яа-яЁё][А-Яа-яЁё .-]*?)\s*(?:\d{4}|,|$|[а-яА-Я]{2,4}\.)/)
  const city = cm ? cm[1].trim() : ''
  return { city, postCode }
}

/**
 * Look up a company by ЕИК (BG) or full EU VAT. A 2-letter prefix is treated as
 * a full VAT; otherwise the value is an ЕИК in `defaultCountry`.
 * @param {string} idValue
 * @param {string} [defaultCountry]
 * @returns {Promise<{ ok: boolean; valid: boolean; company?: any } | null>}
 */
export function lookupCompany(idValue, defaultCountry = 'BG') {
  const id = String(idValue ?? '').trim()
  if (!id) return Promise.resolve(null)
  const qs = /^[A-Za-z]{2}/.test(id)
    ? `vat=${encodeURIComponent(id)}`
    : `eik=${encodeURIComponent(id)}&country=${defaultCountry}`
  return fetch(`/api/registry/lookup?${qs}`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
}

/**
 * Live name search in the BG Commercial Register. Accepts Cyrillic or Latin
 * input (the server transliterates). Resolves to [] on any failure.
 * @param {string} name
 * @returns {Promise<{ eik: string; name: string; fullName: string }[]>}
 */
export function searchRegistry(name) {
  const q = String(name ?? '').replace(/\s+/g, ' ').trim()
  if (q.length < 3) return Promise.resolve([])
  return fetch(`/api/registry/search?name=${encodeURIComponent(q)}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => (Array.isArray(d?.results) ? d.results : []))
    .catch(() => [])
}

/**
 * Geocode a free-text address for the profile/inquiry map pin.
 * @param {string} q
 * @returns {Promise<{ lat: number; lon: number; label: string; precision: 'exact'|'city' } | null>}
 */
export function geocodeAddress(q) {
  const s = String(q ?? '').replace(/\s+/g, ' ').trim()
  if (!s) return Promise.resolve(null)
  return fetch(`/api/registry/geocode?q=${encodeURIComponent(s)}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => d?.result ?? null)
    .catch(() => null)
}
