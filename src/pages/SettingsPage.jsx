import { useLanguage } from '../i18n/useLanguage.js'

export default function SettingsPage() {
  const { t } = useLanguage()

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-card">
      <p className="font-semibold text-slate-900">{t('settings.title')}</p>
      <p className="mt-2">{t('settings.body')}</p>
    </div>
  )
}
