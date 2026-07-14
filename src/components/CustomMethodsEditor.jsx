import { useState } from 'react'
import { Plus, Trash2, FunctionSquare } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage.js'
import { validateFormula, evaluateFormula } from '../lib/formula.js'

/** Turn a label into a safe formula variable name. */
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'x'

/**
 * Build user-defined calculation methods: named numeric fields + a math formula
 * over them (and `netKg`, `costBase`). Evaluated by the safe formula engine.
 *
 * @param {{ config: any, onSave: (patch: any) => void }} props
 */
export default function CustomMethodsEditor({ config, onSave }) {
  const { t } = useLanguage()
  const methods = config.customMethods ?? []
  const [draft, setDraft] = useState({ label: '', fields: [{ name: '', label: '', suffix: '' }], formula: '' })
  const [err, setErr] = useState(/** @type {string | null} */ (null))

  const save = (next) => onSave({ customMethods: next })
  const setField = (i, patch) => setDraft((d) => ({ ...d, fields: d.fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) }))
  const addField = () => setDraft((d) => ({ ...d, fields: [...d.fields, { name: '', label: '', suffix: '' }] }))
  const removeField = (i) => setDraft((d) => ({ ...d, fields: d.fields.filter((_, idx) => idx !== i) }))

  const draftFieldNames = draft.fields.map((f) => slug(f.name || f.label)).filter(Boolean)
  const sampleVars = { ...Object.fromEntries(draftFieldNames.map((n) => [n, 10])), netKg: 10, costBase: 100 }
  const formulaError = draft.formula ? validateFormula(draft.formula, draftFieldNames) : null
  const preview = draft.formula && !formulaError ? evaluateFormula(draft.formula, sampleVars) : null

  function create() {
    if (!draft.label.trim()) { setErr(t('cm.needLabel')); return }
    const fields = draft.fields
      .map((f) => ({ name: slug(f.name || f.label), label: (f.label || f.name).trim(), suffix: f.suffix.trim() || undefined }))
      .filter((f) => f.name && f.label)
    if (!fields.length) { setErr(t('cm.needField')); return }
    const v = validateFormula(draft.formula, fields.map((f) => f.name))
    if (v) { setErr(`${t('cm.badFormula')} (${v})`); return }
    save([...methods, { key: `cm-${Date.now().toString(36)}`, label: draft.label.trim(), fields, formula: draft.formula.trim() }])
    setDraft({ label: '', fields: [{ name: '', label: '', suffix: '' }], formula: '' })
    setErr(null)
  }
  const remove = (key) => save(methods.filter((m) => m.key !== key))

  const input = 'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200'

  return (
    <div className="space-y-4 border-t border-slate-200 pt-5">
      <div>
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><FunctionSquare size={15} /> {t('cm.title')}</h4>
        <p className="text-xs text-slate-500">{t('cm.intro')}</p>
      </div>

      {/* Existing custom methods */}
      {methods.length > 0 ? (
        <ul className="space-y-1.5">
          {methods.map((m) => (
            <li key={m.key} className="flex items-start gap-2 rounded-lg border border-slate-100 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-800">{m.label}</div>
                <div className="text-[11px] text-slate-500">
                  {m.fields.map((f) => f.label).join(' · ')} → <code className="rounded bg-slate-100 px-1">{m.formula}</code>
                </div>
              </div>
              <button type="button" onClick={() => remove(m.key)} className="rounded-md p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600" title={t('cm.remove')}>
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {/* New method */}
      <div className="space-y-3 rounded-2xl border border-slate-200 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('cm.add')}</p>
        <label className="block text-xs font-medium text-slate-600">{t('cm.label')}
          <input className={`${input} w-full`} value={draft.label} placeholder="напр. Галванично покритие"
            onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
        </label>

        <div>
          <p className="mb-1 text-xs font-medium text-slate-600">{t('cm.fields')}</p>
          <div className="space-y-1.5">
            {draft.fields.map((f, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_70px_auto] items-center gap-1.5">
                <input className={input} value={f.label} placeholder={t('cm.fieldLabel')} onChange={(e) => setField(i, { label: e.target.value })} />
                <input className={input} value={f.name} placeholder={`${t('cm.var')} (${slug(f.name || f.label)})`} onChange={(e) => setField(i, { name: e.target.value })} />
                <input className={input} value={f.suffix} placeholder={t('cm.suffix')} onChange={(e) => setField(i, { suffix: e.target.value })} />
                <button type="button" onClick={() => removeField(i)} className="rounded-md p-1 text-slate-300 hover:text-rose-600"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addField} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
            <Plus size={12} /> {t('cm.addField')}
          </button>
        </div>

        <label className="block text-xs font-medium text-slate-600">{t('cm.formula')}
          <input className={`${input} w-full font-mono`} value={draft.formula} placeholder="area * rate * (1 + waste/100)"
            onChange={(e) => setDraft({ ...draft, formula: e.target.value })} />
        </label>
        <p className="text-[11px] text-slate-400">
          {t('cm.vars')}: {[...draftFieldNames, 'netKg', 'costBase'].join(', ')}
          {draft.formula && !formulaError ? <> · {t('cm.preview')}: <span className="font-medium text-slate-600">{Number(preview).toFixed(2)}</span> ({t('cm.sample')})</> : null}
          {formulaError ? <span className="text-rose-600"> · {t('cm.invalid')}: {formulaError}</span> : null}
        </p>

        {err ? <p className="text-xs font-medium text-rose-600">{err}</p> : null}
        <button type="button" onClick={create}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          <Plus size={14} /> {t('cm.create')}
        </button>
      </div>
    </div>
  )
}
