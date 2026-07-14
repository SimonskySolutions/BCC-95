import { useState } from 'react'
import { Plus, Trash2, RotateCcw } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage.js'
import { DRIVER_METHODS, buildDefaultCostDrivers, getCustomMethods } from '../config/factoryConfig.js'
import CustomMethodsEditor from './CustomMethodsEditor.jsx'

const GROUPS = ['material', 'operation', 'tooling', 'other', 'logistics']

/**
 * Configure which calculation methods (cost drivers) are offered in each cost
 * section, and their labels. Creating a driver requires choosing its section.
 * The underlying formulas are built-in; this controls availability + naming.
 *
 * @param {{ config: any, onSave: (patch: any) => void }} props
 */
export default function CostDriversAdmin({ config, onSave }) {
  const { t } = useLanguage()
  const drivers = config.costDrivers?.length ? config.costDrivers : buildDefaultCostDrivers()
  const [form, setForm] = useState({ method: 'count', group: 'material', label: '' })
  const [err, setErr] = useState(/** @type {string | null} */ (null))

  const customMethods = getCustomMethods(config)
  const save = (next) => onSave({ costDrivers: next })
  const methodLabel = (m) => customMethods.find((c) => c.key === m)?.label || t(`cost.driver.${m}`, m)
  const groupLabel = (g) => t(`cost.group.${g}`, g)
  const allMethods = [...DRIVER_METHODS, ...customMethods.map((c) => c.key)]

  function addDriver() {
    if (!form.group) { setErr(t('drivers.needSection')); return }
    if (drivers.some((d) => d.method === form.method && d.group === form.group)) { setErr(t('drivers.dup')); return }
    save([...drivers, { id: `${form.group}-${form.method}-${Date.now().toString(36)}`, method: form.method, group: form.group, label: form.label.trim() || undefined }])
    setForm((f) => ({ ...f, label: '' }))
    setErr(null)
  }
  const remove = (id) => save(drivers.filter((d) => d.id !== id))
  const setLabel = (id, label) => save(drivers.map((d) => (d.id === id ? { ...d, label: label || undefined } : d)))

  const input = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200'

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">{t('drivers.intro')}</p>

      {/* Create a driver — section is required */}
      <div className="rounded-2xl border border-slate-200 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('drivers.add')}</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="text-xs font-medium text-slate-600">{t('drivers.method')}
            <select className={input} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              {allMethods.map((m) => <option key={m} value={m}>{methodLabel(m)}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">{t('drivers.section')} *
            <select className={input} value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })}>
              {GROUPS.map((g) => <option key={g} value={g}>{groupLabel(g)}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">{t('drivers.label')}
            <input className={input} value={form.label} placeholder={methodLabel(form.method)}
              onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </label>
          <button type="button" onClick={addDriver}
            className="mt-auto inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            <Plus size={14} /> {t('drivers.addBtn')}
          </button>
        </div>
        {err ? <p className="mt-2 text-xs font-medium text-rose-600">{err}</p> : null}
      </div>

      {/* By section */}
      {GROUPS.map((g) => {
        const list = drivers.filter((d) => d.group === g)
        return (
          <div key={g}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{groupLabel(g)} · {list.length}</p>
            {list.length === 0 ? (
              <p className="pl-1 text-xs text-slate-300">{t('drivers.none')}</p>
            ) : (
              <ul className="space-y-1">
                {list.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5">
                    <span className="w-28 shrink-0 text-xs font-medium text-slate-500">{methodLabel(d.method)}</span>
                    <input className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-sm" value={d.label ?? ''}
                      placeholder={methodLabel(d.method)} onChange={(e) => setLabel(d.id, e.target.value)} />
                    <button type="button" onClick={() => remove(d.id)}
                      className="rounded-md p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600" title={t('drivers.remove')}>
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}

      <button type="button" onClick={() => save(buildDefaultCostDrivers())}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800">
        <RotateCcw size={13} /> {t('drivers.reset')}
      </button>

      <CustomMethodsEditor config={config} onSave={onSave} />
    </div>
  )
}
