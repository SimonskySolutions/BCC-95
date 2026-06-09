import { useState } from 'react'
import { Check, Trash2, Plus } from 'lucide-react'
import { useFactoryConfig } from '../config/useFactoryConfig.js'
import { ACCENT_THEMES, CURRENCIES, DEFAULT_FACTORY_CONFIG } from '../config/factoryConfig.js'
import { ERP_NAV_ITEMS } from '../config/erpNav.js'
import { useDb } from '../data/useDb.js'
import { useLanguage } from '../i18n/useLanguage.js'
import { selectTermsOfDelivery, selectTermsOfPayment } from '../domains/quotations/selectors.js'
import { appendTerm, patchTerm, removeTerm } from '../domains/quotations/mutations.js'

const TABS = [
  { id: 'company', label: 'Company' },
  { id: 'modules', label: 'Modules' },
  { id: 'kpi', label: 'KPI Targets' },
  { id: 'terms', label: 'Offer terms' },
  { id: 'appearance', label: 'Appearance' },
]

const ALWAYS_ON = new Set(['dashboard', 'settings'])

const ACCENT_LABELS = {
  indigo: 'Indigo',
  blue: 'Blue',
  violet: 'Violet',
  emerald: 'Emerald',
  rose: 'Rose',
}

function SaveBanner({ saved }) {
  if (!saved) return null
  return (
    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm font-medium text-emerald-700">
      <Check size={15} />
      Settings saved
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-800">{label}</label>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  )
}

function Input({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition"
    />
  )
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition"
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

// ── Company tab ───────────────────────────────────────────────────────────────
function CompanyTab({ config, onSave }) {
  const [form, setForm] = useState({
    companyName: config.companyName,
    companySubtitle: config.companySubtitle,
    adminName: config.adminName,
    adminRole: config.adminRole,
    currency: config.currency,
  })
  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }))

  return (
    <div className="space-y-5">
      <Field label="Company name" hint="Shown in the sidebar header.">
        <Input value={form.companyName} onChange={set('companyName')} placeholder="BCC-95" />
      </Field>
      <Field label="Company subtitle" hint="Short descriptor under the company name.">
        <Input value={form.companySubtitle} onChange={set('companySubtitle')} placeholder="Manufacturing ERP" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Admin name" hint="Shown in the sidebar footer and header.">
          <Input value={form.adminName} onChange={set('adminName')} placeholder="Your name" />
        </Field>
        <Field label="Admin role" hint="Job title displayed under the name.">
          <Input value={form.adminRole} onChange={set('adminRole')} placeholder="Operations Director" />
        </Field>
      </div>
      <Field label="Currency" hint="Default currency used across financial views.">
        <Select value={form.currency} onChange={set('currency')} options={CURRENCIES} />
      </Field>
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setForm({
            companyName: DEFAULT_FACTORY_CONFIG.companyName,
            companySubtitle: DEFAULT_FACTORY_CONFIG.companySubtitle,
            adminName: DEFAULT_FACTORY_CONFIG.adminName,
            adminRole: DEFAULT_FACTORY_CONFIG.adminRole,
            currency: DEFAULT_FACTORY_CONFIG.currency,
          })}
          className="text-sm text-slate-500 hover:text-slate-800 transition"
        >
          Reset to defaults
        </button>
        <button
          type="button"
          onClick={() => onSave(form)}
          className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
        >
          Save company settings
        </button>
      </div>
    </div>
  )
}

// ── Modules tab ───────────────────────────────────────────────────────────────
function ModulesTab({ config, onSave }) {
  const [enabled, setEnabled] = useState(new Set(config.enabledModules))

  function toggle(id) {
    if (ALWAYS_ON.has(id)) return
    setEnabled((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Toggle which modules appear in the sidebar. Dashboard and Settings are always visible.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {ERP_NAV_ITEMS.map((item) => {
          const on = enabled.has(item.id)
          const locked = ALWAYS_ON.has(item.id)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              disabled={locked}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                on
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
              } ${locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className="text-sm font-medium capitalize">{item.id.replace(/-/g, ' ')}</span>
              <span className={`text-xs font-semibold ${on ? 'text-white/70' : 'text-slate-400'}`}>
                {locked ? 'always on' : on ? 'on' : 'off'}
              </span>
            </button>
          )
        })}
      </div>
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={() => onSave({ enabledModules: [...enabled] })}
          className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
        >
          Save module settings
        </button>
      </div>
    </div>
  )
}

// ── KPI Targets tab ───────────────────────────────────────────────────────────
function KpiTab({ config, onSave }) {
  const [targets, setTargets] = useState({ ...config.kpiTargets })
  const set = (key) => (val) => setTargets((t) => ({ ...t, [key]: Number(val) }))

  const fields = [
    { key: 'deliveryPercent', label: 'Delivery on-time target', color: 'blue' },
    { key: 'productivityPercent', label: 'Productivity throughput target', color: 'violet' },
    { key: 'qualityPercent', label: 'Quality first-pass yield target', color: 'emerald' },
    { key: 'processPercent', label: 'Process completion target', color: 'amber' },
  ]

  const trackColor = { blue: '#3b82f6', violet: '#7c3aed', emerald: '#059669', amber: '#d97706' }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        Set the minimum % that each KPI must reach to be shown as healthy (green). Below this threshold the card turns red.
      </p>
      {fields.map(({ key, label, color }) => (
        <Field key={key} label={label} hint={`Current target: ${targets[key]}%`}>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={targets[key]}
              onChange={(e) => set(key)(e.target.value)}
              style={{ accentColor: trackColor[color] }}
              className="flex-1"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={targets[key]}
              onChange={(e) => set(key)(e.target.value)}
              className="w-16 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-center text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
            />
            <span className="text-sm text-slate-400">%</span>
          </div>
        </Field>
      ))}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setTargets({ ...DEFAULT_FACTORY_CONFIG.kpiTargets })}
          className="text-sm text-slate-500 hover:text-slate-800 transition"
        >
          Reset to defaults
        </button>
        <button
          type="button"
          onClick={() => onSave({ kpiTargets: targets })}
          className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
        >
          Save KPI targets
        </button>
      </div>
    </div>
  )
}

// ── Appearance tab ────────────────────────────────────────────────────────────
function AppearanceTab({ config, onSave }) {
  const [accentColor, setAccentColor] = useState(config.accentColor)

  return (
    <div className="space-y-6">
      <Field label="Accent colour" hint="Sets the sidebar active state, buttons, and gradient banner.">
        <div className="flex flex-wrap gap-3 mt-3">
          {Object.entries(ACCENT_LABELS).map(([key, label]) => {
            const t = ACCENT_THEMES[key]
            const active = accentColor === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setAccentColor(key)}
                className={`flex items-center gap-2.5 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition ${
                  active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                <span className={`h-4 w-4 rounded-full ${t.swatch}`} />
                {label}
              </button>
            )
          })}
        </div>
      </Field>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Preview</p>
        <div className={`rounded-xl p-4 bg-gradient-to-br ${ACCENT_THEMES[accentColor].gradientFrom} ${ACCENT_THEMES[accentColor].gradientTo}`}>
          <p className="text-xs font-semibold text-white/60 uppercase tracking-widest">Live operations</p>
          <p className="mt-1 text-xl font-bold text-white">{config.companyName}</p>
          <div className="mt-3 flex gap-2">
            <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${ACCENT_THEMES[accentColor].badge}`}>Active</span>
            <span className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${ACCENT_THEMES[accentColor].activeItemBg}`}>Button</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={() => onSave({ accentColor })}
          className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
        >
          Save appearance
        </button>
      </div>
    </div>
  )
}

// ── Offer terms tab ─────────────────────────────────────────────────────────
/**
 * @param {{ title: string; table: 'termsOfDelivery'|'termsOfPayment'; terms: { id: string; code?: string; label: string }[]; db: import('../data/mockDatabase.js').MockDatabase; commit: (fn: (db: any) => void) => void }} props
 */
function TermsList({ title, table, terms, db, commit }) {
  const { t } = useLanguage()
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')

  const add = () => {
    if (!label.trim()) return
    commit(() => appendTerm(db, table, { code: code.trim() || undefined, label: label.trim() }))
    setCode('')
    setLabel('')
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <div className="mt-3 space-y-2">
        {terms.length === 0 ? (
          <p className="text-xs text-slate-400">{t('settings.terms.empty')}</p>
        ) : null}
        {terms.map((tm) => (
          <div key={tm.id} className="flex items-center gap-2">
            <input
              className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={tm.code ?? ''}
              placeholder={t('settings.terms.code')}
              onChange={(e) => commit(() => patchTerm(db, table, tm.id, { code: e.target.value }))}
            />
            <input
              className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={tm.label}
              onChange={(e) => commit(() => patchTerm(db, table, tm.id, { label: e.target.value }))}
            />
            <button
              type="button"
              onClick={() => commit(() => removeTerm(db, table, tm.id))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              title={t('settings.terms.remove')}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
        <input
          className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          value={code}
          placeholder={t('settings.terms.code')}
          onChange={(e) => setCode(e.target.value)}
        />
        <input
          className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          value={label}
          placeholder={t('settings.terms.labelPlaceholder')}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add() }}
        />
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
        >
          <Plus size={13} /> {t('settings.terms.add')}
        </button>
      </div>
    </div>
  )
}

function OfferTermsTab() {
  const { t } = useLanguage()
  const { db, commit } = useDb()
  return (
    <div className="space-y-8">
      <p className="text-xs text-slate-500">{t('settings.terms.intro')}</p>
      <TermsList title={t('offer.details.termsOfDelivery')} table="termsOfDelivery" terms={selectTermsOfDelivery(db)} db={db} commit={commit} />
      <TermsList title={t('offer.details.termsOfPayment')} table="termsOfPayment" terms={selectTermsOfPayment(db)} db={db} commit={commit} />
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { config, updateConfig } = useFactoryConfig()
  const [tab, setTab] = useState('company')
  const [saved, setSaved] = useState(false)

  function handleSave(patch) {
    updateConfig(patch)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            type="button"
            onClick={() => setTab(tabItem.id)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
              tab === tabItem.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* Save confirmation */}
      <SaveBanner saved={saved} />

      {/* Tab content */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {tab === 'company'    && <CompanyTab    config={config} onSave={handleSave} />}
        {tab === 'modules'    && <ModulesTab    config={config} onSave={handleSave} />}
        {tab === 'kpi'        && <KpiTab        config={config} onSave={handleSave} />}
        {tab === 'terms'      && <OfferTermsTab />}
        {tab === 'appearance' && <AppearanceTab config={config} onSave={handleSave} />}
      </div>
    </div>
  )
}
