import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, Info, X } from 'lucide-react'
import { useLanguage } from '../../i18n/useLanguage.js'
import { FeedbackContext } from './feedbackContext.js'

const TOAST_STYLE = {
  success: { icon: Check, box: 'border-emerald-200 bg-emerald-50 text-emerald-800', iconCls: 'text-emerald-500' },
  error: { icon: AlertTriangle, box: 'border-rose-200 bg-rose-50 text-rose-800', iconCls: 'text-rose-500' },
  warning: { icon: AlertTriangle, box: 'border-amber-200 bg-amber-50 text-amber-800', iconCls: 'text-amber-500' },
  info: { icon: Info, box: 'border-slate-200 bg-white text-slate-700', iconCls: 'text-blue-500' },
}

/** Global toasts (bottom-right) + promise-based confirm dialog. */
export function FeedbackProvider({ children }) {
  const { t } = useLanguage()
  const [toasts, setToasts] = useState(/** @type {{ id: number, message: string, type: string }[]} */ ([]))
  const [dialog, setDialog] = useState(/** @type {null | { title?: string, message: string, confirmLabel?: string, danger?: boolean, resolve: (ok: boolean) => void }} */ (null))
  const idRef = useRef(0)

  const dismiss = useCallback((id) => setToasts((list) => list.filter((x) => x.id !== id)), [])

  const toast = useCallback((message, { type = 'success', duration = 3800 } = {}) => {
    const id = ++idRef.current
    setToasts((list) => [...list.slice(-3), { id, message, type }])
    window.setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  const confirm = useCallback((opts = {}) => new Promise((resolve) => {
    setDialog({ ...opts, resolve })
  }), [])

  const settle = useCallback((ok) => {
    setDialog((d) => { d?.resolve(ok); return null })
  }, [])

  // Escape closes the dialog as "cancel".
  useEffect(() => {
    if (!dialog) return undefined
    const onKey = (e) => { if (e.key === 'Escape') settle(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialog, settle])

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast stack */}
      {toasts.length > 0 ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[70] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4 sm:left-auto sm:right-6 sm:translate-x-0 sm:items-end">
          {toasts.map(({ id, message, type }) => {
            const cfg = TOAST_STYLE[type] ?? TOAST_STYLE.info
            const Icon = cfg.icon
            return (
              <div key={id} className={`pointer-events-auto flex w-full items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm shadow-lg animate-fade-in-up ${cfg.box}`}>
                <Icon size={16} className={`mt-0.5 shrink-0 ${cfg.iconCls}`} />
                <span className="min-w-0 flex-1 leading-snug">{message}</span>
                <button type="button" onClick={() => dismiss(id)} className="shrink-0 opacity-40 transition-opacity hover:opacity-100" aria-label={t('common.close', 'Close')}>
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Confirm dialog */}
      {dialog ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true">
          <button type="button" aria-label={t('common.cancel')} onClick={() => settle(false)} className="absolute inset-0 bg-slate-900/40" />
          <div className="dp-pop relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-900">{dialog.title ?? t('common.confirmTitle', 'Please confirm')}</h3>
            <p className="mt-1.5 text-sm text-slate-600">{dialog.message}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => settle(false)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => settle(true)}
                className={`rounded-xl px-3.5 py-2 text-sm font-semibold text-white ${dialog.danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {dialog.confirmLabel ?? t('common.confirm', 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </FeedbackContext.Provider>
  )
}
