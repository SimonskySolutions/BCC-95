import { useState } from 'react'
import { Plus, X as XIcon } from 'lucide-react'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Recipient input that collects e-mails as removable chips. Type an address and
 * press Enter / comma / the + button to add it; invalid addresses are flagged
 * but still added so they can be corrected.
 *
 * @param {{
 *   value: string[]
 *   onChange: (next: string[]) => void
 *   placeholder?: string
 *   id?: string
 * }} props
 */
export default function EmailChipsInput({ value, onChange, placeholder, id }) {
  const [draft, setDraft] = useState('')

  function add(raw) {
    const parts = String(raw).split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean)
    if (!parts.length) return
    const next = [...value]
    for (const p of parts) if (!next.includes(p)) next.push(p)
    onChange(next)
    setDraft('')
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault()
      add(draft)
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
      {value.map((email) => {
        const valid = EMAIL_RE.test(email)
        return (
          <span
            key={email}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              valid
                ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200'
                : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200'
            }`}
            title={valid ? email : 'Invalid email address'}
          >
            {email}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== email))}
              className="rounded-full p-0.5 hover:bg-black/10"
              aria-label={`Remove ${email}`}
            >
              <XIcon size={11} />
            </button>
          </span>
        )
      })}
      <input
        id={id}
        type="email"
        className="min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        placeholder={value.length ? '' : placeholder}
      />
      <button
        type="button"
        onClick={() => add(draft)}
        disabled={!draft.trim()}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Add recipient"
        title="Add recipient"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
