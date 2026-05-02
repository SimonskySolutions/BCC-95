import { createContext } from 'react'

/**
 * @type {import('react').Context<{
 *   config: import('./factoryConfig.js').FactoryConfig;
 *   updateConfig: (patch: Partial<import('./factoryConfig.js').FactoryConfig>) => void;
 * } | null>}
 */
export const FactoryConfigContext = createContext(null)
