import { useMemo, useReducer, useState } from 'react'
import { Plus, Trash2, Clock, Package, Wrench } from 'lucide-react'
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
  const [, refresh] = useReducer((x) => x + 1, 0)
  const [activeSection, setActiveSection] = useState(/** @type {'components'|'routing'} */ ('components'))

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
        {/** @type {Array<'components'|'routing'>} */ (['components', 'routing']).map((s) => (
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
            {s === 'components' ? <Package size={12} /> : <Wrench size={12} />}
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
