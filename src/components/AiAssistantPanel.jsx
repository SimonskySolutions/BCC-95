import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Sparkles, Trash2, X as XIcon } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage.js'
import { useDb } from '../data/useDb.js'
import { buildErpContext } from '../services/ai/erpQueryContext.js'

const STORAGE_KEY = 'bcc95:ai-chat'

/**
 * Docked, toggleable AI assistant on the right edge of the app. Talks to the
 * local model via POST /api/ai/chat. Conversation persists in localStorage so it
 * survives navigation and reloads.
 *
 * @param {{ open: boolean; onClose: () => void }} props
 */
export default function AiAssistantPanel({ open, onClose }) {
  const { t, language } = useLanguage()
  const { db } = useDb()
  const [messages, setMessages] = useState(/** @type {{role:'user'|'assistant',content:string}[]} */ (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    } catch { /* ignore */ }
    return []
  }))
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [available, setAvailable] = useState(/** @type {boolean | null} */ (null))
  const scrollRef = useRef(/** @type {HTMLDivElement | null} */ (null))

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50))) } catch { /* ignore */ }
  }, [messages])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetch('/api/ai/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setAvailable(Boolean(d?.available)) })
      .catch(() => { if (!cancelled) setAvailable(false) })
    return () => { cancelled = true }
  }, [open])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, busy, open])

  async function send() {
    const text = draft.trim()
    if (!text || busy) return
    const next = [...messages, { role: /** @type {const} */ ('user'), content: text }]
    setMessages(next)
    setDraft('')
    setBusy(true)
    try {
      // Ground the model in real ERP data relevant to this question.
      const context = buildErpContext(db, text)
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, language, context }),
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
      const reply = res?.reply
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: reply || t('ai.chat.unavailable', 'The assistant is unavailable right now. Make sure the local model is running.') },
      ])
    } finally {
      setBusy(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* Mobile backdrop */}
      {open ? (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden" onClick={onClose} aria-hidden="true" />
      ) : null}

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[380px] max-w-[calc(100vw-1rem)] flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!open}
      >
        <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Sparkles size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-slate-900">{t('ai.chat.title', 'AI assistant')}</h3>
            <p className="truncate text-[11px] text-slate-400">
              {available === false
                ? t('ai.chat.offline', 'Model offline')
                : t('ai.chat.subtitle', 'Ask about offers, costing, CRM…')}
            </p>
          </div>
          {messages.length ? (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              title={t('ai.chat.clear', 'Clear conversation')}
            >
              <Trash2 size={15} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label={t('common.close', 'Close')}
          >
            <XIcon size={16} />
          </button>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="mt-6 text-center text-sm text-slate-400">
              <Bot size={28} className="mx-auto mb-2 text-slate-300" />
              {t('ai.chat.empty', 'Ask me anything about your offers, costing, or this ERP.')}
            </div>
          ) : null}
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {busy ? (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-400">
                {t('ai.chat.thinking', 'Thinking…')}
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-slate-100 p-3">
          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t('ai.chat.placeholder', 'Message the assistant…')}
              className="max-h-32 min-h-[2.4rem] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={send}
              disabled={busy || !draft.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t('ai.chat.send', 'Send')}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
