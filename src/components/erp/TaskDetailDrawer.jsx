import { useRef, useState } from 'react'
import { X, Plus, Trash2, Paperclip } from 'lucide-react'
import { useLanguage } from '../../i18n/useLanguage.js'
import { TASK_STATUSES, TASK_PRIORITIES } from '../../domains/tasks/model.js'
import { patchTask } from '../../domains/tasks/mutations.js'
import InquiryChatPanel from './offers/InquiryChatPanel.jsx'
import DatePicker from '../DatePicker.jsx'

const STATUS_STYLE = {
  draft: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  blocked: 'bg-amber-100 text-amber-700',
}

function formatSize(b) {
  if (!b && b !== 0) return ''
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${Math.round(b / 1024)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

const fieldCls = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300'

/**
 * Jira-style task detail drawer: edit status/assignee/priority/due date and
 * description, manage labels, a subtask checklist, file attachments, and a
 * comment thread (reuses the discussion engine, keyed task:<id>).
 *
 * @param {{
 *   db: import('../../data/mockDatabase.js').MockDatabase
 *   taskId: string
 *   actorId?: string
 *   onClose: () => void
 *   onChange: () => void
 * }} props
 */
export default function TaskDetailDrawer({ db, taskId, actorId, onClose, onChange }) {
  const { t } = useLanguage()
  const fileRef = useRef(/** @type {HTMLInputElement | null} */ (null))
  const [labelInput, setLabelInput] = useState('')
  const [subtaskInput, setSubtaskInput] = useState('')

  const task = db.tasks.find((x) => x.id === taskId)
  if (!task) return null

  // Suggest labels already used anywhere — avoids typos / duplicates.
  const knownLabels = [...new Set((db.tasks ?? []).flatMap((x) => x.labels ?? []))].sort()

  const patch = (p) => { patchTask(db, task.id, p); onChange() }
  const labels = task.labels ?? []
  const subtasks = task.subtasks ?? []
  const attachments = task.attachments ?? []
  const doneCount = subtasks.filter((s) => s.done).length

  const addLabel = () => {
    const v = labelInput.trim().replace(/^#/, '')
    if (v && !labels.includes(v)) patch({ labels: [...labels, v] })
    setLabelInput('')
  }
  const addSubtask = () => {
    const v = subtaskInput.trim()
    if (v) patch({ subtasks: [...subtasks, { id: `st-${Date.now()}`, title: v, done: false }] })
    setSubtaskInput('')
  }
  const onPickFiles = (e) => {
    const picked = Array.from(e.target.files ?? []).map((f) => ({ id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: f.name, size: f.size }))
    if (picked.length) patch({ attachments: [...attachments, ...picked] })
    e.target.value = ''
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          <input
            className="min-w-0 flex-1 rounded-lg border border-transparent px-1 py-0.5 text-base font-semibold text-slate-900 hover:border-slate-200 focus:border-blue-300 focus:outline-none"
            value={task.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Status + meta */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-slate-600">
              {t('task.status')}
              <select className={`${fieldCls} ${STATUS_STYLE[task.status] ?? ''}`} value={task.status}
                onChange={(e) => patch({ status: e.target.value, ...(e.target.value === 'resolved' ? { completedAt: new Date().toISOString().slice(0, 10) } : {}) })}>
                {TASK_STATUSES.map((s) => <option key={s} value={s}>{t(`taskStatus.${s}`, s)}</option>)}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-600">
              {t('task.priority')}
              <select className={fieldCls} value={task.priority ?? 'medium'} onChange={(e) => patch({ priority: e.target.value })}>
                {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{t(`taskPriority.${p}`, p)}</option>)}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-600">
              {t('task.assignee')}
              <select className={fieldCls} value={task.assigneeId} onChange={(e) => patch({ assigneeId: e.target.value })}>
                {db.employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-600">
              {t('task.due')}
              <DatePicker className="mt-0.5" value={task.dueDate ?? ''} onChange={(iso) => patch({ dueDate: iso })} />
            </label>
          </div>

          {/* Description */}
          <label className="block text-xs font-medium text-slate-600">
            {t('task.description')}
            <textarea className={fieldCls} rows={3} value={task.description ?? ''} placeholder={t('task.descriptionPlaceholder')} onChange={(e) => patch({ description: e.target.value })} />
          </label>

          {/* Labels */}
          <div>
            <p className="text-xs font-medium text-slate-600">{t('task.labels')}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {labels.map((l) => (
                <span key={l} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-100">
                  {l}
                  <button type="button" onClick={() => patch({ labels: labels.filter((x) => x !== l) })} className="opacity-60 hover:opacity-100">✕</button>
                </span>
              ))}
              <input
                list="task-label-suggestions"
                className="h-7 w-32 rounded-md border border-slate-200 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={labelInput}
                placeholder={t('task.addLabel')}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLabel() } }}
              />
              <datalist id="task-label-suggestions">
                {knownLabels.map((l) => <option key={l} value={l} />)}
              </datalist>
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <p className="text-xs font-medium text-slate-600">
              {t('task.subtasks')} {subtasks.length > 0 ? <span className="text-slate-400">({doneCount}/{subtasks.length})</span> : null}
            </p>
            <div className="mt-1 space-y-1">
              {subtasks.map((s) => (
                <div key={s.id} className="group flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-slate-50">
                  <input type="checkbox" checked={s.done} onChange={() => patch({ subtasks: subtasks.map((x) => x.id === s.id ? { ...x, done: !x.done } : x) })} />
                  <span className={`flex-1 text-sm ${s.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{s.title}</span>
                  <button type="button" onClick={() => patch({ subtasks: subtasks.filter((x) => x.id !== s.id) })} className="text-slate-300 opacity-0 group-hover:opacity-100 hover:text-rose-600"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
            <div className="mt-1 flex items-center gap-1">
              <input
                className="h-7 flex-1 rounded-md border border-slate-200 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={subtaskInput}
                placeholder={t('task.addSubtask')}
                onChange={(e) => setSubtaskInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask() } }}
              />
              <button type="button" onClick={addSubtask} className="flex h-7 items-center gap-1 rounded-md border border-slate-200 px-2 text-xs text-slate-500 hover:bg-slate-50"><Plus size={12} /></button>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-600">{t('task.attachments')} {attachments.length > 0 ? <span className="text-slate-400">({attachments.length})</span> : null}</p>
              <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 hover:text-blue-700">
                <Paperclip size={12} /> {t('task.attach')}
              </button>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={onPickFiles} />
            </div>
            <div className="mt-1 space-y-1">
              {attachments.map((a) => (
                <div key={a.id} className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-xs ring-1 ring-slate-200">
                  <Paperclip size={11} className="shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{a.name}</span>
                  {a.size ? <span className="shrink-0 text-[10px] text-slate-400">{formatSize(a.size)}</span> : null}
                  <button type="button" onClick={() => patch({ attachments: attachments.filter((x) => x.id !== a.id) })} className="shrink-0 text-slate-400 hover:text-rose-600">✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Comments / activity */}
          <div className="border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs font-semibold text-slate-700">{t('task.comments')}</p>
            <InquiryChatPanel db={db} threadKey={`task:${task.id}`} actorId={actorId} onChange={onChange} />
          </div>
        </div>
      </div>
    </div>
  )
}
