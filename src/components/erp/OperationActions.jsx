import { useState } from 'react'
import { Check, OctagonPause, Play } from 'lucide-react'
import { useDb } from '../../data/useDb.js'
import { useLanguage } from '../../i18n/useLanguage.js'
import { useToast } from '../ui/feedbackContext.js'
import { setOperationStatus } from '../../domains/operations/mutations.js'
import { completeOperation, startOperation } from '../../services/manufacturing/executionBridge.js'

const OP_STATUS_STYLE = {
  queued: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  done: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  blocked: 'bg-rose-50 text-rose-600 ring-1 ring-rose-100',
}

/** Localized status chip for an operation. */
export function OperationStatusChip({ status }) {
  const { t } = useLanguage()
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${OP_STATUS_STYLE[status] ?? OP_STATUS_STYLE.queued}`}>
      {t(`op.status.${status}`, status)}
    </span>
  )
}

/**
 * Shop-floor actions for one operation: start, complete (with actual hours),
 * block. Completing logs milestone + machine hours + planned-vs-actual time
 * onto the product's open client order via the execution bridge.
 * @param {{ operation: import('../../domains/operations/model.js').Operation }} props
 */
export default function OperationActions({ operation }) {
  const { db, commit } = useDb()
  const { t } = useLanguage()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [hours, setHours] = useState('')

  const plannedHours = Math.round(((operation.standardMinutes ?? 0) / 60) * 100) / 100

  function start() {
    let res = null
    commit(() => { res = startOperation(db, operation.id) })
    const orderNote = res?.order ? ` ${t('mfg.orderInProduction', 'Order {id} is now in production.').replace('{id}', res.order.id)}` : ''
    toast(`${t('mfg.opStarted', 'Operation started.')}${orderNote}`)
  }

  function finish() {
    let res = null
    commit(() => {
      res = completeOperation(db, operation.id, {
        actualHours: Number(hours) || plannedHours,
        allDoneMilestone: t('mfg.allDoneMilestone', 'Production completed'),
      })
    })
    setConfirming(false)
    setHours('')
    if (res?.logged) {
      toast(`${t('mfg.opDone', 'Operation completed.')} ${t('mfg.loggedToOrder', 'Logged to order {id}.').replace('{id}', res.order.id)}`)
    } else {
      toast(t('mfg.noLinkedOrder', 'Operation completed — no open client order for this product, nothing was logged.'), { type: 'warning' })
    }
  }

  if (operation.status === 'done') return null

  return (
    <span className="relative inline-flex items-center gap-1">
      {operation.status !== 'in_progress' ? (
        <button
          type="button"
          onClick={start}
          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
        >
          <Play size={11} /> {t('mfg.action.start', 'Start')}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => { setConfirming((v) => !v); setHours(String(plannedHours || '')) }}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            <Check size={11} /> {t('mfg.action.done', 'Done')}
          </button>
          <button
            type="button"
            onClick={() => { commit(() => setOperationStatus(db, operation.id, 'blocked')); toast(t('mfg.opBlocked', 'Operation blocked.'), { type: 'warning' }) }}
            title={t('mfg.action.block', 'Block')}
            className="inline-flex items-center rounded-lg border border-rose-200 px-1.5 py-1 text-rose-600 hover:bg-rose-50"
          >
            <OctagonPause size={11} />
          </button>
          {confirming ? (
            <span className="dp-pop absolute right-0 top-full z-20 mt-1 flex items-end gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <label className="block text-[10px] font-medium text-slate-500">
                {t('mfg.actualHours', 'Actual hours')}
                <input
                  autoFocus
                  type="number"
                  min={0}
                  step="any"
                  className="mt-0.5 block w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') finish(); if (e.key === 'Escape') setConfirming(false) }}
                />
              </label>
              <button type="button" onClick={finish} className="rounded-lg bg-emerald-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700">
                {t('common.confirm', 'Confirm')}
              </button>
            </span>
          ) : null}
        </>
      )}
    </span>
  )
}
