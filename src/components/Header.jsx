import { Menu, Search } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage.js'
import { useFactoryConfig } from '../config/useFactoryConfig.js'

/**
 * @param {{ title?: string; subtitle?: string; onMenuOpen: () => void; onSearch?: () => void }} props
 */
export default function Header({ title, subtitle, onMenuOpen, onSearch }) {
  const { language, setLanguage } = useLanguage()
  const { config, theme } = useFactoryConfig()

  return (
    <header className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          type="button"
          onClick={onMenuOpen}
          className="shrink-0 rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 md:hidden"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">
            {title ?? `Welcome, ${config.adminName}`}
          </h1>
          {subtitle && (
            <p className="mt-0.5 truncate text-sm text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {/* Search trigger */}
        {onSearch ? (
          <button
            type="button"
            onClick={onSearch}
            className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-400 hover:bg-white hover:border-slate-300 transition"
          >
            <Search size={13} />
            <span>Search…</span>
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-400">⌘K</kbd>
          </button>
        ) : null}
        {/* Language switcher */}
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-0.5">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            aria-pressed={language === 'en'}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
              language === 'en'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage('bg')}
            aria-pressed={language === 'bg'}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
              language === 'bg'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            BG
          </button>
        </div>

        {/* User pill */}
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div className={`rounded-full ${theme.iconBg} p-1`}>
            <span className="block h-3.5 w-3.5 rounded-full bg-white/30" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-slate-900 leading-none">{config.adminName}</p>
            <p className="mt-0.5 text-xs text-slate-400 leading-none">{config.adminRole}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
