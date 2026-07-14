import { createContext } from 'react'

/** @type {import('react').Context<{ theme: 'light' | 'dark'; setTheme: (t: 'light' | 'dark') => void; toggle: () => void } | null>} */
export const ThemeContext = createContext(null)

export const THEME_STORAGE_KEY = 'bcc95:theme'
