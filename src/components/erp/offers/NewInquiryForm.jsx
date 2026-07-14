import { useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { startNewInquiry } from '../../../services/offers/newInquiryService.js'
import { countryNames, localizedCountryName, REGIONS, regionForCountry } from '../../../lib/countries.js'
import { lookupCompany, parseRegisteredAddress, searchRegistry } from '../../../lib/registry.js'
import { PRODUCT_TYPES } from '../../../domains/products/model.js'
import AddressMap from '../../AddressMap.jsx'
import DatePicker from '../../DatePicker.jsx'
import AttachmentEditor from './AttachmentEditor.jsx'

const UOM_OPTIONS = ['ea', 'kg', 'g', 'm', 'cm', 'mm', 'm²', 'm³', 'l', 'ml', 'pc', 'set', 'lot']

/**
 * Inquiry-first entry form: captures client + product + quantity in one
 * place and creates all three records atomically via `startNewInquiry`.
 *
 * @param {{
 *   db: import('../../../data/mockDatabase.js').MockDatabase
 *   onCreated?: (productId: string) => void
 *   onCancel?: () => void
 * }} props
 */
export default function NewInquiryForm({ db, onCreated, onCancel }) {
  const { t, language } = useLanguage()
  const [mode, setMode] = useState(/** @type {'new'|'existing'} */ ('new'))
  const [form, setForm] = useState(() => ({
    existingId: db.clients[0]?.id ?? '',
    eik: '',
    vat: '',
    address: '',
    clientName: '',
    contactName: '',
    contactEmail: '',
    country: '',
    city: '',
    region: '',
    channel: /** @type {import('../../../domains/inquiries/model.js').InquiryChannel} */ ('email'),
    spokenLanguage: /** @type {'bg' | 'en'} */ ('bg'),
    products: /** @type {{ name: string; description: string; type: string; uom: string; quantities: number[]; qtyInput: string }[]} */ ([
      { name: '', description: '', type: 'finished_good', uom: 'ea', quantities: [], qtyInput: '' },
    ]),
    requestedDeadline: '',
    summary: '',
    specificationNote: '',
    attachments: /** @type {import('../../../domains/inquiries/model.js').InquiryAttachment[]} */ ([]),
    noAttachments: false,
    taskTech: '',
    taskCost: '',
    extraTasks: /** @type {{ title: string; assigneeId: string }[]} */ ([]),
  }))
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [submitting, setSubmitting] = useState(false)

  // Company-registry (VIES) auto-fill from ЕИК / VAT.
  const [lookupBusy, setLookupBusy] = useState(false)
  const [lookupMsg, setLookupMsg] = useState(/** @type {null | { ok: boolean; text: string }} */ (null))

  async function lookupRegistry(idArg) {
    const id = (typeof idArg === 'string' ? idArg : form.eik).trim()
    if (!id || lookupBusy) return
    setLookupBusy(true)
    setLookupMsg(null)
    try {
      const d = await lookupCompany(id)
      if (!d) { setLookupMsg({ ok: false, text: t('registry.unavailable', 'Registry unavailable — try again later.') }); return }
      const c = d.company
      if (!c) { setLookupMsg({ ok: false, text: t('registry.notFound', 'No company found for this ЕИК/VAT.') }); return }
      const country = localizedCountryName(c.country_code, language) || form.country
      const parsed = parseRegisteredAddress(c.address)
      setForm((f) => ({
        ...f,
        clientName: c.legal_name || f.clientName,
        eik: c.eik || f.eik,
        vat: c.vat || f.vat,
        address: c.address || f.address,
        city: parsed.city || f.city,
        country,
        region: regionForCountry(country) || f.region,
      }))
      const suffix = d.valid ? '' : ` — ${t('registry.noVat', 'no VAT registration')}`
      setLookupMsg({ ok: true, text: (c.legal_name || t('registry.found', 'Company found.')) + suffix })
    } finally {
      setLookupBusy(false)
    }
  }

  // Live name suggestions from the BG Commercial Register (type in BG or EN).
  const [nameSugs, setNameSugs] = useState(/** @type {{ eik: string; name: string; fullName: string }[]} */ ([]))
  const [sugBusy, setSugBusy] = useState(false)
  const sugSkipRef = useRef(false)

  useEffect(() => {
    if (mode !== 'new') return undefined
    if (sugSkipRef.current) { sugSkipRef.current = false; return undefined }
    const q = form.clientName.trim()
    if (q.length < 3) { setNameSugs([]); setSugBusy(false); return undefined }
    let alive = true
    setSugBusy(true)
    const timer = setTimeout(async () => {
      const rows = await searchRegistry(q)
      if (!alive) return
      setNameSugs(rows)
      setSugBusy(false)
    }, 350)
    return () => { alive = false; clearTimeout(timer) }
  }, [form.clientName, mode])

  function pickSuggestion(s) {
    sugSkipRef.current = true
    setNameSugs([])
    setSugBusy(false)
    setForm((f) => ({ ...f, clientName: s.name, eik: s.eik }))
    lookupRegistry(s.eik)
  }

  // Local-AI assist: paste an email/RFQ and prefill the form (human reviews).
  const [aiAvailable, setAiAvailable] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiText, setAiText] = useState('')
  const [aiBusy, setAiBusy] = useState(false)

  useEffect(() => {
    fetch('/api/ai/status').then((r) => (r.ok ? r.json() : null)).then((d) => setAiAvailable(!!d?.available)).catch(() => {})
  }, [])

  async function aiExtract() {
    if (!aiText.trim()) return
    setAiBusy(true)
    setError(null)
    try {
      const d = await fetch('/api/ai/extract-inquiry', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: aiText }),
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
      if (!d) { setError(t('ai.unavailable')); return }
      setMode('new')
      const qs = Array.isArray(d.quantities) ? d.quantities.filter((n) => Number(n) > 0) : []
      setForm((f) => ({
        ...f,
        clientName: d.customer ?? f.clientName,
        contactName: d.contact ?? f.contactName,
        contactEmail: d.email ?? f.contactEmail,
        products: [{ ...f.products[0], name: d.product ?? f.products[0].name, quantities: qs.length ? qs : f.products[0].quantities, qtyInput: qs.length ? qs.join(', ') : f.products[0].qtyInput }],
        summary: [d.summary, d.material && `${t('ai.material')}: ${d.material}`, d.deadline && `${t('ai.deadline')}: ${d.deadline}`].filter(Boolean).join(' · ') || f.summary,
        specificationNote: d.missing?.length ? `${t('ai.missing')}: ${d.missing.join(', ')}` : f.specificationNote,
      }))
      setAiOpen(false)
    } finally { setAiBusy(false) }
  }

  const employees = (db.employees ?? []).filter((e) => e.active !== false)

  const validation = useMemo(() => {
    const problems = /** @type {string[]} */ ([])
    if (mode === 'new' && !form.clientName.trim()) problems.push('clientName')
    if (!form.products[0]?.name.trim()) problems.push('productName')
    if (!(form.products[0]?.quantities.length > 0)) problems.push('quantity')
    return problems
  }, [mode, form])

  function submit() {
    setError(null)
    if (validation.length) {
      setError(t('newInquiry.validation'))
      return
    }
    setSubmitting(true)
    try {
      const result = startNewInquiry(db, {
        client:
          mode === 'existing'
            ? { existingId: form.existingId, spokenLanguage: form.spokenLanguage }
            : {
                name: form.clientName.trim(),
                contactName: form.contactName.trim() || undefined,
                contactEmail: form.contactEmail.trim() || undefined,
                country: form.country.trim() || undefined,
                city: form.city.trim() || undefined,
                region: form.region.trim() || regionForCountry(form.country) || undefined,
                spokenLanguage: form.spokenLanguage,
                eik: form.eik.trim() || undefined,
                vat: form.vat.trim() || undefined,
                address: form.address.trim() || undefined,
              },
        product: {
          name: form.products[0].name.trim(),
          description: form.products[0].description.trim() || undefined,
          type: form.products[0].type,
          uom: form.products[0].uom,
        },
        inquiry: {
          channel: form.channel,
          requestedQuantity: form.products[0].quantities[0],
          requestedQuantities: form.products[0].quantities,
          extraProducts: form.products
            .slice(1)
            .filter((p) => p.name.trim())
            .map((p) => ({ name: p.name.trim(), description: p.description.trim() || undefined, type: p.type, uom: p.uom, quantities: p.quantities })),
          requestedDeadline: form.requestedDeadline || undefined,
          summary: form.summary.trim() || undefined,
          specificationNote: form.specificationNote.trim() || undefined,
          attachments: form.attachments,
          noAttachments: form.noAttachments,
        },
        tasks: {
          techAssigneeId: form.taskTech || undefined,
          costAssigneeId: form.taskCost || undefined,
          extra: form.extraTasks.filter((x) => x.title.trim()),
        },
      })
      if (!result.ok) {
        setError(t(`newInquiry.error.${result.code}`, result.code))
        return
      }
      onCreated?.(result.product.id)
    } finally {
      setSubmitting(false)
    }
  }

  const isInvalid = (key) => validation.includes(key)
  const inputCls =
    'mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm'
  const invalidCls = 'border-rose-400 bg-rose-50'

  const setProduct = (idx, patch) =>
    setForm((f) => ({ ...f, products: f.products.map((p, i) => (i === idx ? { ...p, ...patch } : p)) }))
  const addProductRow = () =>
    setForm((f) => ({ ...f, products: [...f.products, { name: '', description: '', type: 'finished_good', uom: 'ea', quantities: [], qtyInput: '' }] }))
  const removeProductRow = (idx) =>
    setForm((f) => ({ ...f, products: f.products.filter((_, i) => i !== idx) }))
  const addQty = (idx) =>
    setForm((f) => ({
      ...f,
      products: f.products.map((p, i) => {
        if (i !== idx) return p
        const n = Number(p.qtyInput)
        if (!Number.isFinite(n) || n <= 0) return p
        return { ...p, quantities: [...p.quantities, n], qtyInput: '' }
      }),
    }))
  const removeQty = (idx, qi) =>
    setForm((f) => ({ ...f, products: f.products.map((p, i) => (i === idx ? { ...p, quantities: p.quantities.filter((_, j) => j !== qi) } : p)) }))

  return (
    <div className="space-y-5">
      {aiAvailable ? (
        <section className="rounded-xl border border-violet-200 bg-violet-50/50 p-3">
          {!aiOpen ? (
            <button type="button" onClick={() => setAiOpen(true)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700 hover:text-violet-900">
              <Sparkles size={15} /> {t('ai.suggestFromText')}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-violet-700"><Sparkles size={14} /> {t('ai.suggestFromText')}</p>
              <textarea
                className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
                rows={5}
                placeholder={t('ai.pastePlaceholder')}
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <button type="button" onClick={aiExtract} disabled={aiBusy || !aiText.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
                  <Sparkles size={13} /> {aiBusy ? t('ai.thinking') : t('ai.extract')}
                </button>
                <button type="button" onClick={() => setAiOpen(false)} className="text-xs text-slate-500 hover:text-slate-800">{t('common.cancel')}</button>
                <span className="text-[11px] text-slate-400">{t('ai.localNote')}</span>
              </div>
            </div>
          )}
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">
          {t('newInquiry.section.customer')}
        </h3>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setMode('new')}
            className={`rounded-full px-3 py-1 font-medium ${
              mode === 'new' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {t('newInquiry.customer.new')}
          </button>
          <button
            type="button"
            onClick={() => setMode('existing')}
            disabled={db.clients.length === 0}
            className={`rounded-full px-3 py-1 font-medium disabled:opacity-40 ${
              mode === 'existing' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {t('newInquiry.customer.existing')}
          </button>
        </div>

        {mode === 'existing' ? (
          <label className="block text-xs font-medium text-slate-600">
            {t('newInquiry.existingClient')}
            <select
              className={inputCls}
              value={form.existingId}
              onChange={(e) => setForm({ ...form, existingId: e.target.value })}
            >
              {db.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600">
                {t('registry.eik', 'ЕИК / VAT')}
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  className={inputCls}
                  value={form.eik}
                  onChange={(e) => setForm({ ...form, eik: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lookupRegistry() } }}
                  placeholder="131071587 / BG131071587"
                />
                <button
                  type="button"
                  onClick={lookupRegistry}
                  disabled={lookupBusy || !form.eik.trim()}
                  className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {lookupBusy ? t('registry.looking', 'Looking…') : t('registry.lookup', 'Auto-fill')}
                </button>
              </div>
              {lookupMsg ? (
                <p className={`mt-1 text-[11px] ${lookupMsg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{lookupMsg.text}</p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400">{t('registry.hint', 'Enter ЕИК (BG) or full EU VAT and auto-fill from the register.')}</p>
              )}
              {form.address ? <p className="mt-1 text-[11px] text-slate-500">{form.address}</p> : null}
              <AddressMap address={form.address} city={form.city} country={form.country} className="mt-2" />
            </div>
            <label className="relative block text-xs font-medium text-slate-600 md:col-span-2">
              {t('newInquiry.clientName')} *
              <input
                className={`${inputCls} ${isInvalid('clientName') ? invalidCls : ''}`}
                value={form.clientName}
                autoComplete="off"
                onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Escape') setNameSugs([]) }}
                onBlur={() => setTimeout(() => { setNameSugs([]); setSugBusy(false) }, 150)}
                placeholder="Acme GmbH"
              />
              {(sugBusy || nameSugs.length > 0) && form.clientName.trim().length >= 3 ? (
                <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  {sugBusy && nameSugs.length === 0 ? (
                    <li className="px-3 py-2 text-xs font-normal text-slate-400">{t('registry.searching', 'Searching the register…')}</li>
                  ) : (
                    nameSugs.map((s) => (
                      <li key={s.eik}>
                        <button
                          type="button"
                          className="flex w-full items-baseline justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-blue-50"
                          onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s) }}
                        >
                          <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{s.fullName || s.name}</span>
                          <span className="shrink-0 text-[11px] font-normal text-slate-400">{s.eik}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
            </label>
            <label className="block text-xs font-medium text-slate-600">
              {t('newInquiry.contactName')}
              <input
                className={inputCls}
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              {t('newInquiry.contactEmail')}
              <input
                type="email"
                className={inputCls}
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              {t('newInquiry.country')}
              <input
                list="niq-countries"
                className={inputCls}
                value={form.country}
                onChange={(e) => {
                  const country = e.target.value
                  setForm((f) => ({ ...f, country, region: regionForCountry(country) || f.region }))
                }}
                placeholder={t('newInquiry.countryPlaceholder')}
              />
              <datalist id="niq-countries">
                {countryNames(language).map((c) => <option key={c} value={c} />)}
              </datalist>
            </label>
            <label className="block text-xs font-medium text-slate-600">
              {t('newInquiry.city')}
              <input
                className={inputCls}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600 md:col-span-2">
              {t('newInquiry.region')}
              <input
                list="niq-regions"
                className={inputCls}
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder={t('newInquiry.regionAuto')}
              />
              <datalist id="niq-regions">
                {REGIONS.map((r) => <option key={r} value={r} />)}
              </datalist>
            </label>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{t('newInquiry.section.products')}</h3>
          <button
            type="button"
            onClick={addProductRow}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-700"
          >
            + {t('newInquiry.addProduct')}
          </button>
        </div>
        <div className="space-y-3">
          {form.products.map((p, idx) => (
            <div key={idx} className="space-y-2 rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{idx + 1}</span>
                <input
                  className={`flex-1 rounded-lg border bg-white px-2 py-1.5 text-sm ${idx === 0 && isInvalid('productName') ? invalidCls : 'border-slate-200'}`}
                  value={p.name}
                  placeholder={`${t('newInquiry.productName')}${idx === 0 ? ' *' : ''}`}
                  onChange={(e) => setProduct(idx, { name: e.target.value })}
                />
                {form.products.length > 1 ? (
                  <button type="button" onClick={() => removeProductRow(idx)} className="text-slate-400 hover:text-rose-600" title={t('common.remove')}>✕</button>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[11px] font-medium text-slate-500">
                  {t('newInquiry.productType', 'Type')}
                  <select className={inputCls} value={p.type ?? 'finished_good'} onChange={(e) => setProduct(idx, { type: e.target.value })}>
                    {PRODUCT_TYPES.map((tp) => <option key={tp} value={tp}>{t(`product.type.${tp}`)}</option>)}
                  </select>
                </label>
                <label className="block text-[11px] font-medium text-slate-500">
                  {t('newInquiry.productUom', 'Unit')}
                  <select className={inputCls} value={p.uom ?? 'ea'} onChange={(e) => setProduct(idx, { uom: e.target.value })}>
                    {UOM_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </label>
              </div>
              <textarea
                className={inputCls}
                rows={2}
                value={p.description}
                placeholder={t('newInquiry.productDescription')}
                onChange={(e) => setProduct(idx, { description: e.target.value })}
              />
              <div>
                <span className="block text-[11px] font-medium text-slate-500">{t('newInquiry.quantity')}{idx === 0 ? ' *' : ''}</span>
                <div className={`mt-1 flex flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1.5 ${idx === 0 && isInvalid('quantity') ? invalidCls : 'border-slate-200'}`}>
                  {p.quantities.map((q, qi) => (
                    <span key={qi} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-100">
                      {q}
                      <button type="button" onClick={() => removeQty(idx, qi)} className="opacity-60 hover:opacity-100">✕</button>
                    </span>
                  ))}
                  <input
                    type="number"
                    min={1}
                    className="h-7 w-24 rounded-md border border-slate-200 bg-white px-2 text-xs"
                    value={p.qtyInput}
                    placeholder={t('newInquiry.addQuantity')}
                    onChange={(e) => setProduct(idx, { qtyInput: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addQty(idx) } }}
                  />
                </div>
                <span className="mt-0.5 block text-[10px] text-slate-400">{t('newInquiry.quantityHint')}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">{t('newInquiry.section.inquiry')}</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block text-xs font-medium text-slate-600">
            {t('inquiry.channel')}
            <select
              className={inputCls}
              value={form.channel}
              onChange={(e) =>
                setForm({
                  ...form,
                  channel:
                    /** @type {import('../../../domains/inquiries/model.js').InquiryChannel} */ (
                      e.target.value
                    ),
                })
              }
            >
              {['email', 'phone', 'portal', 'referral', 'in_person', 'other'].map((c) => (
                <option key={c} value={c}>
                  {t(`inquiry.channel.${c}`, c)}
                </option>
              ))}
            </select>
          </label>
          <div className="block text-xs font-medium text-slate-600">
            {t('inquiry.deadline')}
            <DatePicker
              className="mt-1"
              value={form.requestedDeadline}
              placeholder={t('inquiry.deadline')}
              onChange={(iso) => setForm((f) => ({ ...f, requestedDeadline: iso }))}
            />
          </div>
          <label className="block text-xs font-medium text-slate-600">
            {t('inquiry.spokenLanguage', 'Spoken language')}
            <select
              className={inputCls}
              value={form.spokenLanguage}
              onChange={(e) => setForm({ ...form, spokenLanguage: /** @type {'bg'|'en'} */ (e.target.value) })}
            >
              <option value="bg">{t('inquiry.lang.bg', 'Bulgarian')}</option>
              <option value="en">{t('inquiry.lang.en', 'English')}</option>
            </select>
            <span className="mt-1 block text-[11px] font-normal text-slate-400">
              {t('inquiry.spokenLanguage.hint', 'Sets which offer version is sent — Bulgarian or English.')}
            </span>
          </label>
          <label className="block text-xs font-medium text-slate-600 md:col-span-2">
            {t('inquiry.summary')}
            <textarea
              className={inputCls}
              rows={2}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
            />
          </label>
          <label className="block text-xs font-medium text-slate-600 md:col-span-2">
            {t('inquiry.specification')}
            <textarea
              className={inputCls}
              rows={2}
              value={form.specificationNote}
              onChange={(e) => setForm({ ...form, specificationNote: e.target.value })}
            />
          </label>
        </div>

        <AttachmentEditor
          attachments={form.attachments}
          onChange={(attachments) => setForm((f) => ({ ...f, attachments }))}
          noAttachments={form.noAttachments}
          onToggleNoAttachments={(noAttachments) => setForm((f) => ({ ...f, noAttachments }))}
        />
      </section>

      {/* Tasks — assign the auto gate tasks + add extra ones */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">{t('newInquiry.section.tasks')}</h3>
        <p className="text-xs text-slate-500">{t('newInquiry.tasks.hint')}</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block text-xs font-medium text-slate-600">
            {t('newInquiry.tasks.tech')}
            <select className={inputCls} value={form.taskTech} onChange={(e) => setForm({ ...form, taskTech: e.target.value })}>
              <option value="">{t('newInquiry.tasks.auto')}</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-600">
            {t('newInquiry.tasks.cost')}
            <select className={inputCls} value={form.taskCost} onChange={(e) => setForm({ ...form, taskCost: e.target.value })}>
              <option value="">{t('newInquiry.tasks.auto')}</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </label>
        </div>

        <div className="space-y-1.5">
          {form.extraTasks.map((tk, i) => (
            <div key={i} className="grid grid-cols-[1fr_180px_auto] items-center gap-2">
              <input className={inputCls} value={tk.title} placeholder={t('newInquiry.tasks.title')}
                onChange={(e) => setForm((f) => ({ ...f, extraTasks: f.extraTasks.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)) }))} />
              <select className={inputCls} value={tk.assigneeId}
                onChange={(e) => setForm((f) => ({ ...f, extraTasks: f.extraTasks.map((x, idx) => (idx === i ? { ...x, assigneeId: e.target.value } : x)) }))}>
                <option value="">{t('newInquiry.tasks.unassigned')}</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <button type="button" onClick={() => setForm((f) => ({ ...f, extraTasks: f.extraTasks.filter((_, idx) => idx !== i) }))}
                className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600">✕</button>
            </div>
          ))}
          <button type="button"
            onClick={() => setForm((f) => ({ ...f, extraTasks: [...f.extraTasks, { title: '', assigneeId: '' }] }))}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900">
            + {t('newInquiry.tasks.add')}
          </button>
        </div>
      </section>

      <footer className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
        <p className="min-h-4 text-xs text-rose-600">{error ?? ''}</p>
        <div className="flex gap-2">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t('common.cancel')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {t('newInquiry.submit')}
          </button>
        </div>
      </footer>
    </div>
  )
}
