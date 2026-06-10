import { useState } from 'react'
import { useLanguage } from '../../../i18n/useLanguage.js'

const ATTACHMENT_KINDS = ['drawing', 'spec', 'email', 'other']

/**
 * Controlled list editor for inquiry attachments (name + kind references —
 * binary upload arrives with the backend phase). Shared between the New
 * Inquiry modal and the intake form so a drawing can satisfy the VSM intake
 * checklist from the moment of creation.
 *
 * @param {{
 *   attachments: import('../../../domains/inquiries/model.js').InquiryAttachment[]
 *   onChange: (next: import('../../../domains/inquiries/model.js').InquiryAttachment[]) => void
 * }} props
 */
export default function AttachmentEditor({ attachments, onChange }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState('drawing')

  function add() {
    const trimmed = name.trim()
    if (!trimmed) return
    onChange([...attachments, { id: `att-${Date.now()}`, name: trimmed, kind }])
    setName('')
    setKind('drawing')
    setOpen(false)
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-700">{t('inquiry.attachments')}</h4>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800"
        >
          + {t('inquiry.addAttachment')}
        </button>
      </div>
      {open ? (
        <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-[10px] font-medium text-slate-500">{t('inquiry.attachmentName')}</label>
            <input
              autoFocus
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
              placeholder="Drawing_rev2.pdf"
            />
          </div>
          <div className="w-32">
            <label className="block text-[10px] font-medium text-slate-500">{t('inquiry.attachmentKind')}</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              {ATTACHMENT_KINDS.map((k) => (
                <option key={k} value={k}>{t(`inquiry.kind.${k}`, k)}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={add}
            className="h-8 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
          >
            {t('inquiry.addAttachment')}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-8 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-500 hover:bg-white"
          >
            {t('common.cancel')}
          </button>
        </div>
      ) : null}
      {attachments.length === 0 && !open ? (
        <p className="mt-1 text-xs text-slate-500">{t('inquiry.noAttachments')}</p>
      ) : null}
      {attachments.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1 text-xs"
            >
              <span>
                <span className="font-medium text-slate-800">{a.name}</span>{' '}
                <span className="text-slate-500">({t(`inquiry.kind.${a.kind}`, a.kind)})</span>
              </span>
              <button
                type="button"
                onClick={() => onChange(attachments.filter((x) => x.id !== a.id))}
                className="text-rose-600 hover:text-rose-800"
              >
                {t('common.remove')}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
