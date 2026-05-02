import { useContext } from 'react'
import { FactoryConfigContext } from './FactoryConfigContext.js'
import { ACCENT_THEMES } from './factoryConfig.js'

export function useFactoryConfig() {
  const ctx = useContext(FactoryConfigContext)
  if (!ctx) throw new Error('useFactoryConfig must be used within FactoryConfigProvider')
  const theme = ACCENT_THEMES[ctx.config.accentColor] ?? ACCENT_THEMES.indigo
  return { ...ctx, theme }
}
