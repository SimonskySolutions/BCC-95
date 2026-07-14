import { useCallback, useEffect, useMemo, useState } from 'react'
import { LanguageContext } from './LanguageContext.js'
import { TRANSLATIONS } from './translations.js'

const STORAGE_KEY = 'erp-dashboard-language'

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'en' || stored === 'bg') return stored
    } catch {
      /* ignore */
    }
    return 'en'
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language)
    } catch {
      /* ignore */
    }
    // Tell the browser which dictionary to use for native spell-checking.
    if (typeof document !== 'undefined') document.documentElement.lang = language
  }, [language])

  const setLanguage = useCallback((lang) => {
    if (lang === 'en' || lang === 'bg') setLanguageState(lang)
  }, [])

  const t = useCallback(
    (key, fallback) => {
      const dict = TRANSLATIONS[language] ?? TRANSLATIONS.en
      const enDict = TRANSLATIONS.en
      const localized = dict[key]
      if (localized != null && localized !== '') return localized
      const english = enDict[key]
      if (english != null && english !== '') return english
      if (fallback != null && fallback !== '') return String(fallback)
      return key
    },
    [language],
  )

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
