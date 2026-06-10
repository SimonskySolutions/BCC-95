import { useMemo, useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { QUOTE_LINE_ITEM_KINDS } from '../../../domains/quotations/model.js'
import {
  draftQuoteVersion,
  ensureQuoteForProduct,
  replaceLineItems,
} from '../../../services/offers/quoteVersioningService.js'

/**
 * @param {{ type: 'success' | 'error' | 'info'; message: string; onDismiss: () => void }} props
 */
function FlashBanner({ type, message, onDismiss }) {
  const styles = {
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    error:   'bg-rose-50 text-rose-800 ring-rose-200',
    info:    'bg-blue-50 text-blue-800 ring-blue-200',
  }
  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium ring-1 ${styles[type]}`}>
      <span>{message}</span>
      <button type="button" onClick={onDismiss} className="ml-3 opacity-60 hover:opacity-100">✕</button>
    </div>
  )
}

/**
 * Cost rollup + terms panel.
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
  const [batchQty, setBatchQty] = useState(() => {
    if (version?.moq) return version.moq
    const productionItems = lineItems.filter((li) => li.kind === 'material' || li.kind === 'labor')
    if (productionItems.length) return Math.max(...productionItems.map((li) => li.quantity))
    return 100
  })
  const [leadTimeDays, setLeadTimeDays] = useState(version?.leadTimeDays ?? 30)
  const [moq, setMoq] = useState(version?.moq ?? '')
  const [flash, setFlash] = useState(/** @type {{ type: 'success'|'error'|'info'; message: string } | null} */ (null))

  // Display-only here — currency/language/validity are offer-header concerns
  // edited in the Offer step (OfferDetailsPanel).
  const currency = version?.currency ?? quote?.currency ?? 'EUR'

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0),
        0,
      ),
    [items],
  )

  const effectiveBatchQty = Number(batchQty) || 1
  const costPerUnit = subtotal / effectiveBatchQty
  const marginAmount = costPerUnit * (margin / 100)
  const sellPricePerUnit = costPerUnit * (1 + margin / 100)
  const orderTotal = sellPricePerUnit * effectiveBatchQty

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
      setFlash({ type: 'success', message: t('offer.draftSaved') })
      onChange?.()
    } else {
      setFlash({ type: 'error', message: t('offer.versionLocked') })
    }
  }

  function createNewVersion() {
    const theQuote = quote ?? ensureQuoteForProduct(db, { productId, clientId, inquiryId, actorId })
    const res = draftQuoteVersion(db, {
      quoteId: theQuote.id,
      lineItems: items.map((li) => ({
        kind: li.kind,
        description: li.description,
        quantity: Number(li.quantity) || 0,
        unitPrice: Number(li.unitPrice) || 0,
      })),
      marginPercent: Number(margin) || 0,
      unitPrice: Number(sellPricePerUnit.toFixed(2)),
      leadTimeDays: Number(leadTimeDays) || undefined,
      moq: moq ? Number(moq) : effectiveBatchQty,
      actorId,
    })
    if (res.ok) {
      setFlash({ type: 'success', message: t('offer.newVersionCreated') })
      onChange?.()
    } else if (res.code === 'tasks_incomplete') {
      setFlash({ type: 'error', message: `${t('offer.tasksIncomplete')}: ${(res.pendingKeys ?? []).map((k) => k.replace(/-/g, ' ')).join(', ')}` })
    } else {
      setFlash({ type: 'error', message: t('offer.error') })
    }
  }

  const inputCls = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400'

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{t('offer.calculation')}</h3>
        {isLocked ? (
          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-300">
            {t('offer.versionLockedBadge')}
          </span>
        ) : null}
      </header>

      {/* Line items table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">{t('offer.kind')}</th>
              <th className="px-3 py-2">{t('offer.description')}</th>
              <th className="px-3 py-2 text-right w-24">{t('offer.qty')}</th>
              <th className="px-3 py-2 text-right w-28">{t('offer.unit')} ({currency})</th>
              <th className="px-3 py-2 text-right w-28">{t('offer.total')} ({currency})</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((li, idx) => (
              <tr key={li.id ?? idx} className="group">
                <td className="px-3 py-2">
                  <select
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:bg-slate-50 disabled:text-slate-400"
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
                <td className="px-3 py-2">
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:bg-slate-50 disabled:text-slate-400"
                    value={li.description}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                    disabled={isLocked}
                    placeholder="Describe this cost…"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-xs disabled:bg-slate-50 disabled:text-slate-400"
                    value={li.quantity}
                    onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                    disabled={isLocked}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-xs disabled:bg-slate-50 disabled:text-slate-400"
                    value={li.unitPrice}
                    onChange={(e) => updateItem(idx, { unitPrice: e.target.value })}
                    disabled={isLocked}
                  />
                </td>
                <td className="px-3 py-2 text-right font-semibold text-slate-800">
                  {((Number(li.quantity) || 0) * (Number(li.unitPrice) || 0)).toFixed(2)}
                </td>
                <td className="px-3 py-2">
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                      title="Remove line"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLocked && (
          <div className="border-t border-slate-100 p-2">
            <button
              type="button"
              onClick={addItem}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700"
            >
              <Plus size={13} />
              {t('offer.addLineItem')}
            </button>
          </div>
        )}
      </div>

      {/* Cost summary */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-200">
          <div className="space-y-2 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Cost breakdown</p>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <dt>{t('offer.subtotal')}</dt>
                <dd className="font-medium">{subtotal.toFixed(2)} {currency}</dd>
              </div>
              <div className="flex justify-between text-slate-600">
                <dt>Cost / unit <span className="text-slate-400">(÷ {effectiveBatchQty})</span></dt>
                <dd className="font-medium">{costPerUnit.toFixed(4)} {currency}</dd>
              </div>
              <div className="flex justify-between text-slate-600">
                <dt>Margin ({margin}%)</dt>
                <dd className="font-medium">+ {marginAmount.toFixed(4)} {currency}</dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col justify-center gap-1 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Selling price</p>
            <p className="text-2xl font-bold text-slate-900">{sellPricePerUnit.toFixed(2)} <span className="text-base font-medium text-slate-500">{currency}</span></p>
            <p className="text-xs text-slate-500">per unit · order total: <span className="font-semibold text-slate-700">{orderTotal.toFixed(2)} {currency}</span></p>
          </div>
        </div>
      </div>

      {/* Terms grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <label className="block text-xs font-medium text-slate-600">
          Margin %
          <input
            type="number"
            className={inputCls}
            value={margin}
            onChange={(e) => setMargin(Number(e.target.value))}
            disabled={isLocked}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Batch qty
          <input
            type="number"
            min={1}
            className={inputCls}
            value={batchQty}
            onChange={(e) => setBatchQty(Number(e.target.value))}
            disabled={isLocked}
            title="Production batch size — used to compute per-unit cost and selling price"
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          {t('offer.leadTime')} <span className="text-slate-400">(days)</span>
          <input
            type="number"
            className={inputCls}
            value={leadTimeDays}
            onChange={(e) => setLeadTimeDays(Number(e.target.value))}
            disabled={isLocked}
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          {t('offer.moq')}
          <input
            type="number"
            className={inputCls}
            value={moq}
            onChange={(e) => setMoq(e.target.value)}
            disabled={isLocked}
          />
        </label>
      </div>
      <p className="text-[11px] text-slate-400">{t('offer.costing.headerHint')}</p>

      {/* Actions — one primary button: create the draft, or save changes to it */}
      {!isLocked && (
        <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
          {version && version.status === 'draft' ? (
            <button
              type="button"
              onClick={saveDraftChanges}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {t('offer.saveDraft')}
            </button>
          ) : (
            <div>
              <button
                type="button"
                onClick={createNewVersion}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {t('offer.createDraft')} →
              </button>
              <p className="mt-1 text-[11px] text-slate-400">{t('offer.createDraft.hint')}</p>
            </div>
          )}
        </div>
      )}

      {flash ? (
        <FlashBanner
          type={flash.type}
          message={flash.message}
          onDismiss={() => setFlash(null)}
        />
      ) : null}
    </div>
  )
}
