import { useEffect, useRef, useState } from 'react'
import { Pencil, Plus, Trash2, Check } from 'lucide-react'
import { selectClientProfileBundle } from '../domains/crm/selectors.js'
import ClientOffers from '../components/erp/crm/ClientOffers.jsx'
import ClientStatusBar from '../components/erp/crm/ClientStatusBar.jsx'
import ClientDocuments from '../components/erp/crm/ClientDocuments.jsx'
import ClientProductSchematics from '../components/erp/crm/ClientProductSchematics.jsx'
import ClientExternalAccess from '../components/erp/crm/ClientExternalAccess.jsx'
import ClientRequests from '../components/erp/crm/ClientRequests.jsx'
import { selectProductById } from '../domains/products/selectors.js'
import { selectMachineById } from '../domains/machines/selectors.js'
import {
  patchClient,
  appendClientContact,
  removeClientContact,
  appendClientAddress,
  removeClientAddress,
  appendInvoice,
  appendPaymentRecord,
  resolveOrderIssue,
} from '../domains/crm/mutations.js'
import OrderLogPanel from '../components/erp/crm/OrderLogPanel.jsx'
import DatePicker from '../components/DatePicker.jsx'
import { groupAmount } from '../lib/money.js'
import { useToast } from '../components/ui/feedbackContext.js'
import { useDb } from '../data/useDb.js'
import { useLanguage } from '../i18n/useLanguage.js'
import { countryNames, localizedCountryName, regionForCountry } from '../lib/countries.js'
import { lookupCompany, parseRegisteredAddress, searchRegistry } from '../lib/registry.js'
import AddressMap from '../components/AddressMap.jsx'

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300'

const CLIENT_FIELDS = [
  ['companyName', 'client.field.companyName'],
  ['vat', 'client.field.vat'],
  ['email', 'client.field.email'],
  ['address', 'client.field.address'],
  ['city', 'client.field.city'],
  ['postCode', 'client.field.postCode'],
  ['country', 'client.field.country'],
  ['segment', 'client.field.segment'],
  ['region', 'client.field.region'],
]

/**
 * Editable company details + contacts + addresses. These fields feed the
 * offer header and the printed Order Confirmation.
 * @param {{ client: import('../domains/crm/model.js').Client }} props
 */
function ClientDetailsEditor({ client }) {
  const { t, language } = useLanguage()
  const { db, commit } = useDb()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(/** @type {Record<string, string>} */ ({}))
  const [newContact, setNewContact] = useState({ name: '', title: '', email: '', phone: '' })
  const [newAddress, setNewAddress] = useState({ label: '', address: '', city: '', postCode: '', country: '' })
  const [eikInput, setEikInput] = useState('')
  const [lookupBusy, setLookupBusy] = useState(false)
  const [lookupMsg, setLookupMsg] = useState(/** @type {null | { ok: boolean; text: string }} */ (null))

  const startEdit = () => {
    const initial = {}
    for (const [key] of CLIENT_FIELDS) initial[key] = client[key] ?? ''
    initial.eik = client.eik ?? ''
    initial.notes = client.notes ?? ''
    setForm(initial)
    setEikInput(client.eik || client.vat || '')
    setLookupMsg(null)
    sugSkipRef.current = true // don't pop suggestions for the pre-filled name
    setEditing(true)
  }

  async function runLookup(idArg) {
    const id = (typeof idArg === 'string' ? idArg : eikInput).trim()
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
        companyName: c.legal_name || f.companyName,
        address: c.address || f.address,
        vat: c.vat || f.vat,
        eik: c.eik || f.eik,
        city: parsed.city || f.city,
        postCode: parsed.postCode || f.postCode,
        country,
        region: regionForCountry(country) || f.region,
      }))
      const suffix = d.valid ? '' : ` — ${t('registry.noVat', 'no VAT registration')}`
      setLookupMsg({ ok: true, text: (c.legal_name || t('registry.found', 'Company found.')) + suffix })
    } finally {
      setLookupBusy(false)
    }
  }

  // Live name suggestions from the BG Commercial Register while editing.
  const [nameSugs, setNameSugs] = useState(/** @type {{ eik: string; name: string; fullName: string }[]} */ ([]))
  const [sugBusy, setSugBusy] = useState(false)
  const sugSkipRef = useRef(false)

  const editedName = editing ? String(form.companyName ?? '') : ''
  useEffect(() => {
    if (!editing) return undefined
    if (sugSkipRef.current) { sugSkipRef.current = false; return undefined }
    const q = editedName.trim()
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
  }, [editedName, editing])

  function pickSuggestion(s) {
    sugSkipRef.current = true
    setNameSugs([])
    setSugBusy(false)
    setForm((f) => ({ ...f, companyName: s.name, eik: s.eik }))
    setEikInput(s.eik)
    runLookup(s.eik)
  }

  const save = () => {
    commit(() => patchClient(db, client.id, { ...form }))
    setEditing(false)
  }

  return (
    <div className="space-y-4">
      {/* Company details */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{t('client.details')}</h3>
          {editing ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={save}
                className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Check size={12} /> {t('client.saveDetails')}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
              >
                {t('common.cancel')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <Pencil size={11} /> {t('client.edit')}
            </button>
          )}
        </div>

        {editing ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-600">{t('registry.eik', 'ЕИК / VAT')}</label>
              <div className="mt-1 flex gap-2">
                <input
                  className={inputCls}
                  value={eikInput}
                  onChange={(e) => setEikInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runLookup() } }}
                  placeholder="131071587 / BG131071587"
                />
                <button
                  type="button"
                  onClick={runLookup}
                  disabled={lookupBusy || !eikInput.trim()}
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
            </div>
            {CLIENT_FIELDS.map(([key, labelKey]) => (
              <label key={key} className="relative block text-xs font-medium text-slate-600">
                {t(labelKey)}
                <input
                  list={key === 'country' ? 'cli-countries' : undefined}
                  autoComplete={key === 'companyName' ? 'off' : undefined}
                  className={`mt-1 ${inputCls}`}
                  value={form[key] ?? ''}
                  onChange={(e) => {
                    const value = e.target.value
                    setForm((f) => key === 'country'
                      ? { ...f, country: value, region: regionForCountry(value) || f.region }
                      : { ...f, [key]: value })
                  }}
                  onKeyDown={key === 'companyName' ? (e) => { if (e.key === 'Escape') setNameSugs([]) } : undefined}
                  onBlur={key === 'companyName' ? () => setTimeout(() => { setNameSugs([]); setSugBusy(false) }, 150) : undefined}
                />
                {key === 'companyName' && (sugBusy || nameSugs.length > 0) && String(form.companyName ?? '').trim().length >= 3 ? (
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
            ))}
            <datalist id="cli-countries">
              {countryNames(language).map((c) => <option key={c} value={c} />)}
            </datalist>
            <label className="block text-xs font-medium text-slate-600 md:col-span-3">
              {t('client.field.notes')}
              <textarea
                rows={2}
                className={`mt-1 ${inputCls}`}
                value={form.notes ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>
          </div>
        ) : (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
            {CLIENT_FIELDS.map(([key, labelKey]) => (
              <div key={key}>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t(labelKey)}</dt>
                <dd className="text-slate-800">{client[key] || '—'}</dd>
              </div>
            ))}
          </dl>
        )}
        <AddressMap
          address={editing ? form.address : client.address}
          city={editing ? form.city : client.city}
          country={editing ? form.country : client.country}
          className="mt-4"
        />
      </section>

      {/* Contacts & addresses */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('client.contacts')}</h3>
          <ul className="space-y-1.5">
            {(client.contacts ?? []).map((c) => (
              <li key={c.id} className="group flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-slate-800">{[c.title, c.name].filter(Boolean).join(' ')}</span>
                  <span className="ml-2 text-slate-500">{[c.email, c.phone].filter(Boolean).join(' · ')}</span>
                </span>
                <button
                  type="button"
                  onClick={() => commit(() => removeClientContact(db, client.id, c.id))}
                  className="text-slate-300 opacity-0 transition-opacity hover:text-rose-600 group-hover:opacity-100"
                  title={t('common.remove')}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
            {(client.contacts ?? []).length === 0 ? (
              <li className="text-xs text-slate-400">{t('client.noContacts')}</li>
            ) : null}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
            <input className={inputCls} placeholder={t('client.contact.name')} value={newContact.name}
              onChange={(e) => setNewContact((f) => ({ ...f, name: e.target.value }))} />
            <input className={inputCls} placeholder={t('client.contact.title')} value={newContact.title}
              onChange={(e) => setNewContact((f) => ({ ...f, title: e.target.value }))} />
            <input className={inputCls} placeholder={t('client.field.email')} value={newContact.email}
              onChange={(e) => setNewContact((f) => ({ ...f, email: e.target.value }))} />
            <input className={inputCls} placeholder={t('client.contact.phone')} value={newContact.phone}
              onChange={(e) => setNewContact((f) => ({ ...f, phone: e.target.value }))} />
            <button
              type="button"
              onClick={() => {
                if (!newContact.name.trim()) return
                commit(() => appendClientContact(db, client.id, {
                  name: newContact.name.trim(),
                  title: newContact.title.trim() || undefined,
                  email: newContact.email.trim() || undefined,
                  phone: newContact.phone.trim() || undefined,
                }))
                setNewContact({ name: '', title: '', email: '', phone: '' })
              }}
              className="col-span-2 flex items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-1.5 text-xs font-medium text-slate-500 hover:border-blue-300 hover:text-blue-700"
            >
              <Plus size={12} /> {t('client.addContact')}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('client.addresses')}</h3>
          <ul className="space-y-1.5">
            {(client.addresses ?? []).map((a) => (
              <li key={a.id} className="group flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                <span className="min-w-0 flex-1">
                  {a.label ? <span className="font-medium text-slate-800">{a.label}: </span> : null}
                  <span className="text-slate-600">
                    {[a.address, [a.postCode, a.city].filter(Boolean).join(' '), a.country].filter(Boolean).join(', ')}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => commit(() => removeClientAddress(db, client.id, a.id))}
                  className="text-slate-300 opacity-0 transition-opacity hover:text-rose-600 group-hover:opacity-100"
                  title={t('common.remove')}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
            {(client.addresses ?? []).length === 0 ? (
              <li className="text-xs text-slate-400">{t('client.noAddresses')}</li>
            ) : null}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
            <input className={inputCls} placeholder={t('client.address.label')} value={newAddress.label}
              onChange={(e) => setNewAddress((f) => ({ ...f, label: e.target.value }))} />
            <input className={inputCls} placeholder={t('client.field.address')} value={newAddress.address}
              onChange={(e) => setNewAddress((f) => ({ ...f, address: e.target.value }))} />
            <input className={inputCls} placeholder={t('client.field.city')} value={newAddress.city}
              onChange={(e) => setNewAddress((f) => ({ ...f, city: e.target.value }))} />
            <input className={inputCls} placeholder={t('client.field.postCode')} value={newAddress.postCode}
              onChange={(e) => setNewAddress((f) => ({ ...f, postCode: e.target.value }))} />
            <input className={inputCls} placeholder={t('client.field.country')} value={newAddress.country}
              onChange={(e) => setNewAddress((f) => ({ ...f, country: e.target.value }))} />
            <button
              type="button"
              onClick={() => {
                if (!newAddress.address.trim() && !newAddress.city.trim()) return
                commit(() => appendClientAddress(db, client.id, {
                  label: newAddress.label.trim() || undefined,
                  address: newAddress.address.trim() || undefined,
                  city: newAddress.city.trim() || undefined,
                  postCode: newAddress.postCode.trim() || undefined,
                  country: newAddress.country.trim() || undefined,
                }))
                setNewAddress({ label: '', address: '', city: '', postCode: '', country: '' })
              }}
              className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-1.5 text-xs font-medium text-slate-500 hover:border-blue-300 hover:text-blue-700"
            >
              <Plus size={12} /> {t('client.addAddress')}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

/**
 * @param {{
 *   db: import('../data/mockDatabase.js').MockDatabase
 *   clientId: string
 *   onBack: () => void
 *   onOpenOffer?: (quoteId: string) => void
 *   onOpenProduct?: (productId: string) => void
 * }} props
 */
export default function ClientProfilePage({ db, clientId, onBack, onOpenOffer, onOpenProduct }) {
  const { t } = useLanguage()
  const { commit } = useDb()
  const toast = useToast()
  const [addingInvoice, setAddingInvoice] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({ orderId: '', amount: '', dueAt: '' })
  const bundle = selectClientProfileBundle(db, clientId)
  if (!bundle) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{t('client.notFound')}</p>
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-blue-700 underline"
        >
          {t('client.back')}
        </button>
      </div>
    )
  }
  const { client, orders, lines, executions, machineUsages, timeLogs, issues, invoices, payments } =
    bundle

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{client.name}</h2>
          <p className="text-sm text-slate-500">
            {client.segment} · {client.region}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          {t('client.back')}
        </button>
      </div>

      {client.notes ? <p className="text-sm text-slate-600">{client.notes}</p> : null}

      <ClientStatusBar client={client} />

      <ClientRequests db={db} clientId={clientId} onOpenProduct={onOpenProduct} />

      <ClientOffers db={db} clientId={clientId} onOpenOffer={onOpenOffer} />

      <ClientDocuments db={db} clientId={clientId} />

      <ClientExternalAccess client={client} />

      <ClientDetailsEditor client={client} />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('client.ordersPrices')}</h3>
        <ul className="space-y-3 text-sm">
          {orders.map((o) => {
            const prod = selectProductById(db, o.productId)
            const oLines = lines.filter((l) => l.orderId === o.id)
            return (
              <li key={o.id} className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                <p className="font-medium text-slate-900">
                  {o.id} · {prod?.name ?? o.productId}{' '}
                  <span className="text-xs font-normal text-slate-500">({o.status})</span>
                </p>
                <ul className="mt-2 space-y-1 text-slate-600">
                  {oLines.map((l) => (
                    <li key={l.id}>
                      {l.description}: {groupAmount(l.qty)} × {groupAmount(l.unitPrice)}
                    </li>
                  ))}
                </ul>
                <OrderLogPanel db={db} commit={commit} order={o} />
              </li>
            )
          })}
          {orders.length === 0 ? <li className="text-xs text-slate-400">{t('client.noOrders', 'No orders yet — accepted offers become orders here.')}</li> : null}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('client.execution')}</h3>
        <ul className="list-inside list-disc text-sm text-slate-600">
          {executions.map((e) => (
            <li key={e.id}>
              {e.milestone} — {e.completedAt}
              {e.notes ? ` (${e.notes})` : ''}
            </li>
          ))}
        </ul>
        {executions.length === 0 ? <p className="text-xs text-slate-400">{t('client.noRecords', 'No records yet.')}</p> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('client.machinesUsed')}</h3>
          <ul className="text-sm text-slate-600">
            {machineUsages.map((u) => {
              const mach = selectMachineById(db, u.machineId)
              return (
                <li key={u.id}>
                  {mach?.name ?? u.machineId}: {u.hours}
                  {t('client.hoursOrder')} {u.orderId}
                </li>
              )
            })}
          </ul>
          {machineUsages.length === 0 ? <p className="text-xs text-slate-400">{t('client.noRecords', 'No records yet.')}</p> : null}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('client.timePlanned')}</h3>
          <ul className="text-sm text-slate-600">
            {timeLogs.map((timeRow) => (
              <li key={timeRow.id}>
                {timeRow.phase}: {timeRow.plannedHours}h {t('client.timePlanActual')} {timeRow.actualHours}h{' '}
                {t('client.timeActual')} {timeRow.orderId}
                {timeRow.actualHours > timeRow.plannedHours ? <span className="ml-1 text-[11px] font-medium text-rose-600">+{Math.round((timeRow.actualHours - timeRow.plannedHours) * 10) / 10}h</span> : null}
              </li>
            ))}
          </ul>
          {timeLogs.length === 0 ? <p className="text-xs text-slate-400">{t('client.noRecords', 'No records yet.')}</p> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('client.issues')}</h3>
        <ul className="space-y-2 text-sm text-slate-600">
          {issues.map((i) => (
            <li key={i.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                i.severity === 'high' ? 'bg-rose-50 text-rose-700' : i.severity === 'low' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700'
              }`}>{t(`client.sev.${i.severity}`, i.severity)}</span>
              <span className={`min-w-0 flex-1 ${i.status === 'resolved' ? 'text-slate-400 line-through' : ''}`}>{i.description}</span>
              {i.status === 'resolved' ? (
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">{t('client.issueStatus.resolved', 'Resolved')}</span>
              ) : (
                <button type="button" onClick={() => { commit(() => resolveOrderIssue(db, i.id)); toast(t('client.issueResolved', 'Issue resolved.')) }} className="shrink-0 rounded-lg border border-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50">
                  {t('client.issueResolve', 'Resolve')}
                </button>
              )}
            </li>
          ))}
        </ul>
        {issues.length === 0 ? <p className="text-xs text-slate-400">{t('client.noRecords', 'No records yet.')}</p> : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{t('client.invoices')}</h3>
          {orders.length > 0 ? (
            <button
              type="button"
              onClick={() => setAddingInvoice((v) => !v)}
              className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              + {t('client.addInvoice', 'Add invoice')}
            </button>
          ) : null}
        </div>

        {addingInvoice ? (
          <div className="mb-3 grid grid-cols-1 gap-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3 md:grid-cols-[1.5fr_1fr_1fr_auto]">
            <label className="block text-xs font-medium text-slate-600">
              {t('client.invoiceOrder', 'Order')} *
              <select
                className={`mt-1 ${inputCls}`}
                value={invoiceForm.orderId}
                onChange={(e) => {
                  const orderId = e.target.value
                  const total = lines.filter((l) => l.orderId === orderId).reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0)
                  setInvoiceForm((f) => ({ ...f, orderId, amount: total > 0 ? String(Math.round(total * 100) / 100) : f.amount }))
                }}
              >
                <option value="">—</option>
                {orders.map((o) => <option key={o.id} value={o.id}>{o.id} · {selectProductById(db, o.productId)?.name ?? o.productId}</option>)}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-600">
              {t('client.invoiceAmount', 'Amount')} *
              <input type="number" min={0} step="any" className={`mt-1 ${inputCls}`} value={invoiceForm.amount} onChange={(e) => setInvoiceForm((f) => ({ ...f, amount: e.target.value }))} />
            </label>
            <div className="block text-xs font-medium text-slate-600">
              {t('client.invoiceDue', 'Due date')} *
              <DatePicker className="mt-1" value={invoiceForm.dueAt} onChange={(iso) => setInvoiceForm((f) => ({ ...f, dueAt: iso }))} />
            </div>
            <button
              type="button"
              disabled={!invoiceForm.orderId || !(Number(invoiceForm.amount) > 0) || !invoiceForm.dueAt}
              onClick={() => {
                let inv = null
                commit(() => { inv = appendInvoice(db, { orderId: invoiceForm.orderId, clientId, amount: Number(invoiceForm.amount), dueAt: invoiceForm.dueAt }) })
                if (inv) toast(`${t('client.invoiceCreated', 'Invoice created:')} ${inv.id}`)
                setInvoiceForm({ orderId: '', amount: '', dueAt: '' })
                setAddingInvoice(false)
              }}
              className="self-end rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {t('common.add', 'Add')}
            </button>
          </div>
        ) : null}

        <ul className="space-y-2 text-sm text-slate-600">
          {invoices.map((inv) => {
            const payment = payments.find((p) => p.invoiceId === inv.id)
            const today = new Date().toISOString().slice(0, 10)
            const overdue = !payment && inv.dueAt < today
            return (
              <li key={inv.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
                <span className="font-medium text-slate-800">{inv.id}</span>
                <span>{groupAmount(inv.amount)}</span>
                <span className="text-xs text-slate-400">{t('client.due')} {inv.dueAt}</span>
                <span className="min-w-0 flex-1" />
                {payment ? (
                  payment.daysLate === 0 ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">{t('client.paidOnTimeChip', 'Paid on time')} · {payment.paidAt}</span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">{t('client.paidLateChip', 'Paid {n}d late').replace('{n}', String(payment.daysLate))} · {payment.paidAt}</span>
                  )
                ) : (
                  <>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${overdue ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                      {overdue ? t('client.overdue', 'Overdue') : t('client.unpaid', 'Unpaid')}
                    </span>
                    <button
                      type="button"
                      onClick={() => { commit(() => appendPaymentRecord(db, { invoiceId: inv.id })); toast(t('client.paymentRecorded', 'Payment recorded.')) }}
                      className="rounded-lg border border-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      {t('client.recordPayment', 'Record payment')}
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
        {invoices.length === 0 ? <p className="text-xs text-slate-400">{t('client.noInvoices', 'No invoices yet.')}</p> : null}
      </section>

      <ClientProductSchematics db={db} clientId={clientId} onOpenProduct={onOpenProduct} />
    </div>
  )
}
