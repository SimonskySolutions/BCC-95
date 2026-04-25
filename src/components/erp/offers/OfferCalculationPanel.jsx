import { useMemo, useState } from 'react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { QUOTE_LINE_ITEM_KINDS } from '../../../domains/quotations/model.js'
import {
  draftQuoteVersion,
  ensureQuoteForProduct,
  replaceLineItems,
} from '../../../services/offers/quoteVersioningService.js'

/**
 * Cost rollup + terms panel. Users can add line items for material, tooling,
 * labor etc., see the computed subtotal + margin, set lead time and validity,
 * and either save a draft update or create a new version.
 *
 * @param {{
 *   db: import('../../../data/mockDatabase.js').MockDatabase
 *   productId: string
 *   clientId: string
 *   inquiryId?: string
 *   quote?: import('../../../domains/quotations/model.js').QuoteDraft
 *   version?: import('../../../domains/quotations/model.js').QuoteVersion
 *   lineItems?: import('../../../domains/quotations/model.js').QuoteLineItem[]
 *   actorId?: string
 *   onChange?: () => void
 * }} props
 */
export default function OfferCalculationPanel({
  db,
  productId,
  clientId,
  inquiryId,
  quote,
  version,
  lineItems = [],
  actorId,
  onChange,
}) {
  const { t } = useLanguage()
  const isLocked = version && version.status !== 'draft'

  const [items, setItems] = useState(() =>
    lineItems.length
      ? lineItems.map((li) => ({ ...li }))
      : [
          { id: 'new-0', kind: 'material', description: '', quantity: 1, unitPrice: 0, totalPrice: 0, quoteVersionId: '' },
        ],
  )
  const [margin, setMargin] = useState(version?.marginPercent ?? quote?.marginPercent ?? 18)
  const [leadTimeDays, setLeadTimeDays] = useState(version?.leadTimeDays ?? 30)
  const [validUntil, setValidUntil] = useState(version?.validUntil ?? '')
  const [deliveryTerms, setDeliveryTerms] = useState(version?.deliveryTerms ?? 'FCA Plovdiv (Incoterms 2020)')
  const [paymentTerms, setPaymentTerms] = useState(version?.paymentTerms ?? '30 days net')
  const [moq, setMoq] = useState(version?.moq ?? '')
  const [currency, setCurrency] = useState(version?.currency ?? 'EUR')
  const [language, setLanguageField] = useState(version?.language ?? quote?.language ?? 'en')
  const [flash, setFlash] = useState(/** @type {string | null} */ (null))

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0),
        0,
      ),
    [items],
  )
  const suggestedUnitPrice = useMemo(() => {
    const totalQty = items.reduce((sum, li) => sum + (Number(li.quantity) || 0), 0)
    if (!totalQty) return 0
    return (subtotal * (1 + margin / 100)) / totalQty
  }, [items, subtotal, margin])

  function updateItem(idx, patch) {
    setItems((current) => current.map((li, i) => (i === idx ? { ...li, ...patch } : li)))
  }

  function addItem() {
    setItems((current) => [
      ...current,
      { id: `new-${current.length}`, kind: 'material', description: '', quantity: 1, unitPrice: 0, totalPrice: 0, quoteVersionId: '' },
    ])
  }

  function removeItem(idx) {
    setItems((current) => current.filter((_, i) => i !== idx))
  }

  function saveDraftChanges() {
    if (!version || !quote) return
    const res = replaceLineItems(
      db,
      version.id,
      items.map((li) => ({
        kind: li.kind,
        description: li.description,
        quantity: Number(li.quantity) || 0,
        unitPrice: Number(li.unitPrice) || 0,
      })),
      actorId,
    )
    if (res.ok) {
      setFlash(t('offer.draftSaved'))
      onChange?.()
    } else {
      setFlash(t('offer.versionLocked'))
    }
  }

  function createNewVersion() {
    const theQuote = quote ?? ensureQuoteForProduct(db, { productId, clientId, inquiryId, language, currency, actorId })
    const res = draftQuoteVersion(db, {
      quoteId: theQuote.id,
      lineItems: items.map((li) => ({
        kind: li.kind,
        description: li.description,
        quantity: Number(li.quantity) || 0,
        unitPrice: Number(li.unitPrice) || 0,
      })),
      marginPercent: Number(margin) || 0,
      unitPrice: Number(suggestedUnitPrice.toFixed(2)),
      leadTimeDays: Number(leadTimeDays) || undefined,
      validUntil: validUntil || undefined,
      deliveryTerms,
      paymentTerms,
      moq: moq ? Number(moq) : undefined,
      currency,
      language,
      actorId,
    })
    if (res.ok) {
      setFlash(t('offer.newVersionCreated'))
      onChange?.()
    } else if (res.code === 'tasks_incomplete') {
      setFlash(`${t('offer.tasksIncomplete')}: ${(res.pendingKeys ?? []).join(', ')}`)
    } else {
      setFlash(t('offer.error'))
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{t('offer.calculation')}</h3>
        {isLocked ? (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
            {t('offer.versionLockedBadge')}
          </span>
        ) : null}
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-2 py-1.5">{t('offer.kind')}</th>
              <th className="px-2 py-1.5">{t('offer.description')}</th>
              <th className="px-2 py-1.5 text-right">{t('offer.qty')}</th>
              <th className="px-2 py-1.5 text-right">{t('offer.unit')}</th>
              <th className="px-2 py-1.5 text-right">{t('offer.total')}</th>
              <th className="px-2 py-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((li, idx) => (
              <tr key={li.id ?? idx} className="border-t border-slate-100">
                <td className="px-2 py-1.5">
                  <select
                    className="rounded border border-slate-200 bg-white px-1 py-1 text-xs"
                    value={li.kind}
                    onChange={(e) => updateItem(idx, { kind: e.target.value })}
                    disabled={isLocked}
                  >
                    {QUOTE_LINE_ITEM_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {t(`offer.kind.${k}`, k)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                    value={li.description}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                    disabled={isLocked}
                  />
                </td>
                <td className="px-2 py-1.5 text-right">
                  <input
                    type="number"
                    min={0}
                    className="w-24 rounded border border-slate-200 bg-white px-2 py-1 text-right text-xs"
                    value={li.quantity}
                    onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                    disabled={isLocked}
                  />
                </td>
                <td className="px-2 py-1.5 text-right">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="w-24 rounded border border-slate-200 bg-white px-2 py-1 text-right text-xs"
                    value={li.unitPrice}
                    onChange={(e) => updateItem(idx, { unitPrice: e.target.value })}
                    disabled={isLocked}
                  />
                </td>
                <td className="px-2 py-1.5 text-right font-medium text-slate-800">
                  {((Number(li.quantity) || 0) * (Number(li.unitPrice) || 0)).toFixed(2)}
                </td>
                <td className="px-2 py-1.5 text-right">
                  {isLocked ? null : (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-xs text-rose-600 hover:text-rose-800"
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-100">
              <td colSpan={6} className="px-2 py-1.5 text-right">
                <button
                  type="button"
                  onClick={addItem}
                  className="rounded border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  disabled={isLocked}
                >
                  + {t('offer.addLineItem')}
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <label className="block text-xs font-medium text-slate-600">
          {t('offer.margin')}
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={margin}
            onChange={(e) => setMargin(Number(e.target.value))}
            disabled={isLocked}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          {t('offer.leadTime')}
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={leadTimeDays}
            onChange={(e) => setLeadTimeDays(Number(e.target.value))}
            disabled={isLocked}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          {t('offer.validUntil')}
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            disabled={isLocked}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          {t('offer.moq')}
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={moq}
            onChange={(e) => setMoq(e.target.value)}
            disabled={isLocked}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600 md:col-span-2">
          {t('offer.deliveryTerms')}
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={deliveryTerms}
            onChange={(e) => setDeliveryTerms(e.target.value)}
            disabled={isLocked}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          {t('offer.paymentTerms')}
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            disabled={isLocked}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          {t('offer.currency')}
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={isLocked}
          >
            {['EUR', 'BGN', 'USD'].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-600">
          {t('offer.language')}
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={language}
            onChange={(e) => setLanguageField(e.target.value)}
            disabled={isLocked}
          >
            <option value="en">English</option>
            <option value="bg">Български</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
        <div className="text-sm text-slate-700">
          <div>
            {t('offer.subtotal')}: <span className="font-semibold">{subtotal.toFixed(2)}</span>{' '}
            {currency}
          </div>
          <div>
            {t('offer.suggestedUnit')}:{' '}
            <span className="font-semibold">{suggestedUnitPrice.toFixed(2)}</span> {currency}
          </div>
        </div>
        <div className="flex gap-2">
          {version && version.status === 'draft' ? (
            <button
              type="button"
              onClick={saveDraftChanges}
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {t('offer.saveDraft')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={createNewVersion}
            className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {t('offer.createVersion')}
          </button>
        </div>
      </div>
      {flash ? <p className="text-xs text-slate-600">{flash}</p> : null}
    </div>
  )
}
