/**
 * World countries with their region, for the customer country picker.
 * Local and offline — no geo API. Cities stay free text on purpose: a full
 * world-city catalog is 100k+ entries and belongs behind a backend lookup.
 *
 * Tuples: [country name, region]
 * @type {Array<[string, string]>}
 */
const RAW = [
  // Europe
  ['Albania', 'Europe'], ['Andorra', 'Europe'], ['Austria', 'Europe'], ['Belarus', 'Europe'],
  ['Belgium', 'Europe'], ['Bosnia and Herzegovina', 'Europe'], ['Bulgaria', 'Europe'],
  ['Croatia', 'Europe'], ['Cyprus', 'Europe'], ['Czechia', 'Europe'], ['Denmark', 'Europe'],
  ['Estonia', 'Europe'], ['Finland', 'Europe'], ['France', 'Europe'], ['Germany', 'Europe'],
  ['Greece', 'Europe'], ['Hungary', 'Europe'], ['Iceland', 'Europe'], ['Ireland', 'Europe'],
  ['Italy', 'Europe'], ['Kosovo', 'Europe'], ['Latvia', 'Europe'], ['Liechtenstein', 'Europe'],
  ['Lithuania', 'Europe'], ['Luxembourg', 'Europe'], ['Malta', 'Europe'], ['Moldova', 'Europe'],
  ['Monaco', 'Europe'], ['Montenegro', 'Europe'], ['Netherlands', 'Europe'],
  ['North Macedonia', 'Europe'], ['Norway', 'Europe'], ['Poland', 'Europe'],
  ['Portugal', 'Europe'], ['Romania', 'Europe'], ['Russia', 'Europe'], ['San Marino', 'Europe'],
  ['Serbia', 'Europe'], ['Slovakia', 'Europe'], ['Slovenia', 'Europe'], ['Spain', 'Europe'],
  ['Sweden', 'Europe'], ['Switzerland', 'Europe'], ['Ukraine', 'Europe'],
  ['United Kingdom', 'Europe'], ['Vatican City', 'Europe'],

  // Middle East
  ['Bahrain', 'Middle East'], ['Iran', 'Middle East'], ['Iraq', 'Middle East'],
  ['Israel', 'Middle East'], ['Jordan', 'Middle East'], ['Kuwait', 'Middle East'],
  ['Lebanon', 'Middle East'], ['Oman', 'Middle East'], ['Palestine', 'Middle East'],
  ['Qatar', 'Middle East'], ['Saudi Arabia', 'Middle East'], ['Syria', 'Middle East'],
  ['Türkiye', 'Middle East'], ['United Arab Emirates', 'Middle East'], ['Yemen', 'Middle East'],

  // Asia
  ['Afghanistan', 'Asia'], ['Armenia', 'Asia'], ['Azerbaijan', 'Asia'], ['Bangladesh', 'Asia'],
  ['Bhutan', 'Asia'], ['Brunei', 'Asia'], ['Cambodia', 'Asia'], ['China', 'Asia'],
  ['Georgia', 'Asia'], ['India', 'Asia'], ['Indonesia', 'Asia'], ['Japan', 'Asia'],
  ['Kazakhstan', 'Asia'], ['Kyrgyzstan', 'Asia'], ['Laos', 'Asia'], ['Malaysia', 'Asia'],
  ['Maldives', 'Asia'], ['Mongolia', 'Asia'], ['Myanmar', 'Asia'], ['Nepal', 'Asia'],
  ['North Korea', 'Asia'], ['Pakistan', 'Asia'], ['Philippines', 'Asia'], ['Singapore', 'Asia'],
  ['South Korea', 'Asia'], ['Sri Lanka', 'Asia'], ['Taiwan', 'Asia'], ['Tajikistan', 'Asia'],
  ['Thailand', 'Asia'], ['Timor-Leste', 'Asia'], ['Turkmenistan', 'Asia'],
  ['Uzbekistan', 'Asia'], ['Vietnam', 'Asia'],

  // Africa
  ['Algeria', 'Africa'], ['Angola', 'Africa'], ['Benin', 'Africa'], ['Botswana', 'Africa'],
  ['Burkina Faso', 'Africa'], ['Burundi', 'Africa'], ['Cabo Verde', 'Africa'],
  ['Cameroon', 'Africa'], ['Central African Republic', 'Africa'], ['Chad', 'Africa'],
  ['Comoros', 'Africa'], ['Congo (Brazzaville)', 'Africa'], ['Congo (DRC)', 'Africa'],
  ["Côte d'Ivoire", 'Africa'], ['Djibouti', 'Africa'], ['Egypt', 'Africa'],
  ['Equatorial Guinea', 'Africa'], ['Eritrea', 'Africa'], ['Eswatini', 'Africa'],
  ['Ethiopia', 'Africa'], ['Gabon', 'Africa'], ['Gambia', 'Africa'], ['Ghana', 'Africa'],
  ['Guinea', 'Africa'], ['Guinea-Bissau', 'Africa'], ['Kenya', 'Africa'], ['Lesotho', 'Africa'],
  ['Liberia', 'Africa'], ['Libya', 'Africa'], ['Madagascar', 'Africa'], ['Malawi', 'Africa'],
  ['Mali', 'Africa'], ['Mauritania', 'Africa'], ['Mauritius', 'Africa'], ['Morocco', 'Africa'],
  ['Mozambique', 'Africa'], ['Namibia', 'Africa'], ['Niger', 'Africa'], ['Nigeria', 'Africa'],
  ['Rwanda', 'Africa'], ['São Tomé and Príncipe', 'Africa'], ['Senegal', 'Africa'],
  ['Seychelles', 'Africa'], ['Sierra Leone', 'Africa'], ['Somalia', 'Africa'],
  ['South Africa', 'Africa'], ['South Sudan', 'Africa'], ['Sudan', 'Africa'],
  ['Tanzania', 'Africa'], ['Togo', 'Africa'], ['Tunisia', 'Africa'], ['Uganda', 'Africa'],
  ['Zambia', 'Africa'], ['Zimbabwe', 'Africa'],

  // North America
  ['Canada', 'North America'], ['Mexico', 'North America'], ['United States', 'North America'],

  // Central America & Caribbean
  ['Antigua and Barbuda', 'Central America & Caribbean'], ['Bahamas', 'Central America & Caribbean'],
  ['Barbados', 'Central America & Caribbean'], ['Belize', 'Central America & Caribbean'],
  ['Costa Rica', 'Central America & Caribbean'], ['Cuba', 'Central America & Caribbean'],
  ['Dominica', 'Central America & Caribbean'], ['Dominican Republic', 'Central America & Caribbean'],
  ['El Salvador', 'Central America & Caribbean'], ['Grenada', 'Central America & Caribbean'],
  ['Guatemala', 'Central America & Caribbean'], ['Haiti', 'Central America & Caribbean'],
  ['Honduras', 'Central America & Caribbean'], ['Jamaica', 'Central America & Caribbean'],
  ['Nicaragua', 'Central America & Caribbean'], ['Panama', 'Central America & Caribbean'],
  ['Saint Kitts and Nevis', 'Central America & Caribbean'], ['Saint Lucia', 'Central America & Caribbean'],
  ['Saint Vincent and the Grenadines', 'Central America & Caribbean'],
  ['Trinidad and Tobago', 'Central America & Caribbean'],

  // South America
  ['Argentina', 'South America'], ['Bolivia', 'South America'], ['Brazil', 'South America'],
  ['Chile', 'South America'], ['Colombia', 'South America'], ['Ecuador', 'South America'],
  ['Guyana', 'South America'], ['Paraguay', 'South America'], ['Peru', 'South America'],
  ['Suriname', 'South America'], ['Uruguay', 'South America'], ['Venezuela', 'South America'],

  // Oceania
  ['Australia', 'Oceania'], ['Fiji', 'Oceania'], ['Kiribati', 'Oceania'],
  ['Marshall Islands', 'Oceania'], ['Micronesia', 'Oceania'], ['Nauru', 'Oceania'],
  ['New Zealand', 'Oceania'], ['Palau', 'Oceania'], ['Papua New Guinea', 'Oceania'],
  ['Samoa', 'Oceania'], ['Solomon Islands', 'Oceania'], ['Tonga', 'Oceania'],
  ['Tuvalu', 'Oceania'], ['Vanuatu', 'Oceania'],
]

/** Sorted country names for datalist pickers. */
export const COUNTRY_NAMES = RAW.map(([name]) => name).sort((a, b) => a.localeCompare(b))

/** All distinct regions. */
export const REGIONS = [...new Set(RAW.map(([, region]) => region))]

const regionByCountry = new Map(RAW.map(([name, region]) => [name.toLowerCase(), region]))

/**
 * Region for a country name (case-insensitive); empty string when unknown.
 * @param {string} country
 */
export function regionForCountry(country) {
  return regionByCountry.get(String(country).trim().toLowerCase()) ?? ''
}
