import { createContext } from 'react'

/** @type {import('react').Context<{ language: 'en' | 'bg'; setLanguage: (lang: 'en' | 'bg') => void; t: (key: string, fallback?: string) => string } | null>} */
export const LanguageContext = createContext(null)
