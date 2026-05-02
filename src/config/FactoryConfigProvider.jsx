import { useCallback, useMemo, useState } from 'react'
import { FactoryConfigContext } from './FactoryConfigContext.js'
import { DEFAULT_FACTORY_CONFIG, STORAGE_KEY } from './factoryConfig.js'

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function FactoryConfigProvider({ children }) {
  const [config, setConfig] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...DEFAULT_FACTORY_CONFIG, ...parsed, kpiTargets: { ...DEFAULT_FACTORY_CONFIG.kpiTargets, ...parsed.kpiTargets } }
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_FACTORY_CONFIG
  })

  const updateConfig = useCallback((patch) => {
    setConfig((prev) => {
      const next = {
        ...prev,
        ...patch,
        kpiTargets: patch.kpiTargets
          ? { ...prev.kpiTargets, ...patch.kpiTargets }
          : prev.kpiTargets,
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const value = useMemo(() => ({ config, updateConfig }), [config, updateConfig])

  return <FactoryConfigContext.Provider value={value}>{children}</FactoryConfigContext.Provider>
}
