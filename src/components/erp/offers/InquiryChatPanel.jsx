import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import {
  selectInquiryMessages,
  selectInquiryThreadTags,
} from '../../../domains/communications/selectors.js'
import {
  appendInquiryMessage,
  removeInquiryMessage,
} from '../../../domains/communications/mutations.js'

const TAG_SUGGESTIONS = ['question', 'blocker', 'pricing', 'technical', 'urgent', 'decision']

const TAG_STYLE = 'inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-blue-100'

function initials(name = '?') {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

/** Render a message body with @mentions highlighted. */
function MessageBody({ text }) {
  const parts = String(text).split(/(@\w+)/g)
  return (
    <p className="whitespace-pre-wrap text-sm text-slate-700">
      {parts.map((part, i) =>
        part.startsWith('@')
          ? <span key={i} className="rounded bg-violet-50 px-1 font-medium text-violet-700">{part}</span>
          : <span key={i}>{part}</span>,
      )}
    </p>
  )
}

/**
 * Persistent discussion thread for an inquiry — an immutable, timestamped log
 * the team can revisit over time. Supports topic tags (filterable) and
 * @mentions of teammates.
 *
 * @param {{
 *   db: import('../../../data/mockDatabase.js').MockDatabase
 *   inquiryId: string
 *   actorId?: string
 *   onChange?: () => void
 * }} props
 */
export default function InquiryChatPanel({ db, inquiryId, actorId, onChange }) {
  const { t } = useLanguage()
  const [body, setBody] = useState('')
  const [tags, setTags] = useState(/** @type {string[]} */ ([]))
  const [tagInput, setTagInput] = useState('')
  const [filter, setFilter] = useState(/** @type {string | null} */ (null))

  const all = selectInquiryMessages(db, inquiryId)
  const threadTags = selectInquiryThreadTags(db, inquiryId)
  const messages = filter ? all.filter((m) => (m.tags ?? []).includes(filter)) : all

  const author = db.employees.find((e) => e.id === actorId) ?? db.employees.find((e) => e.canApproveQuotes) ?? db.employees[0]
  const mentionables = (db.employees ?? []).map((e) => `@${(e.name ?? '').split(' ')[0]}`).filter(Boolean)

  function addTag(value) {
    const tag = value.trim().toLowerCase().replace(/^#/, '')
    if (tag && !tags.includes(tag)) setTags((cur) => [...cur, tag])
    setTagInput('')
  }

  function send() {
    if (!body.trim()) return
    appendInquiryMessage(db, {
      inquiryId,
      authorId: author?.id,
      authorLabel: author?.name ?? t('chat.you'),
      body: body.trim(),
      tags,
    })
    setBody('')
    setTags([])
    onChange?.()
  }

  function remove(id) {
    removeInquiryMessage(db, id)
    onChange?.()
  }

  return (
    <div>
      {/* Tag filter bar */}
      {threadTags.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter(null)}
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ring-1 ${filter === null ? 'bg-slate-800 text-white ring-slate-800' : 'bg-white text-slate-500 ring-slate-200 hover:bg-slate-50'}`}
          >
            {t('chat.filterAll')}
          </button>
          {threadTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setFilter(filter === tag ? null : tag)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ring-1 ${filter === tag ? 'bg-blue-600 text-white ring-blue-600' : 'bg-blue-50 text-blue-700 ring-blue-100 hover:bg-blue-100'}`}
            >
              #{tag}
            </button>
          ))}
        </div>
      ) : null}

      {/* Thread */}
      <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
            {filter ? t('chat.noneForTag') : t('chat.empty')}
          </p>
        ) : null}
        {messages.map((m) => (
          <div key={m.id} className="group flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
              {initials(m.authorLabel)}
            </div>
            <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm bg-slate-50 px-3 py-2">
              <div className="mb-0.5 flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800">{m.authorLabel}</span>
                <span className="text-[10px] text-slate-400">{m.createdAt.replace('T', ' ').slice(0, 16)}</span>
                {m.editedAt ? <span className="text-[10px] italic text-slate-300">{t('chat.edited')}</span> : null}
                <button
                  type="button"
                  onClick={() => remove(m.id)}
                  className="ml-auto text-slate-300 opacity-0 transition-opacity hover:text-rose-600 group-hover:opacity-100"
                  title={t('chat.delete')}
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <MessageBody text={m.body} />
              {(m.tags ?? []).length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {m.tags.map((tag) => (
                    <button key={tag} type="button" onClick={() => setFilter(tag)} className={TAG_STYLE}>#{tag}</button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="mt-4 rounded-xl border border-slate-200 p-2">
        <textarea
          rows={2}
          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={body}
          placeholder={t('chat.placeholder')}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send() } }}
        />

        {/* Selected tags */}
        {tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.map((tag, i) => (
              <span key={tag} className={TAG_STYLE}>
                #{tag}
                <button type="button" onClick={() => setTags((cur) => cur.filter((_, idx) => idx !== i))} className="opacity-60 hover:opacity-100">✕</button>
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <input
              list="chat-tag-suggestions"
              className="h-8 w-32 rounded-lg border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={tagInput}
              placeholder={t('chat.addTag')}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) } }}
            />
            <datalist id="chat-tag-suggestions">
              {[...new Set([...TAG_SUGGESTIONS, ...threadTags])].map((s) => <option key={s} value={s} />)}
            </datalist>
            <button
              type="button"
              onClick={() => addTag(tagInput)}
              className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs text-slate-500 hover:bg-slate-50 hover:text-blue-700"
            >
              <Plus size={12} /> {t('chat.tag')}
            </button>
          </div>
          <span className="hidden text-[10px] text-slate-400 sm:inline">{t('chat.mentionHint')} {mentionables.slice(0, 3).join(' ')}</span>
          <button
            type="button"
            onClick={send}
            disabled={!body.trim()}
            className="ml-auto rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {t('chat.send')}
          </button>
        </div>
      </div>
    </div>
  )
}
