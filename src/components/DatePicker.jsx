import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Circle } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage.js'

const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** Material-style ripple from the click point — the "wave" on a day. */
function ripple(e) {
  const btn = e.currentTarget
  const rect = btn.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const span = document.createElement('span')
  span.className = 'dp-ripple'
  span.style.width = span.style.height = `${size}px`
  span.style.left = `${e.clientX - rect.left - size / 2}px`
  span.style.top = `${e.clientY - rect.top - size / 2}px`
  btn.appendChild(span)
  setTimeout(() => span.remove(), 500)
}

/**
 * Custom date picker — a calendar the full width of the field, styled to match
 * the app (and dark mode), with a wave entrance and a ripple on selection.
 *
 * @param {{
 *   value?: string                    // ISO yyyy-mm-dd
 *   onChange: (iso: string) => void
 *   min?: string
 *   placeholder?: string
 *   id?: string
 *   disabled?: boolean
 *   className?: string
 * }} props
 */
export default function DatePicker({ value, onChange, min, placeholder, id, disabled, className = '' }) {
  const { language } = useLanguage()
  const locale = language === 'bg' ? 'bg-BG' : 'en-GB'
  const [open, setOpen] = useState(false)
  const ref = useRef(/** @type {HTMLDivElement | null} */ (null))

  const selected = value ? new Date(`${value}T00:00:00`) : null
  const [view, setView] = useState(() => selected ?? new Date())

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
    // 2024-01-01 was a Monday → build a Monday-first header.
    return [...Array(7)].map((_, i) => fmt.format(new Date(2024, 0, 1 + i)))
  }, [locale])

  const y = view.getFullYear()
  const m = view.getMonth()
  const monthLabel = new Date(y, m, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const cells = useMemo(() => {
    const first = new Date(y, m, 1)
    const offset = (first.getDay() + 6) % 7 // Monday-first
    const start = new Date(y, m, 1 - offset)
    return [...Array(42)].map((_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
  }, [y, m])

  const today = new Date()
  const minD = min ? new Date(`${min}T00:00:00`) : null
  const isDisabled = (d) => minD && d < minD

  const pick = (d, e) => { ripple(e); onChange(toISO(d)); setOpen(false) }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm transition
          ${open ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'}
          disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className={value ? 'text-slate-800' : 'text-slate-400'}>
          {value ? selected.toLocaleDateString(locale) : (placeholder ?? '—')}
        </span>
        <CalIcon size={15} className="shrink-0 text-slate-400" />
      </button>

      {open ? (
        <div className="dp-pop absolute left-0 z-30 mt-1 w-full min-w-[16.5rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          {/* Header */}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold capitalize text-slate-900">{monthLabel}</span>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={() => setView(new Date(y, m - 1, 1))}
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" aria-label="Previous month">
                <ChevronLeft size={15} />
              </button>
              <button type="button" onClick={() => setView(new Date())}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600" title="Today">
                <Circle size={9} className="fill-current" />
              </button>
              <button type="button" onClick={() => setView(new Date(y, m + 1, 1))}
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" aria-label="Next month">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Weekday header */}
          <div className="mb-1 grid grid-cols-7 gap-1">
            {weekdays.map((w, i) => (
              <span key={i} className="text-center text-[11px] font-medium uppercase text-slate-400">{w}</span>
            ))}
          </div>

          {/* Days — remount per month so the wave replays */}
          <div key={`${y}-${m}`} className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              const inMonth = d.getMonth() === m
              const sel = sameDay(d, selected)
              const isToday = sameDay(d, today)
              const off = isDisabled(d)
              return (
                <button
                  key={i}
                  type="button"
                  disabled={off}
                  onClick={(e) => pick(d, e)}
                  style={{ animationDelay: `${(Math.floor(i / 7) + (i % 7)) * 16}ms` }}
                  className={`dp-day-in relative flex h-9 items-center justify-center overflow-hidden rounded-lg text-sm transition-colors
                    ${off ? 'cursor-not-allowed text-slate-200'
                      : sel ? 'bg-blue-600 font-semibold text-white shadow-sm'
                        : isToday ? 'font-semibold text-blue-700 ring-1 ring-blue-300 hover:bg-blue-50'
                          : inMonth ? 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                            : 'text-slate-300 hover:bg-slate-50'}`}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
