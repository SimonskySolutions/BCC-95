/**
 * World countries (ISO alpha-2 + region) for the customer country picker.
 * Display names are derived per-language via Intl.DisplayNames, so the dropdown
 * localizes automatically (e.g. Bulgarian names when the app is in BG). Cities
 * stay free text on purpose.
 *
 * Tuples: [ISO alpha-2 code, region]
 * @type {Array<[string, string]>}
 */
const RAW = [
  // Europe
  ['AL', 'Europe'], ['AD', 'Europe'], ['AT', 'Europe'], ['BY', 'Europe'], ['BE', 'Europe'],
  ['BA', 'Europe'], ['BG', 'Europe'], ['HR', 'Europe'], ['CY', 'Europe'], ['CZ', 'Europe'],
  ['DK', 'Europe'], ['EE', 'Europe'], ['FI', 'Europe'], ['FR', 'Europe'], ['DE', 'Europe'],
  ['GR', 'Europe'], ['HU', 'Europe'], ['IS', 'Europe'], ['IE', 'Europe'], ['IT', 'Europe'],
  ['XK', 'Europe'], ['LV', 'Europe'], ['LI', 'Europe'], ['LT', 'Europe'], ['LU', 'Europe'],
  ['MT', 'Europe'], ['MD', 'Europe'], ['MC', 'Europe'], ['ME', 'Europe'], ['NL', 'Europe'],
  ['MK', 'Europe'], ['NO', 'Europe'], ['PL', 'Europe'], ['PT', 'Europe'], ['RO', 'Europe'],
  ['RU', 'Europe'], ['SM', 'Europe'], ['RS', 'Europe'], ['SK', 'Europe'], ['SI', 'Europe'],
  ['ES', 'Europe'], ['SE', 'Europe'], ['CH', 'Europe'], ['UA', 'Europe'], ['GB', 'Europe'],
  ['VA', 'Europe'],

  // Middle East
  ['BH', 'Middle East'], ['IR', 'Middle East'], ['IQ', 'Middle East'], ['IL', 'Middle East'],
  ['JO', 'Middle East'], ['KW', 'Middle East'], ['LB', 'Middle East'], ['OM', 'Middle East'],
  ['PS', 'Middle East'], ['QA', 'Middle East'], ['SA', 'Middle East'], ['SY', 'Middle East'],
  ['TR', 'Middle East'], ['AE', 'Middle East'], ['YE', 'Middle East'],

  // Asia
  ['AF', 'Asia'], ['AM', 'Asia'], ['AZ', 'Asia'], ['BD', 'Asia'], ['BT', 'Asia'], ['BN', 'Asia'],
  ['KH', 'Asia'], ['CN', 'Asia'], ['GE', 'Asia'], ['IN', 'Asia'], ['ID', 'Asia'], ['JP', 'Asia'],
  ['KZ', 'Asia'], ['KG', 'Asia'], ['LA', 'Asia'], ['MY', 'Asia'], ['MV', 'Asia'], ['MN', 'Asia'],
  ['MM', 'Asia'], ['NP', 'Asia'], ['KP', 'Asia'], ['PK', 'Asia'], ['PH', 'Asia'], ['SG', 'Asia'],
  ['KR', 'Asia'], ['LK', 'Asia'], ['TW', 'Asia'], ['TJ', 'Asia'], ['TH', 'Asia'], ['TL', 'Asia'],
  ['TM', 'Asia'], ['UZ', 'Asia'], ['VN', 'Asia'],

  // Africa
  ['DZ', 'Africa'], ['AO', 'Africa'], ['BJ', 'Africa'], ['BW', 'Africa'], ['BF', 'Africa'],
  ['BI', 'Africa'], ['CV', 'Africa'], ['CM', 'Africa'], ['CF', 'Africa'], ['TD', 'Africa'],
  ['KM', 'Africa'], ['CG', 'Africa'], ['CD', 'Africa'], ['CI', 'Africa'], ['DJ', 'Africa'],
  ['EG', 'Africa'], ['GQ', 'Africa'], ['ER', 'Africa'], ['SZ', 'Africa'], ['ET', 'Africa'],
  ['GA', 'Africa'], ['GM', 'Africa'], ['GH', 'Africa'], ['GN', 'Africa'], ['GW', 'Africa'],
  ['KE', 'Africa'], ['LS', 'Africa'], ['LR', 'Africa'], ['LY', 'Africa'], ['MG', 'Africa'],
  ['MW', 'Africa'], ['ML', 'Africa'], ['MR', 'Africa'], ['MU', 'Africa'], ['MA', 'Africa'],
  ['MZ', 'Africa'], ['NA', 'Africa'], ['NE', 'Africa'], ['NG', 'Africa'], ['RW', 'Africa'],
  ['ST', 'Africa'], ['SN', 'Africa'], ['SC', 'Africa'], ['SL', 'Africa'], ['SO', 'Africa'],
  ['ZA', 'Africa'], ['SS', 'Africa'], ['SD', 'Africa'], ['TZ', 'Africa'], ['TG', 'Africa'],
  ['TN', 'Africa'], ['UG', 'Africa'], ['ZM', 'Africa'], ['ZW', 'Africa'],

  // North America
  ['CA', 'North America'], ['MX', 'North America'], ['US', 'North America'],

  // Central America & Caribbean
  ['AG', 'Central America & Caribbean'], ['BS', 'Central America & Caribbean'],
  ['BB', 'Central America & Caribbean'], ['BZ', 'Central America & Caribbean'],
  ['CR', 'Central America & Caribbean'], ['CU', 'Central America & Caribbean'],
  ['DM', 'Central America & Caribbean'], ['DO', 'Central America & Caribbean'],
  ['SV', 'Central America & Caribbean'], ['GD', 'Central America & Caribbean'],
  ['GT', 'Central America & Caribbean'], ['HT', 'Central America & Caribbean'],
  ['HN', 'Central America & Caribbean'], ['JM', 'Central America & Caribbean'],
  ['NI', 'Central America & Caribbean'], ['PA', 'Central America & Caribbean'],
  ['KN', 'Central America & Caribbean'], ['LC', 'Central America & Caribbean'],
  ['VC', 'Central America & Caribbean'], ['TT', 'Central America & Caribbean'],

  // South America
  ['AR', 'South America'], ['BO', 'South America'], ['BR', 'South America'], ['CL', 'South America'],
  ['CO', 'South America'], ['EC', 'South America'], ['GY', 'South America'], ['PY', 'South America'],
  ['PE', 'South America'], ['SR', 'South America'], ['UY', 'South America'], ['VE', 'South America'],

  // Oceania
  ['AU', 'Oceania'], ['FJ', 'Oceania'], ['KI', 'Oceania'], ['MH', 'Oceania'], ['FM', 'Oceania'],
  ['NR', 'Oceania'], ['NZ', 'Oceania'], ['PW', 'Oceania'], ['PG', 'Oceania'], ['WS', 'Oceania'],
  ['SB', 'Oceania'], ['TO', 'Oceania'], ['TV', 'Oceania'], ['VU', 'Oceania'],
]

const dnCache = {}
function displayNames(lang) {
  const key = lang === 'bg' ? 'bg' : 'en'
  if (!dnCache[key]) {
    try { dnCache[key] = new Intl.DisplayNames([key], { type: 'region' }) }
    catch { dnCache[key] = new Intl.DisplayNames(['en'], { type: 'region' }) }
  }
  return dnCache[key]
}

/** Localized country name for an ISO alpha-2 code. */
export function localizedCountryName(code, lang = 'en') {
  if (!code) return ''
  try { return displayNames(lang).of(String(code).toUpperCase()) || code } catch { return code }
}

/** Sorted, localized country names for the datalist picker. */
export function countryNames(lang = 'en') {
  const collator = new Intl.Collator(lang === 'bg' ? 'bg' : 'en')
  return RAW.map(([code]) => localizedCountryName(code, lang)).sort((a, b) => collator.compare(a, b))
}

/** English list — kept for back-compat. */
export const COUNTRY_NAMES = countryNames('en')

/** All distinct regions. */
export const REGIONS = [...new Set(RAW.map(([, region]) => region))]

// Region keyed by every localized name (en + bg), so lookup works whatever
// language the value was picked in.
const regionByName = new Map()
for (const [code, region] of RAW) {
  for (const lang of ['en', 'bg']) {
    const name = localizedCountryName(code, lang)
    if (name) regionByName.set(name.toLowerCase(), region)
  }
}

/**
 * Region for a country name in any supported language (case-insensitive).
 * @param {string} country
 */
export function regionForCountry(country) {
  return regionByName.get(String(country).trim().toLowerCase()) ?? ''
}
