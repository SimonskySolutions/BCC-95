import { useEffect, useState } from 'react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { advanceOnEnter } from '../../../lib/forms.js'
import { GROUP_DRIVERS } from '../../../domains/quotations/model.js'
import {
  selectCostSheetByQuote,
  selectCostSheetsByQuote,
  selectCostSheetLines,
  selectCostCatalog,
  computeCostRollup,
} from '../../../domains/quotations/selectors.js'
import {
  patchCostSheet,
  appendCostSheetLine,
  patchCostSheetLine,
  removeCostSheetLine,
} from '../../../domains/quotations/mutations.js'
import {
  ensureQuoteForProduct,
  ensureCostSheet,
  addProductCostSheet,
  draftVersionFromCostSheet,
  lineFromCatalog,
} from '../../../services/offers/index.js'
import CostGroupSection from './CostGroupSection.jsx'
import CombinedSummary from './CombinedSummary.jsx'

function FlashBanner({ type, message, onDismiss }) {
  const styles = {
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    error: 'bg-rose-50 text-rose-800 ring-rose-200',
    info: 'bg-blue-50 text-blue-800 ring-blue-200',
  }
  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium ring-1 ${styles[type]}`}>
      <span>{message}</span>
      <button type="button" onClick={onDismiss} className="ml-3 opacity-60 hover:opacity-100">✕</button>
    </div>
  )
}

/**
 * The grouped cost calculation — four independent cost groups (materials,
 * labour, machine & energy, burden) plus the tooling ledger and logistics, each
 * with its own subtotal, combining into the cost price → EXW → DAP chain.
 *
 * The sheet is the always-editable working calculation (decoupled from the
 * immutable version snapshots), so it stays editable regardless of offer status.
 * "Save to offer version" snapshots the current numbers into a new version.
 *
 * @param {{
 *   db: import('../../../data/mockDatabase.js').MockDatabase
 *   productId: string
 *   clientId: string
 *   inquiryId?: string
 *   quote?: import('../../../domains/quotations/model.js').QuoteDraft
 *   actorId?: string
 *   onChange?: () => void
 * }} props
 */
export default function CostSheetPanel({ db, productId, clientId, inquiryId, quote, actorId, onChange }) {
  const { t } = useLanguage()
  const [flash, setFlash] = useState(/** @type {{type:'success'|'error'|'info';message:string}|null} */ (null))
  const [selectedSheetId, setSelectedSheetId] = useState(/** @type {string | null} */ (null))

  // Ensure a quote + working cost sheet exist the moment the costing step is
  // opened. Both helpers are idempotent, so this runs at most once effectively.
  useEffect(() => {
    const q = quote ?? ensureQuoteForProduct(db, { productId, clientId, inquiryId, actorId })
    const inquiry = (db.inquiries ?? []).find((i) => i.id === inquiryId)
    let changed = false
    if (!selectCostSheetByQuote(db, q.id)) {
      ensureCostSheet(db, {
        quoteId: q.id,
        productId,
        currency: q.currency,
        marginPercent: q.marginPercent,
        annualQty: inquiry?.requestedQuantity,
        quantities: inquiry?.requestedQuantities,
        actorId,
      })
      changed = true
    }
    // A cost sheet per additional product captured on the inquiry.
    const existing = selectCostSheetsByQuote(db, q.id)
    for (const ep of inquiry?.extraProducts ?? []) {
      if (!ep.name || existing.some((s) => (s.productLabel || '') === ep.name)) continue
      addProductCostSheet(db, {
        quoteId: q.id,
        productLabel: ep.name,
        quantities: ep.quantities,
        currency: q.currency,
        marginPercent: q.marginPercent,
      })
      changed = true
    }
    if (changed) onChange?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sheets = quote ? selectCostSheetsByQuote(db, quote.id) : []
  const sheet = sheets.find((s) => s.id === selectedSheetId) ?? sheets[0]
  if (!sheet) {
    return <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">{t('cost.preparing')}</p>
  }

  function addProduct() {
    if (!quote) return
    const created = addProductCostSheet(db, {
      quoteId: quote.id,
      productLabel: t('cost.newProduct'),
      currency: sheet.currency,
      marginPercent: sheet.marginPercent,
    })
    setSelectedSheetId(created.id)
    onChange?.()
  }

  const lines = selectCostSheetLines(db, sheet.id)
  const rollup = computeCostRollup(sheet, lines)
  const currency = sheet.currency ?? 'EUR'
  const ctx = {
    netKg: rollup.netKg,
    costBase: rollup.groups.material + rollup.groups.operation,
  }

  const linesIn = (group) => lines.filter((l) => l.group === group)

  const patchSheet = (patch) => { patchCostSheet(db, sheet.id, patch); onChange?.() }
  const patchLine = (id, patch) => { patchCostSheetLine(db, id, patch); onChange?.() }
  const removeLine = (id) => { removeCostSheetLine(db, id); onChange?.() }
  const addLine = (group) => (entry) => {
    if (entry) appendCostSheetLine(db, lineFromCatalog(sheet.id, entry))
    else appendCostSheetLine(db, { costSheetId: sheet.id, group, driver: GROUP_DRIVERS[group][0], description: '' })
    onChange?.()
  }

  const catalog = (group) => selectCostCatalog(db, group)

  function saveToVersion() {
    const res = draftVersionFromCostSheet(db, { quoteId: sheet.quoteId, inquiryId, clientId, productId, actorId })
    if (res.ok) {
      setFlash({ type: 'success', message: t('cost.savedToVersion') })
      onChange?.()
    } else if (res.code === 'tasks_incomplete') {
      setFlash({ type: 'error', message: `${t('offer.tasksIncomplete')}: ${(res.pendingKeys ?? []).map((k) => k.replace(/-/g, ' ')).join(', ')}` })
    } else {
      setFlash({ type: 'error', message: t('offer.error') })
    }
  }

  return (
    <div className="space-y-2" onKeyDown={advanceOnEnter}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
          {t('cost.alwaysEditable')}
        </span>
      </div>

      {/* Product tabs — one cost sheet per product in the offer */}
      <div className="flex flex-wrap items-center gap-1.5">
        {sheets.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelectedSheetId(s.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              s.id === sheet.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {s.productLabel || t('cost.untitledProduct')}
          </button>
        ))}
        <button
          type="button"
          onClick={addProduct}
          className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-blue-300 hover:text-blue-700"
        >
          + {t('cost.addProduct')}
        </button>
      </div>

      {/* Product name for the selected sheet */}
      <label className="block text-xs font-medium text-slate-600">
        {t('cost.productName')}
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium"
          value={sheet.productLabel ?? ''}
          placeholder={t('cost.untitledProduct')}
          onChange={(e) => { patchCostSheet(db, sheet.id, { productLabel: e.target.value }); onChange?.() }}
        />
      </label>

      {/* 1 — Материали */}
      <CostGroupSection
        index={1} accent="emerald" group="material"
        title={t('cost.group.material')} hint={t('cost.group.material.hint')}
        lines={linesIn('material')} ctx={ctx} subtotal={rollup.groups.material}
        currency={currency} catalog={catalog('material')}
        onAdd={addLine('material')} onPatchLine={patchLine} onRemoveLine={removeLine}
      />
      {/* 2 — Операции */}
      <CostGroupSection
        index={2} accent="violet" group="operation"
        title={t('cost.group.operation')} hint={t('cost.group.operation.hint')}
        lines={linesIn('operation')} ctx={ctx} subtotal={rollup.groups.operation}
        currency={currency} catalog={catalog('operation')}
        onAdd={addLine('operation')} onPatchLine={patchLine} onRemoveLine={removeLine}
      />
      {/* 3 — Инструменти */}
      <CostGroupSection
        index={3} accent="blue" group="tooling"
        title={t('cost.group.tooling')} hint={t('cost.group.tooling.hint')}
        lines={linesIn('tooling')} ctx={ctx} subtotal={rollup.toolingTotal}
        currency={currency} catalog={catalog('tooling')}
        onAdd={addLine('tooling')} onPatchLine={patchLine} onRemoveLine={removeLine}
      />
      {/* 4 — Общи разходи */}
      <CostGroupSection
        index={4} accent="amber" group="other"
        title={t('cost.group.other')} hint={t('cost.group.other.hint')}
        lines={linesIn('other')} ctx={ctx} subtotal={rollup.groups.other}
        currency={currency} catalog={catalog('other')}
        onAdd={addLine('other')} onPatchLine={patchLine} onRemoveLine={removeLine}
      />
      {/* 5 — Логистика */}
      <CostGroupSection
        index={5} accent="slate" group="logistics"
        title={t('cost.group.logistics')} hint={t('cost.group.logistics.hint')}
        lines={linesIn('logistics')} ctx={ctx} subtotal={rollup.logistics}
        currency={currency} catalog={catalog('logistics')}
        onAdd={addLine('logistics')} onPatchLine={patchLine} onRemoveLine={removeLine}
      />

      <CombinedSummary rollup={rollup} sheet={sheet} currency={currency} onPatchSheet={patchSheet} />

      {/* Free-text note for the whole calculation (бланка bottom field) */}
      <label className="block text-xs font-medium text-slate-600">
        {t('cost.notes')}
        <textarea
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
          value={sheet.notes ?? ''}
          placeholder={t('cost.notes.placeholder')}
          onChange={(e) => patchSheet({ notes: e.target.value })}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={saveToVersion}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {t('cost.saveToVersion')} →
        </button>
        <p className="text-[11px] text-slate-400">{t('cost.saveToVersion.hint')}</p>
      </div>

      {flash ? <FlashBanner type={flash.type} message={flash.message} onDismiss={() => setFlash(null)} /> : null}
    </div>
  )
}
