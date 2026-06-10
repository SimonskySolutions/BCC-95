import { useMemo, useState } from 'react'
import { useDb } from '../../data/useDb.js'
import { Plus, Trash2, Clock, Package, Wrench, DollarSign, ArrowLeftRight } from 'lucide-react'
import { useLanguage } from '../../i18n/useLanguage.js'
import {
  selectActiveBomForProduct,
  selectBomLines,
  selectBomOperations,
  selectBomTotalCycleMinutes,
} from '../../domains/bom/selectors.js'
import {
  appendBomHeader,
  appendBomLine,
  removeBomLine,
  appendBomOperation,
  removeBomOperation,
  patchBomLine,
  patchBomOperation,
} from '../../domains/bom/mutations.js'

function SubstituteForm({ productId, db, t, onAdd }) {
  const [compId, setCompId] = useState('')
  const [qty, setQty] = useState('1')
  const [note, setNote] = useState('')

  function handleAdd() {
    if (!compId) return
    onAdd({ componentId: compId, qty: parseFloat(qty) || 1, note })
    setCompId('')
    setQty('1')
    setNote('')
  }

  return (
    <div className="flex flex-wrap items-end gap-2 pt-1">
      <div className="flex-1 min-w-[140px]">
        <label className="block text-[10px] text-slate-500 mb-1">{t('bom.substituteComponent')}</label>
        <select
          value={compId}
          onChange={(e) => setCompId(e.target.value)}
          className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">{t('bom.selectComponent')}</option>
          {db.products.filter((p) => p.id !== productId).map((p) => (
            <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
          ))}
        </select>
      </div>
      <div className="w-16">
        <label className="block text-[10px] text-slate-500 mb-1">{t('bom.substituteQty')}</label>
        <input type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)}
          className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-300" />
      </div>
      <div className="flex-1 min-w-[100px]">
        <label className="block text-[10px] text-slate-500 mb-1">{t('bom.substituteNote')}</label>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional"
          className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300" />
      </div>
      <button type="button" onClick={handleAdd}
        className="flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700">
        <Plus size={11} /> {t('bom.addSubstitute')}
      </button>
    </div>
  )
}

/** @param {number} mins */
function fmtMins(mins) {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}min` : `${h}h`
}

/**
 * @param {{
 *   db: import('../../data/mockDatabase.js').MockDatabase
 *   productId: string
 * }} props
 */
export default function BomEditor({ db, productId }) {
  const { t } = useLanguage()
  const { commit } = useDb()
  const refresh = () => commit()
  const [activeSection, setActiveSection] = useState(/** @type {'components'|'routing'|'substitutes'} */ ('components'))
  // substitutes: { [bomLineId]: Array<{componentId, qty, note}> }
  const [substitutes, setSubstitutes] = useState(/** @type {Record<string, Array<{componentId:string,qty:number,note:string}>>} */ ({}))
  const [subLine, setSubLine] = useState(/** @type {string|null} */ (null))

  const bom = useMemo(() => selectActiveBomForProduct(db, productId), [db, productId, db.bomHeaders.length])
  const lines = useMemo(() => (bom ? selectBomLines(db, bom.id) : []), [db, bom, db.bomLines.length])
  const ops = useMemo(() => (bom ? selectBomOperations(db, bom.id) : []), [db, bom, db.bomOperations.length])
  const totalCycle = useMemo(() => (bom ? selectBomTotalCycleMinutes(db, bom.id) : 0), [db, bom, db.bomOperations.length])

  const productLookup = useMemo(
    () => Object.fromEntries(db.products.map((p) => [p.id, p])),
    [db.products],
  )
  const machineLookup = useMemo(
    () => Object.fromEntries(db.machines.map((m) => [m.id, m])),
    [db.machines],
  )

  const costRollup = useMemo(() => {
    let total = 0
    let hasUnpriced = false
    const rows = lines.map((line) => {
      const comp = productLookup[line.componentId]
      const price = comp?.priceAverage
      const lineTotal = price != null ? line.qty * price : null
      if (lineTotal != null) total += lineTotal
      else hasUnpriced = true
      return { line, comp, price, lineTotal }
    })
    return { rows, total, hasUnpriced }
  }, [lines, productLookup])

  function createBom() {
    appendBomHeader(db, {
      productId,
      qtyPerBom: 1,
      uom: 'ea',
      type: 'manufacture',
      version: 1,
      active: true,
    })
    refresh()
  }

  function addLine() {
    if (!bom) return
    appendBomLine(db, {
      bomId: bom.id,
      sequence: lines.length + 1,
      componentId: '',
      qty: 1,
      uom: 'ea',
    })
    refresh()
  }

  function addOp() {
    if (!bom) return
    appendBomOperation(db, {
      bomId: bom.id,
      sequence: ops.length + 1,
      name: '',
      setupMinutes: 0,
      cycleMinutes: 0,
    })
    refresh()
  }

  if (!bom) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <Package size={32} className="text-slate-300" />
        <div>
          <p className="text-sm font-semibold text-slate-700">{t('bom.noBom')}</p>
          <p className="mt-1 text-xs text-slate-500">{t('bom.noBomHint')}</p>
        </div>
        <button
          type="button"
          onClick={createBom}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {t('bom.createBom')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* BoM header summary */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('bom.headerLabel')}</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            {t('bom.produces')} {bom.qtyPerBom} {bom.uom} · {t(`bom.type.${bom.type}`)} · v{bom.version}
          </p>
          {bom.notes ? <p className="mt-1 text-xs text-slate-500">{bom.notes}</p> : null}
        </div>
        <div className="flex shrink-0 gap-3 text-center">
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-lg font-bold text-slate-900">{lines.length}</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">{t('bom.components')}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-lg font-bold text-slate-900">{ops.length}</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">{t('bom.operations')}</p>
          </div>
          <div className="rounded-xl bg-sky-50 px-3 py-2">
            <p className="text-lg font-bold text-sky-700">{fmtMins(totalCycle)}</p>
            <p className="text-[10px] uppercase tracking-wide text-sky-500">{t('bom.cycleTime')}</p>
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2">
        {/** @type {Array<'components'|'routing'|'substitutes'>} */ (['components', 'routing', 'substitutes']).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setActiveSection(s)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              activeSection === s
                ? 'bg-slate-900 text-white shadow'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {s === 'components' ? <Package size={12} /> : s === 'routing' ? <Wrench size={12} /> : <ArrowLeftRight size={12} />}
            {t(`bom.section.${s}`)}
          </button>
        ))}
      </div>

      {/* Components table */}
      {activeSection === 'components' ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-8 px-3 py-3">#</th>
                <th className="px-3 py-3">{t('bom.col.component')}</th>
                <th className="px-3 py-3">{t('bom.col.type')}</th>
                <th className="px-3 py-3 text-right">{t('bom.col.qty')}</th>
                <th className="px-3 py-3">{t('bom.col.uom')}</th>
                <th className="px-3 py-3">{t('bom.col.consumedAt')}</th>
                <th className="px-3 py-3">{t('bom.col.store')}</th>
                <th className="px-3 py-3 text-right">{t('bom.col.leadDays')}</th>
                <th className="w-8 px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line) => {
                const comp = productLookup[line.componentId]
                const consumedOp = ops.find((o) => o.id === line.bomOperationId)
                const typeColor =
                  comp?.type === 'raw_material'
                    ? 'bg-amber-100 text-amber-800'
                    : comp?.type === 'semi_finished'
                      ? 'bg-violet-100 text-violet-800'
                      : 'bg-slate-100 text-slate-600'
                return (
                  <tr key={line.id} className="group hover:bg-slate-50/60">
                    <td className="px-3 py-3 text-xs text-slate-400">{line.sequence}</td>
                    <td className="px-3 py-3">
                      {comp ? (
                        <div>
                          <p className="font-medium text-slate-900">{comp.name}</p>
                          <p className="text-[11px] text-slate-400">{comp.sku}</p>
                        </div>
                      ) : (
                        <select
                          className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                          value={line.componentId}
                          onChange={(e) => {
                            patchBomLine(db, line.id, { componentId: e.target.value })
                            refresh()
                          }}
                        >
                          <option value="">{t('bom.selectComponent')}</option>
                          {db.products
                            .filter((p) => p.id !== productId)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.sku} — {p.name}
                              </option>
                            ))}
                        </select>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {comp ? (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${typeColor}`}>
                          {t(`product.type.${comp.type}`)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={line.qty}
                        onChange={(e) => {
                          patchBomLine(db, line.id, { qty: parseFloat(e.target.value) || 0 })
                          refresh()
                        }}
                        className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">{line.uom}</td>
                    <td className="px-3 py-3 text-xs text-slate-500">
                      {consumedOp ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px]">
                          {consumedOp.sequence}. {consumedOp.name}
                        </span>
                      ) : (
                        <select
                          className="h-7 rounded-lg border border-slate-200 bg-white px-1.5 text-[11px] focus:outline-none"
                          value={line.bomOperationId ?? ''}
                          onChange={(e) => {
                            patchBomLine(db, line.id, { bomOperationId: e.target.value || undefined })
                            refresh()
                          }}
                        >
                          <option value="">{t('bom.anyStep')}</option>
                          {ops.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.sequence}. {o.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        value={line.fromStoreId ?? ''}
                        placeholder="—"
                        onChange={(e) => {
                          patchBomLine(db, line.id, { fromStoreId: e.target.value || undefined })
                          refresh()
                        }}
                        className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="number"
                        min="0"
                        value={line.leadTimeDays ?? ''}
                        placeholder="0"
                        onChange={(e) => {
                          patchBomLine(db, line.id, { leadTimeDays: e.target.value !== '' ? parseInt(e.target.value) : undefined })
                          refresh()
                        }}
                        className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => { removeBomLine(db, line.id); refresh() }}
                        className="invisible text-slate-400 hover:text-red-500 group-hover:visible"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="border-t border-slate-100 p-3">
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              <Plus size={13} /> {t('bom.addComponent')}
            </button>
          </div>
        </div>
      ) : null}

      {/* Cost roll-up */}
      {activeSection === 'components' && lines.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <DollarSign size={14} className="text-emerald-600" />
            <p className="text-xs font-semibold text-slate-700">{t('bom.costRollup')}</p>
          </div>
          <div className="space-y-1.5">
            {costRollup.rows.map(({ line, comp, price, lineTotal }) => (
              <div key={line.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 truncate max-w-[55%]">{comp?.name ?? '—'}</span>
                <span className="text-slate-400">{line.qty} × {price != null ? price.toFixed(2) : '?'}</span>
                <span className={`font-medium ${lineTotal != null ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                  {lineTotal != null ? `${lineTotal.toFixed(2)}` : t('bom.noPriceAverage')}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-xs font-semibold text-slate-700">{t('bom.totalMaterialCost')}</span>
            <span className="text-base font-bold text-emerald-700">
              {costRollup.total.toFixed(2)} <span className="text-xs font-normal text-slate-500">{t('bom.costPerUnit')}</span>
            </span>
          </div>
          {costRollup.hasUnpriced ? (
            <p className="mt-2 text-[11px] text-amber-600">⚠ Some components have no price set — total is a partial estimate.</p>
          ) : null}
        </div>
      ) : null}

      {/* Substitutes section */}
      {activeSection === 'substitutes' ? (
        <div className="space-y-3">
          {lines.filter((l) => l.componentId).map((line) => {
            const comp = productLookup[line.componentId]
            const subs = substitutes[line.id] ?? []
            const isExpanded = subLine === line.id
            return (
              <div key={line.id} className="rounded-2xl border border-slate-200 bg-white shadow-card">
                <button
                  type="button"
                  onClick={() => setSubLine(isExpanded ? null : line.id)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{comp?.name ?? line.componentId}</p>
                    <p className="text-xs text-slate-500">{subs.length} substitute{subs.length !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-xs text-slate-400">{isExpanded ? '▲' : '▼'}</span>
                </button>
                {isExpanded ? (
                  <div className="border-t border-slate-100 p-4 space-y-3">
                    {subs.length === 0 ? (
                      <p className="text-xs text-slate-400">{t('bom.noSubstitutes')}</p>
                    ) : (
                      <div className="space-y-2">
                        {subs.map((sub, idx) => {
                          const subComp = productLookup[sub.componentId]
                          return (
                            <div key={idx} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                              <span className="flex-1 text-xs font-medium text-slate-800">{subComp?.name ?? sub.componentId}</span>
                              <span className="text-xs text-slate-500">×{sub.qty}</span>
                              {sub.note ? <span className="text-xs text-slate-400 italic">{sub.note}</span> : null}
                              <button
                                type="button"
                                onClick={() => setSubstitutes((prev) => {
                                  const arr = [...(prev[line.id] ?? [])]
                                  arr.splice(idx, 1)
                                  return { ...prev, [line.id]: arr }
                                })}
                                className="text-red-400 hover:text-red-600"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <SubstituteForm
                      productId={productId}
                      db={db}
                      t={t}
                      onAdd={(sub) => setSubstitutes((prev) => ({ ...prev, [line.id]: [...(prev[line.id] ?? []), sub] }))}
                    />
                  </div>
                ) : null}
              </div>
            )
          })}
          {lines.filter((l) => l.componentId).length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">{t('bom.noBomHint')}</p>
          ) : null}
        </div>
      ) : null}

      {/* Routing / operations table */}
      {activeSection === 'routing' ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-8 px-3 py-3">#</th>
                <th className="px-3 py-3">{t('bom.col.operation')}</th>
                <th className="px-3 py-3">{t('bom.col.workcenter')}</th>
                <th className="px-3 py-3 text-right">{t('bom.col.setup')}</th>
                <th className="px-3 py-3 text-right">{t('bom.col.cycle')}</th>
                <th className="px-3 py-3 text-right">{t('bom.col.totalPerUnit')}</th>
                <th className="w-8 px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ops.map((op) => {
                const machine = op.workcenterId ? machineLookup[op.workcenterId] : null
                return (
                  <tr key={op.id} className="group hover:bg-slate-50/60">
                    <td className="px-3 py-3 text-xs text-slate-400">{op.sequence}</td>
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        value={op.name}
                        placeholder={t('bom.opNamePlaceholder')}
                        onChange={(e) => {
                          patchBomOperation(db, op.id, { name: e.target.value })
                          refresh()
                        }}
                        className="w-full min-w-[120px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </td>
                    <td className="px-3 py-3">
                      {machine ? (
                        <span className="text-xs font-medium text-slate-700">{machine.name}</span>
                      ) : (
                        <select
                          className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                          value={op.workcenterId ?? ''}
                          onChange={(e) => {
                            patchBomOperation(db, op.id, { workcenterId: e.target.value || undefined })
                            refresh()
                          }}
                        >
                          <option value="">{t('bom.noWorkcenter')}</option>
                          {db.machines.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min="0"
                          value={op.setupMinutes}
                          onChange={(e) => {
                            patchBomOperation(db, op.id, { setupMinutes: parseInt(e.target.value) || 0 })
                            refresh()
                          }}
                          className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                        <span className="text-xs text-slate-400">min</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min="0"
                          value={op.cycleMinutes}
                          onChange={(e) => {
                            patchBomOperation(db, op.id, { cycleMinutes: parseInt(e.target.value) || 0 })
                            refresh()
                          }}
                          className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                        <span className="text-xs text-slate-400">min</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 text-xs font-medium text-slate-700">
                        <Clock size={11} className="text-slate-400" />
                        {fmtMins(op.cycleMinutes)}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => { removeBomOperation(db, op.id); refresh() }}
                        className="invisible text-slate-400 hover:text-red-500 group-hover:visible"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-slate-100 p-3">
            <button
              type="button"
              onClick={addOp}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              <Plus size={13} /> {t('bom.addOperation')}
            </button>
            <p className="text-xs text-slate-500">
              {t('bom.totalCycle')} <span className="font-semibold text-slate-800">{fmtMins(totalCycle)}</span>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
