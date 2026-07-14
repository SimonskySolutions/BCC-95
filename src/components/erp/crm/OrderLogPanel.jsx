import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { useToast } from '../../ui/feedbackContext.js'
import DatePicker from '../../DatePicker.jsx'
import {
  appendOrderExecutionRecord,
  appendOrderIssue,
  appendOrderMachineUsage,
  appendOrderTimeLog,
} from '../../../domains/crm/mutations.js'

const inputCls = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs'
const labelCls = 'block text-[11px] font-medium text-slate-500'
const INIT = { milestone: '', completedAt: '', notes: '', machineId: '', hours: '', phase: '', plannedHours: '', actualHours: '', severity: 'medium', description: '' }

/**
 * Inline production logging for one client order: milestones, machine hours,
 * planned-vs-actual time and issues. Entries feed the aggregate sections of
 * the client profile.
 * @param {{ db: import('../../../data/mockDatabase.js').MockDatabase, commit: Function, order: import('../../../domains/crm/model.js').ClientOrder }} props
 */
export default function OrderLogPanel({ db, commit, order }) {
  const { t } = useLanguage()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState(/** @type {'milestone'|'machine'|'time'|'issue'} */ ('milestone'))
  const [form, setForm] = useState(INIT)

  const machines = db.machines ?? []
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const canAdd = kind === 'milestone' ? form.milestone.trim()
    : kind === 'machine' ? form.machineId && Number(form.hours) > 0
    : kind === 'time' ? form.phase.trim()
    : form.description.trim()

  function add() {
    if (!canAdd) return
    commit(() => {
      if (kind === 'milestone') {
        appendOrderExecutionRecord(db, { orderId: order.id, milestone: form.milestone, completedAt: form.completedAt || undefined, notes: form.notes })
      } else if (kind === 'machine') {
        appendOrderMachineUsage(db, { orderId: order.id, machineId: form.machineId, hours: Number(form.hours) })
      } else if (kind === 'time') {
        appendOrderTimeLog(db, { orderId: order.id, phase: form.phase, plannedHours: Number(form.plannedHours), actualHours: Number(form.actualHours) })
      } else {
        appendOrderIssue(db, { orderId: order.id, severity: form.severity, description: form.description })
      }
    })
    setForm(INIT)
    toast(t('client.log.added', 'Entry logged.'))
  }

  return (
    <div className="mt-2 border-t border-slate-100 pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900"
      >
        <Plus size={12} /> {t('client.logExecution', 'Log execution')}
      </button>
      {open ? (
        <div className="mt-2 space-y-2 rounded-lg border border-blue-100 bg-blue-50/40 p-2.5">
          <div className="flex flex-wrap gap-1">
            {['milestone', 'machine', 'time', 'issue'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(/** @type {any} */ (k))}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  kind === k ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {t(`client.log.${k}`, k)}
              </button>
            ))}
          </div>

          {kind === 'milestone' ? (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              <label className={labelCls}>
                {t('client.log.milestoneName', 'Milestone')} *
                <input className={inputCls} value={form.milestone} placeholder={t('client.log.milestone.ph', 'e.g. Cutting completed')} onChange={(e) => set({ milestone: e.target.value })} />
              </label>
              <div className={labelCls}>
                {t('client.log.date', 'Date')}
                <DatePicker className="mt-1" value={form.completedAt} onChange={(iso) => set({ completedAt: iso })} />
              </div>
              <label className={labelCls}>
                {t('client.log.notes', 'Notes')}
                <input className={inputCls} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
              </label>
            </div>
          ) : null}

          {kind === 'machine' ? (
            <div className="grid grid-cols-2 gap-2">
              <label className={labelCls}>
                {t('client.log.machineName', 'Machine')} *
                <select className={inputCls} value={form.machineId} onChange={(e) => set({ machineId: e.target.value })}>
                  <option value="">—</option>
                  {machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
              <label className={labelCls}>
                {t('client.log.hours', 'Hours')} *
                <input type="number" min={0} step="any" className={inputCls} value={form.hours} onChange={(e) => set({ hours: e.target.value })} />
              </label>
            </div>
          ) : null}

          {kind === 'time' ? (
            <div className="grid grid-cols-3 gap-2">
              <label className={labelCls}>
                {t('client.log.phase', 'Phase')} *
                <input className={inputCls} value={form.phase} placeholder={t('client.log.phase.ph', 'e.g. Welding')} onChange={(e) => set({ phase: e.target.value })} />
              </label>
              <label className={labelCls}>
                {t('client.log.planned', 'Planned hours')}
                <input type="number" min={0} step="any" className={inputCls} value={form.plannedHours} onChange={(e) => set({ plannedHours: e.target.value })} />
              </label>
              <label className={labelCls}>
                {t('client.log.actual', 'Actual hours')}
                <input type="number" min={0} step="any" className={inputCls} value={form.actualHours} onChange={(e) => set({ actualHours: e.target.value })} />
              </label>
            </div>
          ) : null}

          {kind === 'issue' ? (
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <label className={labelCls}>
                {t('client.log.severity', 'Severity')}
                <select className={inputCls} value={form.severity} onChange={(e) => set({ severity: e.target.value })}>
                  {['low', 'medium', 'high'].map((sv) => <option key={sv} value={sv}>{t(`client.sev.${sv}`, sv)}</option>)}
                </select>
              </label>
              <label className={labelCls}>
                {t('client.log.description', 'Description')} *
                <input className={inputCls} value={form.description} onChange={(e) => set({ description: e.target.value })} />
              </label>
            </div>
          ) : null}

          <div className="flex justify-end">
            <button type="button" onClick={add} disabled={!canAdd} className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {t('common.add', 'Add')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
