export const STORAGE_KEY = 'bcc95:factory-config'

/** @typedef {{ deliveryPercent: number; qualityPercent: number; productivityPercent: number; processPercent: number }} KpiTargets */
/** @typedef {{ companyName: string; companySubtitle: string; adminName: string; adminRole: string; currency: string; accentColor: string; enabledModules: string[]; kpiTargets: KpiTargets }} FactoryConfig */

/** @type {FactoryConfig} */
export const DEFAULT_FACTORY_CONFIG = {
  companyName: 'BCC-95',
  companySubtitle: 'Manufacturing ERP',
  adminName: 'Yanko Simonsky',
  adminRole: 'Operations Director',
  currency: 'BGN',
  accentColor: 'indigo',
  enabledModules: [
    'dashboard', 'products', 'quotations', 'tasks', 'planning', 'manufacturing',
    'machines', 'inventory', 'purchase', 'shipping', 'people',
    'quality', 'analytics', 'reports', 'ai-agents', 'crm',
    'documentation', 'settings',
  ],
  kpiTargets: {
    deliveryPercent: 90,
    qualityPercent: 90,
    productivityPercent: 50,
    processPercent: 70,
  },
}

// All class strings are written in full so Tailwind JIT includes them.
export const ACCENT_THEMES = {
  indigo: {
    iconBg: 'bg-indigo-600',
    iconBgLight: 'bg-indigo-50',
    iconText: 'text-indigo-600',
    primaryBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    badge: 'bg-indigo-100 text-indigo-700',
    swatch: 'bg-indigo-500',
    activeItemBg: 'bg-indigo-600',
    borderAccent: 'border-l-indigo-500',
    gradientFrom: 'from-indigo-600',
    gradientTo: 'to-violet-600',
  },
  blue: {
    iconBg: 'bg-blue-600',
    iconBgLight: 'bg-blue-50',
    iconText: 'text-blue-600',
    primaryBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
    badge: 'bg-blue-100 text-blue-700',
    swatch: 'bg-blue-500',
    activeItemBg: 'bg-blue-600',
    borderAccent: 'border-l-blue-500',
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-cyan-500',
  },
  violet: {
    iconBg: 'bg-violet-600',
    iconBgLight: 'bg-violet-50',
    iconText: 'text-violet-600',
    primaryBtn: 'bg-violet-600 hover:bg-violet-700 text-white',
    badge: 'bg-violet-100 text-violet-700',
    swatch: 'bg-violet-500',
    activeItemBg: 'bg-violet-600',
    borderAccent: 'border-l-violet-500',
    gradientFrom: 'from-violet-600',
    gradientTo: 'to-purple-600',
  },
  emerald: {
    iconBg: 'bg-emerald-600',
    iconBgLight: 'bg-emerald-50',
    iconText: 'text-emerald-600',
    primaryBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    badge: 'bg-emerald-100 text-emerald-700',
    swatch: 'bg-emerald-500',
    activeItemBg: 'bg-emerald-600',
    borderAccent: 'border-l-emerald-500',
    gradientFrom: 'from-emerald-600',
    gradientTo: 'to-teal-500',
  },
  rose: {
    iconBg: 'bg-rose-600',
    iconBgLight: 'bg-rose-50',
    iconText: 'text-rose-600',
    primaryBtn: 'bg-rose-600 hover:bg-rose-700 text-white',
    badge: 'bg-rose-100 text-rose-700',
    swatch: 'bg-rose-500',
    activeItemBg: 'bg-rose-600',
    borderAccent: 'border-l-rose-500',
    gradientFrom: 'from-rose-600',
    gradientTo: 'to-pink-500',
  },
}

export const CURRENCIES = ['BGN', 'EUR', 'USD', 'GBP', 'CHF', 'JPY']
