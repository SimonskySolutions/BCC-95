/**
 * Localised display names for the built-in roles. The DB stores a single
 * canonical `name`; this maps the known role ids to EN/BG labels for the UI.
 */
const ROLE_LABELS = {
  'role-admin': { en: 'Admin', bg: 'Админ' },
  'role-manager': { en: 'Manager', bg: 'Мениджър' },
  'role-mechanic': { en: 'Mechanic', bg: 'КТО' },
  'role-logistics': { en: 'Logistics', bg: 'Логистика' },
  'role-marketing': { en: 'Marketing', bg: 'Маркетинг' },
  'role-accountant': { en: 'Accountant', bg: 'Счетоводител' },
}

/**
 * @param {{ id?: string, name?: string }} role
 * @param {'en' | 'bg'} [language]
 */
export function roleLabel(role, language = 'en') {
  if (!role) return ''
  const entry = ROLE_LABELS[role.id]
  return entry ? entry[language] ?? entry.en : role.name ?? role.id ?? ''
}
