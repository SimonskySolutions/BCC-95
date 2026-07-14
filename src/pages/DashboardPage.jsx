import { useEffect, useRef, useState } from 'react'
import { GripVertical, LayoutGrid, Plus, RotateCcw, X as XIcon } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage.js'
import { useFactoryConfig } from '../config/useFactoryConfig.js'
import { useCurrentUser } from '../auth/useCurrentUser.js'
import { WIDGET_DEFS, WIDGET_MAP, DEFAULT_LAYOUT } from '../components/erp/dashboard/dashboardRegistry.js'

const KEY_PREFIX = 'bcc95:dashboard:'

function loadLayout(userId) {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + (userId ?? 'default'))
    if (raw) {
      const ids = JSON.parse(raw)
      if (Array.isArray(ids)) return ids.filter((id) => WIDGET_MAP[id])
    }
  } catch { /* ignore */ }
  return DEFAULT_LAYOUT
}

/**
 * User-customisable dashboard: a fixed brand hero plus a grid of preset widgets
 * that each user can add, remove and reorder. The layout is saved per user.
 *
 * @param {{ db: import('../data/mockDatabase.js').MockDatabase }} props
 */
export default function DashboardPage({ db, onOpenOffer, onOpenClient }) {
  const { t } = useLanguage()
  const { config, theme } = useFactoryConfig()
  const { user } = useCurrentUser()
  const userId = user?.id ?? null

  const [layout, setLayout] = useState(() => loadLayout(userId))
  const [editing, setEditing] = useState(false)
  const dragFrom = useRef(/** @type {number | null} */ (null))

  // Reload the saved layout when the acting user changes.
  useEffect(() => { setLayout(loadLayout(userId)) }, [userId])
  // Persist on every change.
  useEffect(() => {
    try { localStorage.setItem(KEY_PREFIX + (userId ?? 'default'), JSON.stringify(layout)) } catch { /* ignore */ }
  }, [layout, userId])

  const ctx = { db, onOpenOffer, onOpenClient }
  const available = WIDGET_DEFS.filter((w) => !layout.includes(w.id))
  const widgetTitle = (w) => t(w.titleKey, w.defaultTitle)

  const addWidget = (id) => setLayout((l) => (l.includes(id) ? l : [...l, id]))
  const removeWidget = (id) => setLayout((l) => l.filter((x) => x !== id))
  const move = (from, to) => setLayout((l) => {
    if (from == null || to == null || from === to) return l
    const next = [...l]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    return next
  })

  return (
    <div className="space-y-6">
      {/* Brand hero (fixed) */}
      <section className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${theme.gradientFrom} ${theme.gradientTo} p-6 text-white shadow-lg`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15),_transparent_60%)]" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60">{t('dashboard.hero.label', 'Live operations')}</p>
            <h2 className="mt-1 text-2xl font-bold">{config.companyName}</h2>
            <p className="mt-0.5 text-sm text-white/70">{t('dashboard.hero.subtitle', 'Real-time KPI overview')}</p>
          </div>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/25"
          >
            <LayoutGrid size={14} />
            {editing ? t('dash.customize.done', 'Done') : t('dash.customize.edit', 'Customize')}
          </button>
        </div>
      </section>

      {/* Edit toolbar: widgets you can add + reset */}
      {editing ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('dash.customize.addWidgets', 'Add widgets')}</p>
            <button type="button" onClick={() => setLayout(DEFAULT_LAYOUT)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              <RotateCcw size={13} /> {t('dash.customize.reset', 'Reset to default')}
            </button>
          </div>
          {available.length === 0 ? (
            <p className="text-xs text-slate-400">{t('dash.customize.allAdded', 'All widgets are on your dashboard.')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {available.map((w) => (
                <button key={w.id} type="button" onClick={() => addWidget(w.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">
                  <Plus size={13} /> {widgetTitle(w)}
                </button>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11px] text-slate-400">{t('dash.customize.hint', 'Drag widgets by the handle to reorder. Changes save automatically.')}</p>
        </section>
      ) : null}

      {/* Widget grid */}
      {layout.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
          {t('dash.customize.empty', 'Your dashboard is empty. Click Customize to add widgets.')}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {layout.map((id, index) => {
            const def = WIDGET_MAP[id]
            if (!def) return null
            const Widget = def.Component
            const spanClass = def.span === 'full' ? 'lg:col-span-2' : ''
            return (
              <div
                key={id}
                className={`${spanClass} ${editing ? 'rounded-2xl ring-2 ring-dashed ring-slate-300' : ''}`}
                draggable={editing}
                onDragStart={() => { dragFrom.current = index }}
                onDragOver={(e) => { if (editing) e.preventDefault() }}
                onDrop={(e) => { if (editing) { e.preventDefault(); move(dragFrom.current, index); dragFrom.current = null } }}
              >
                {editing ? (
                  <div className="flex items-center justify-between gap-2 rounded-t-2xl border-b border-slate-200 bg-slate-50 px-3 py-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <GripVertical size={14} className="cursor-grab text-slate-400" /> {widgetTitle(def)}
                    </span>
                    <button type="button" onClick={() => removeWidget(id)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title={t('dash.customize.remove', 'Remove')}>
                      <XIcon size={14} />
                    </button>
                  </div>
                ) : null}
                <div className={editing ? 'pointer-events-none p-2 opacity-95' : ''}>
                  <Widget {...ctx} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
