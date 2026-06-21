import { useRef, useState } from 'react'
import { Plus, Trash2, Paperclip } from 'lucide-react'
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

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
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
 *   threadKey: string
 *   actorId?: string
 *   onChange?: () => void
 * }} props
 */
export default function InquiryChatPanel({ db, threadKey, actorId, onChange }) {
  const { t } = useLanguage()
  const taRef = useRef(/** @type {HTMLTextAreaElement | null} */ (null))
  const fileRef = useRef(/** @type {HTMLInputElement | null} */ (null))
  const [files, setFiles] = useState(/** @type {{id:string;name:string;size?:number}[]} */ ([]))
  const [body, setBody] = useState('')
  const [tags, setTags] = useState(/** @type {string[]} */ ([]))
  const [tagInput, setTagInput] = useState('')
  const [filter, setFilter] = useState(/** @type {string | null} */ (null))
  // @mention autocomplete: { start, query } describes the @token being typed.
  const [mention, setMention] = useState(/** @type {{ start: number; query: string } | null} */ (null))
  const [mentionIdx, setMentionIdx] = useState(0)

  const all = selectInquiryMessages(db, threadKey)
  const threadTags = selectInquiryThreadTags(db, threadKey)
  const messages = filter ? all.filter((m) => (m.tags ?? []).includes(filter)) : all

  const author = db.employees.find((e) => e.id === actorId) ?? db.employees.find((e) => e.canApproveQuotes) ?? db.employees[0]

  const mentionMatches = mention
    ? (db.employees ?? [])
        .filter((e) => (e.name ?? '').toLowerCase().includes(mention.query.toLowerCase()))
        .slice(0, 6)
    : []

  /** Detect an in-progress @token immediately before the caret. */
  function detectMention(value, caret) {
    const upto = value.slice(0, caret)
    const m = /(^|\s)@(\w*)$/.exec(upto)
    if (!m) return null
    return { start: caret - m[2].length - 1, query: m[2] }
  }

  function onBodyChange(e) {
    const value = e.target.value
    setBody(value)
    const ctx = detectMention(value, e.target.selectionStart ?? value.length)
    setMention(ctx)
    setMentionIdx(0)
  }

  /** Replace the active @token with the chosen teammate's first name. */
  function pickMention(emp) {
    if (!mention) return
    const handle = `@${(emp.name ?? '').split(' ')[0]} `
    const after = body.slice(mention.start + 1 + mention.query.length)
    const next = body.slice(0, mention.start) + handle + after
    setBody(next)
    setMention(null)
    const caret = mention.start + handle.length
    requestAnimationFrame(() => {
      if (taRef.current) {
        taRef.current.focus()
        taRef.current.setSelectionRange(caret, caret)
      }
    })
  }

  function addTag(value) {
    const tag = value.trim().toLowerCase().replace(/^#/, '')
    if (tag && !tags.includes(tag)) setTags((cur) => [...cur, tag])
    setTagInput('')
  }

  function onPickFiles(e) {
    const picked = Array.from(e.target.files ?? []).map((f) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: f.name,
      size: f.size,
    }))
    if (picked.length) setFiles((cur) => [...cur, ...picked])
    e.target.value = '' // allow re-selecting the same file
  }

  function send() {
    if (!body.trim() && files.length === 0) return
    appendInquiryMessage(db, {
      threadKey,
      authorId: author?.id,
      authorLabel: author?.name ?? t('chat.you'),
      body: body.trim(),
      tags,
      attachments: files,
    })
    setBody('')
    setTags([])
    setFiles([])
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
              {m.body ? <MessageBody text={m.body} /> : null}
              {(m.attachments ?? []).length > 0 ? (
                <div className="mt-1.5 space-y-1">
                  {m.attachments.map((a) => (
                    <div key={a.id} className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 text-xs ring-1 ring-slate-200">
                      <Paperclip size={11} className="shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{a.name}</span>
                      {a.size ? <span className="shrink-0 text-[10px] text-slate-400">{formatSize(a.size)}</span> : null}
                    </div>
                  ))}
                </div>
              ) : null}
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
        <div className="relative">
          <textarea
            ref={taRef}
            rows={2}
            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={body}
            placeholder={t('chat.placeholder')}
            onChange={onBodyChange}
            onKeyDown={(e) => {
              if (mention && mentionMatches.length) {
                if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx((i) => (i + 1) % mentionMatches.length); return }
                if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx((i) => (i - 1 + mentionMatches.length) % mentionMatches.length); return }
                if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(mentionMatches[mentionIdx]); return }
                if (e.key === 'Escape') { e.preventDefault(); setMention(null); return }
              }
              // Enter sends; Shift+Enter inserts a new line.
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
          />
          {/* @mention autocomplete */}
          {mention && mentionMatches.length ? (
            <div className="absolute left-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <p className="border-b border-slate-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {t('chat.mentionPick')}
              </p>
              {mentionMatches.map((emp, i) => (
                <button
                  key={emp.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); pickMention(emp) }}
                  onMouseEnter={() => setMentionIdx(i)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs ${i === mentionIdx ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                    {initials(emp.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-slate-800">{emp.name}</span>
                    {emp.role ? <span className="block truncate text-[10px] text-slate-400">{emp.role}</span> : null}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

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

        {/* Pending attachments */}
        {files.length > 0 ? (
          <div className="mt-2 space-y-1">
            {files.map((f, i) => (
              <div key={f.id} className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-xs ring-1 ring-slate-200">
                <Paperclip size={11} className="shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{f.name}</span>
                {f.size ? <span className="shrink-0 text-[10px] text-slate-400">{formatSize(f.size)}</span> : null}
                <button type="button" onClick={() => setFiles((cur) => cur.filter((_, idx) => idx !== i))} className="shrink-0 text-slate-400 hover:text-rose-600">✕</button>
              </div>
            ))}
          </div>
        ) : null}

        <input ref={fileRef} type="file" multiple className="hidden" onChange={onPickFiles} />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs text-slate-500 hover:bg-slate-50 hover:text-blue-700"
            title={t('chat.attach')}
          >
            <Paperclip size={13} /> {t('chat.attach')}
          </button>
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
          <span className="hidden text-[10px] text-slate-400 sm:inline">{t('chat.mentionHint')}</span>
          <button
            type="button"
            onClick={send}
            disabled={!body.trim() && files.length === 0}
            className="ml-auto rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {t('chat.send')}
          </button>
        </div>
      </div>
    </div>
  )
}
