import { CalendarRange, ChevronDown, Download, Filter, UserCircle2 } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage.js'

/**
 * @param {{ title?: string; subtitle?: string }} props
 */
export default function Header({ title = 'Welcome back, Yanko Simonsky', subtitle }) {
  const { language, setLanguage, t } = useLanguage()

  return (
    <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {subtitle ?? t('header.subtitleFallback')}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-0.5">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
              language === 'en'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            aria-pressed={language === 'en'}
          >
            {t('header.langEn')}
          </button>
          <button
            type="button"
            onClick={() => setLanguage('bg')}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
              language === 'bg'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            aria-pressed={language === 'bg'}
          >
            {t('header.langBg')}
          </button>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
        >
          <CalendarRange size={15} />
          {t('header.dateRange')}
          <ChevronDown size={14} />
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
        >
          {t('header.monthly')}
          <ChevronDown size={14} />
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Filter size={15} />
          {t('header.filter')}
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Download size={15} />
          {t('header.export')}
        </button>

        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="rounded-full bg-white p-1 text-slate-500">
            <UserCircle2 size={20} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900">{t('header.userName')}</p>
            <p className="text-xs text-slate-500">{t('header.userRole')}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
