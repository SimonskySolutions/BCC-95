import { Fragment, useState } from 'react'
import { Plus, Trash2, MapPin, ChevronDown, ChevronUp } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import {
  selectQuoteOfferLines,
  selectOfferLinesTotal,
  offerLineNetTotal,
  selectTermsOfDelivery,
  selectTermsOfPayment,
} from '../../../domains/quotations/selectors.js'
import {
  appendQuoteOfferLine,
  patchQuoteOfferLine,
  removeQuoteOfferLine,
  patchQuoteVersion,
  appendTerm,
} from '../../../domains/quotations/mutations.js'

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-slate-50 disabled:text-slate-400'

/**
 * Inline lookup <select> with a "+ new" affordance that appends to the lookup
 * table and immediately selects the created value.
 *
 * @param {{
 *   value?: string
 *   options: { id: string; code?: string; label: string }[]
 *   disabled?: boolean
 *   placeholder: string
 *   addLabel: string
 *   onSelect: (id: string) => void
 *   onAdd: (label: string) => string
 * }} props
 */
function LookupSelect({ value, options, disabled, placeholder, addLabel, onSelect, onAdd }) {
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  if (adding) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          className={inputCls}
          value={text}
          placeholder={addLabel}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && text.trim()) {
              const id = onAdd(text.trim())
              onSelect(id)
              setText('')
              setAdding(false)
            } else if (e.key === 'Escape') {
              setAdding(false)
              setText('')
            }
          }}
        />
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          onClick={() => {
            if (!text.trim()) return
            const id = onAdd(text.trim())
            onSelect(id)
            setText('')
            setAdding(false)
          }}
        >
          ✓
        </button>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1">
      <select
        className={inputCls}
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="">— {placeholder} —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.code ? `${o.code} · ${o.label}` : o.label}
          </option>
        ))}
      </select>
      {!disabled ? (
        <button
          type="button"
          title={addLabel}
          onClick={() => setAdding(true)}
          className="shrink-0 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50 hover:text-blue-700"
        >
          <Plus size={13} />
        </button>
      ) : null}
    </div>
  )
}

/**
 * Step 3 — the customer-facing offer: customer & terms header plus the offer
 * line grid (product / UoM / requested vs confirmed qty & date / price /
 * requirements). Mirrors the legacy GS Order Confirmation data.
 *
 * @param {{
 *   db: import('../../../data/mockDatabase.js').MockDatabase
 *   version?: import('../../../domains/quotations/model.js').QuoteVersion
 *   clientId: string
 *   actorId?: string
 *   onChange?: () => void
 * }} props
 */
export default function OfferDetailsPanel({ db, version, clientId, onChange }) {
  const { t } = useLanguage()
  const [expandedLine, setExpandedLine] = useState(/** @type {string | null} */ (null))

  if (!version) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
        {t('offer.details.noVersion')}
      </p>
    )
  }

  const isLocked = version.status !== 'draft'
  const client = db.clients.find((c) => c.id === clientId)
  const products = db.products ?? []
  const lines = selectQuoteOfferLines(db, version.id)
  const total = selectOfferLinesTotal(db, version.id)
  const currency = version.currency ?? 'EUR'
  const termsDelivery = selectTermsOfDelivery(db)
  const termsPayment = selectTermsOfPayment(db)

  const patchHeader = (patch) => {
    patchQuoteVersion(db, version.id, patch)
    onChange?.()
  }

  const copyAddress = (addr) => {
    const text = [addr.address, [addr.postCode, addr.city].filter(Boolean).join(' '), addr.country]
      .filter(Boolean)
      .join(', ')
    patchHeader({ deliveryAddress: text })
  }

  const addLine = () => {
    appendQuoteOfferLine(db, {
      quoteVersionId: version.id,
      description: '',
      requestedQty: 1,
      unitPrice: version.unitPrice ?? 0, // price flows in from the costing step
    })
    onChange?.()
  }

  const editLine = (id, patch) => {
    patchQuoteOfferLine(db, id, patch)
    onChange?.()
  }

  const pickProduct = (id, productId) => {
    const p = products.find((x) => x.id === productId)
    editLine(id, {
      productId: productId || undefined,
      description: p ? p.name : '',
      uom: p?.uom,
    })
  }

  return (
    <div className="space-y-4">
      {/* Customer & terms */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <h4 className="mb-3 text-sm font-semibold text-slate-900">{t('offer.details.customerTerms')}</h4>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600">{t('offer.details.customer')}</label>
            <p className="mt-1 rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-800">
              {client?.companyName ?? client?.name ?? '—'}
              {client?.vat ? <span className="ml-2 text-xs font-normal text-slate-400">{client.vat}</span> : null}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">{t('offer.details.contact')}</label>
            <select
              className={`mt-1 ${inputCls}`}
              value={version.contactPersonId ?? ''}
              disabled={isLocked}
              onChange={(e) => {
                const c = (client?.contacts ?? []).find((x) => x.id === e.target.value)
                patchHeader({
                  contactPersonId: e.target.value || undefined,
                  contactName: c?.name,
                  contactTitle: c?.title,
                })
              }}
            >
              <option value="">— {t('offer.details.selectContact')} —</option>
              {(client?.contacts ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.title, c.name].filter(Boolean).join(' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">{t('offer.details.customerOrderRef')}</label>
            <input
              className={`mt-1 ${inputCls}`}
              value={version.customerOrderRef ?? ''}
              disabled={isLocked}
              placeholder={t('offer.details.customerOrderRefPlaceholder')}
              onChange={(e) => patchHeader({ customerOrderRef: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">{t('offer.details.currency')}</label>
            <select
              className={`mt-1 ${inputCls}`}
              value={currency}
              disabled={isLocked}
              onChange={(e) => patchHeader({ currency: e.target.value })}
            >
              {['EUR', 'BGN', 'USD'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-600">{t('offer.details.deliveryAddress')}</label>
              {!isLocked ? (
                <div className="flex flex-wrap items-center gap-1">
                  {(client?.addresses ?? []).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => copyAddress(a)}
                      className="flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500 hover:border-blue-300 hover:text-blue-700"
                    >
                      <MapPin size={10} /> {a.label ?? a.city ?? t('offer.details.address')}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <textarea
              rows={2}
              className={`mt-1 ${inputCls}`}
              value={version.deliveryAddress ?? ''}
              disabled={isLocked}
              placeholder={t('offer.details.deliveryAddressPlaceholder')}
              onChange={(e) => patchHeader({ deliveryAddress: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">{t('offer.details.termsOfDelivery')}</label>
            <div className="mt-1">
              <LookupSelect
                value={version.termsOfDeliveryId}
                options={termsDelivery}
                disabled={isLocked}
                placeholder={t('offer.details.selectTerms')}
                addLabel={t('offer.details.addTerm')}
                onSelect={(id) => patchHeader({ termsOfDeliveryId: id || undefined })}
                onAdd={(label) => appendTerm(db, 'termsOfDelivery', { label }).id}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">{t('offer.details.termsOfPayment')}</label>
            <div className="mt-1">
              <LookupSelect
                value={version.termsOfPaymentId}
                options={termsPayment}
                disabled={isLocked}
                placeholder={t('offer.details.selectTerms')}
                addLabel={t('offer.details.addTerm')}
                onSelect={(id) => patchHeader({ termsOfPaymentId: id || undefined })}
                onAdd={(label) => appendTerm(db, 'termsOfPayment', { label }).id}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">{t('offer.details.orderDate')}</label>
            <input
              type="date"
              className={`mt-1 ${inputCls}`}
              value={version.orderDate ?? ''}
              disabled={isLocked}
              onChange={(e) => patchHeader({ orderDate: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">{t('offer.details.dispatchDate')}</label>
            <input
              type="date"
              className={`mt-1 ${inputCls}`}
              value={version.dispatchDate ?? ''}
              disabled={isLocked}
              onChange={(e) => patchHeader({ dispatchDate: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">{t('offer.validUntil')}</label>
            <input
              type="date"
              className={`mt-1 ${inputCls}`}
              value={version.validUntil ?? ''}
              disabled={isLocked}
              onChange={(e) => patchHeader({ validUntil: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">{t('offer.language')}</label>
            <select
              className={`mt-1 ${inputCls}`}
              value={version.language ?? 'en'}
              disabled={isLocked}
              onChange={(e) => patchHeader({ language: e.target.value })}
            >
              <option value="en">English</option>
              <option value="bg">Български</option>
            </select>
          </div>
        </div>
      </div>

      {/* Offer lines */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-900">{t('offer.details.lines')}</h4>
          <span className="text-xs font-medium text-slate-500">
            {t('offer.details.total')}: <span className="font-bold text-slate-800">{total.toFixed(2)} {currency}</span>
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="px-2 py-2">{t('offer.details.product')}</th>
                <th className="px-2 py-2 w-16">{t('offer.details.uom')}</th>
                <th className="px-2 py-2 w-40">{t('offer.details.requested')}</th>
                <th className="px-2 py-2 w-40">{t('offer.details.confirmed')}</th>
                <th className="px-2 py-2 text-right w-24">{t('offer.details.price')}</th>
                <th className="px-2 py-2 text-right w-24">{t('offer.details.lineTotal')}</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-xs text-slate-400">
                    {t('offer.details.noLines')}
                  </td>
                </tr>
              ) : null}
              {lines.map((l) => {
                const lineTotal = offerLineNetTotal(l)
                const open = expandedLine === l.id
                return (
                  <Fragment key={l.id}>
                    <tr className="group align-top">
                      <td className="px-2 py-2">
                        <select
                          className={inputCls}
                          value={l.productId ?? ''}
                          disabled={isLocked}
                          onChange={(e) => pickProduct(l.id, e.target.value)}
                        >
                          <option value="">— {t('offer.details.selectProduct')} —</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        {!l.productId ? (
                          <input
                            className={`mt-1 ${inputCls}`}
                            value={l.description}
                            disabled={isLocked}
                            placeholder={t('offer.details.descriptionPlaceholder')}
                            onChange={(e) => editLine(l.id, { description: e.target.value })}
                          />
                        ) : null}
                        {!isLocked ? (
                          <button
                            type="button"
                            onClick={() => setExpandedLine(open ? null : l.id)}
                            className="mt-1 flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-blue-600"
                          >
                            {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            {t('offer.details.lineExtras')}
                          </button>
                        ) : null}
                      </td>
                      <td className="px-2 py-2">
                        <input
                          className={inputCls}
                          value={l.uom ?? ''}
                          disabled={isLocked}
                          onChange={(e) => editLine(l.id, { uom: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-col gap-1">
                          <input
                            type="number"
                            min={0}
                            className={inputCls}
                            value={l.requestedQty}
                            disabled={isLocked}
                            onChange={(e) => editLine(l.id, { requestedQty: Number(e.target.value) })}
                          />
                          <input
                            type="date"
                            className={`${inputCls} text-xs`}
                            value={l.requestedDate ?? ''}
                            disabled={isLocked}
                            onChange={(e) => editLine(l.id, { requestedDate: e.target.value })}
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-col gap-1">
                          <input
                            type="number"
                            min={0}
                            className={inputCls}
                            value={l.confirmedQty ?? ''}
                            disabled={isLocked}
                            placeholder={String(l.requestedQty)}
                            onChange={(e) => editLine(l.id, { confirmedQty: e.target.value === '' ? undefined : Number(e.target.value) })}
                          />
                          <input
                            type="date"
                            className={`${inputCls} text-xs`}
                            value={l.confirmedDate ?? ''}
                            disabled={isLocked}
                            onChange={(e) => editLine(l.id, { confirmedDate: e.target.value })}
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className={`${inputCls} text-right`}
                          value={l.unitPrice}
                          disabled={isLocked}
                          onChange={(e) => editLine(l.id, { unitPrice: Number(e.target.value) })}
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-semibold text-slate-800">
                        {lineTotal.toFixed(2)}
                        {Number(l.discountPercent) > 0 ? (
                          <span className="ml-1 rounded bg-emerald-50 px-1 py-0.5 text-[10px] font-medium text-emerald-700">
                            −{l.discountPercent}%
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2">
                        {!isLocked ? (
                          <button
                            type="button"
                            onClick={() => { removeQuoteOfferLine(db, l.id); onChange?.() }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                            title={t('offer.details.removeLine')}
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                    {open && !isLocked ? (
                      <tr className="bg-slate-50/60">
                        <td colSpan={7} className="px-3 py-2">
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            <div>
                              <label className="block text-[10px] font-medium text-slate-500">{t('offer.details.requirements')}</label>
                              <textarea
                                rows={2}
                                className={`mt-1 ${inputCls}`}
                                value={l.requirements ?? ''}
                                onChange={(e) => editLine(l.id, { requirements: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-slate-500">{t('offer.details.remark')}</label>
                              <textarea
                                rows={2}
                                className={`mt-1 ${inputCls}`}
                                value={l.remark ?? ''}
                                onChange={(e) => editLine(l.id, { remark: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-slate-500">{t('offer.details.discount')}</label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                className={`mt-1 ${inputCls}`}
                                value={l.discountPercent ?? ''}
                                placeholder="0"
                                onChange={(e) => editLine(l.id, { discountPercent: e.target.value === '' ? undefined : Number(e.target.value) })}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-slate-500">{t('offer.details.priceCurrency')}</label>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                className={`mt-1 ${inputCls}`}
                                value={l.priceCurrency ?? ''}
                                placeholder="—"
                                onChange={(e) => editLine(l.id, { priceCurrency: e.target.value === '' ? undefined : Number(e.target.value) })}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          {!isLocked ? (
            <div className="border-t border-slate-100 p-2">
              <button
                type="button"
                onClick={addLine}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700"
              >
                <Plus size={13} /> {t('offer.details.addLine')}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
