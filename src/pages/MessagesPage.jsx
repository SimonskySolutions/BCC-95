import { useState } from 'react'
import { Hash, MessageSquare, Plus, Trash2, Users } from 'lucide-react'
import { useDb } from '../data/useDb.js'
import { useCurrentUser } from '../auth/useCurrentUser.js'
import { useLanguage } from '../i18n/useLanguage.js'
import { selectDiscussionChannels, selectInquiryMessages } from '../domains/communications/selectors.js'
import { appendDiscussionChannel, removeDiscussionChannel } from '../domains/communications/mutations.js'
import { dmThreadKey, productSubThreadKey, productThreadKey } from '../domains/communications/threadKeys.js'
import { useConfirm, useToast } from '../components/ui/feedbackContext.js'
import InquiryChatPanel from '../components/erp/offers/InquiryChatPanel.jsx'

function initials(name = '?') {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

/**
 * Team chat: **product channels** (one per product — tag teammates, hold the
 * discussion about that product) and **direct messages**. Both reuse the
 * discussion-thread infrastructure (mentions, tags, attachments), keyed by
 * thread id.
 */
export default function MessagesPage() {
  const { db, commit } = useDb()
  const { t } = useLanguage()
  const confirmDialog = useConfirm()
  const toast = useToast()
  const { user } = useCurrentUser()
  const me = user ?? db.employees[0]
  const others = db.employees.filter((e) => e.id !== me?.id)
  const products = db.products ?? []

  const [sel, setSel] = useState(
    /** @type {{ type: 'channel' | 'dm', id: string, subId?: string | null } | null} */ (
      products[0] ? { type: 'channel', id: products[0].id, subId: null } : others[0] ? { type: 'dm', id: others[0].id } : null
    ),
  )
  // Inline "new discussion" composer: which product it is open for + the name.
  const [addingFor, setAddingFor] = useState(/** @type {string | null} */ (null))
  const [newChannelName, setNewChannelName] = useState('')

  const isChannel = sel?.type === 'channel'
  const product = isChannel ? products.find((p) => p.id === sel.id) : null
  const subChannel = isChannel && sel.subId
    ? selectDiscussionChannels(db, sel.id).find((c) => c.id === sel.subId)
    : null
  const counterpart = !isChannel && sel ? db.employees.find((e) => e.id === sel.id) : null
  const threadKey = isChannel
    ? (product ? (subChannel ? productSubThreadKey(product.id, subChannel.id) : productThreadKey(product.id)) : null)
    : (me && counterpart ? dmThreadKey(me.id, counterpart.id) : null)
  const headerName = isChannel
    ? (subChannel ? `${product?.name} · ${subChannel.name}` : product?.name)
    : counterpart?.name
  const headerSub = isChannel
    ? (subChannel ? t('chat.discussion', 'Discussion') : t('chat.productChannel'))
    : counterpart?.role

  function createDiscussion(productId) {
    const name = newChannelName.trim()
    if (!name) return
    let created = null
    commit(() => { created = appendDiscussionChannel(db, { productId, name, createdById: me?.id }) })
    setNewChannelName('')
    setAddingFor(null)
    if (created) setSel({ type: 'channel', id: productId, subId: created.id })
  }

  async function deleteDiscussion(channel) {
    const ok = await confirmDialog({
      title: t('chat.deleteDiscussion', 'Delete discussion'),
      message: t('chat.deleteDiscussion.confirm', 'Delete this discussion and its messages?'),
      confirmLabel: t('common.delete', 'Delete'),
      danger: true,
    })
    if (!ok) return
    commit(() => removeDiscussionChannel(db, channel.id))
    if (isChannel && sel?.subId === channel.id) setSel({ type: 'channel', id: channel.productId, subId: null })
    toast(t('chat.discussionDeleted', 'Discussion deleted.'), { type: 'info' })
  }

  const itemCls = (active) =>
    `flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${active ? 'bg-blue-50' : 'hover:bg-slate-50'}`

  return (
    <div className="flex h-[calc(100vh-160px)] min-h-[420px] gap-4">
      {/* Sidebar: channels + DMs */}
      <aside className="w-64 shrink-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-card">
        <header className="border-b border-slate-100 px-4 py-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><Hash size={14} /> {t('chat.channels')}</h3>
        </header>
        <ul>
          {products.map((p) => {
            const productSelected = isChannel && p.id === sel.id
            const mainActive = productSelected && !sel.subId
            const count = selectInquiryMessages(db, productThreadKey(p.id)).length
            const subs = selectDiscussionChannels(db, p.id)
            return (
              <li key={p.id}>
                <div className="group/main relative">
                  <button type="button" onClick={() => setSel({ type: 'channel', id: p.id, subId: null })} className={itemCls(mainActive)}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Hash size={14} /></span>
                    <span className={`min-w-0 flex-1 truncate text-sm font-medium ${mainActive ? 'text-blue-800' : 'text-slate-800'}`}>{p.name}</span>
                    {count > 0 ? <span className="shrink-0 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{count}</span> : null}
                  </button>
                  <button
                    type="button"
                    title={t('chat.newDiscussion', 'New discussion')}
                    onClick={() => { setAddingFor(addingFor === p.id ? null : p.id); setNewChannelName('') }}
                    className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-700 group-hover/main:block"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {subs.map((c) => {
                  const subActive = productSelected && sel.subId === c.id
                  const subCount = selectInquiryMessages(db, productSubThreadKey(p.id, c.id)).length
                  return (
                    <div key={c.id} className="group/sub relative">
                      <button
                        type="button"
                        onClick={() => setSel({ type: 'channel', id: p.id, subId: c.id })}
                        className={`${itemCls(subActive)} py-2 pl-10`}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400"><MessageSquare size={11} /></span>
                        <span className={`min-w-0 flex-1 truncate text-[13px] ${subActive ? 'font-medium text-blue-800' : 'text-slate-600'}`}>{c.name}</span>
                        {subCount > 0 ? <span className="shrink-0 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{subCount}</span> : null}
                      </button>
                      <button
                        type="button"
                        title={t('chat.deleteDiscussion', 'Delete discussion')}
                        onClick={() => deleteDiscussion(c)}
                        className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-md p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600 group-hover/sub:block"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )
                })}
                {addingFor === p.id ? (
                  <div className="flex items-center gap-1.5 py-1.5 pl-10 pr-3">
                    <input
                      autoFocus
                      className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                      placeholder={t('chat.discussionName.ph', 'Discussion name…')}
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); createDiscussion(p.id) }
                        if (e.key === 'Escape') { setAddingFor(null); setNewChannelName('') }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => createDiscussion(p.id)}
                      disabled={!newChannelName.trim()}
                      className="shrink-0 rounded-lg bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {t('common.add', 'Add')}
                    </button>
                  </div>
                ) : null}
              </li>
            )
          })}
          {products.length === 0 ? <li className="px-4 py-2 text-xs text-slate-400">{t('chat.noChannels')}</li> : null}
        </ul>

        <header className="border-y border-slate-100 px-4 py-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><Users size={14} /> {t('dm.contacts')}</h3>
          <p className="text-[11px] text-slate-400">{t('dm.youAre')} {me?.name}</p>
        </header>
        <ul>
          {others.map((emp) => {
            const active = !isChannel && emp.id === sel?.id
            const count = me ? selectInquiryMessages(db, dmThreadKey(me.id, emp.id)).length : 0
            return (
              <li key={emp.id}>
                <button type="button" onClick={() => setSel({ type: 'dm', id: emp.id })} className={itemCls(active)}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{initials(emp.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-medium ${active ? 'text-blue-800' : 'text-slate-800'}`}>{emp.name}</span>
                    {emp.role ? <span className="block truncate text-[11px] text-slate-400">{emp.role}</span> : null}
                  </span>
                  {count > 0 ? <span className="shrink-0 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{count}</span> : null}
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      {/* Conversation */}
      <section className="flex min-w-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white shadow-card">
        {threadKey ? (
          <>
            <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                {isChannel ? <Hash size={16} /> : <span className="text-xs font-semibold text-slate-600">{initials(headerName)}</span>}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{headerName}</h3>
                {headerSub ? <p className="text-[11px] text-slate-400">{headerSub}</p> : null}
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <InquiryChatPanel db={db} threadKey={threadKey} actorId={me?.id} onChange={() => commit()} />
            </div>
          </>
        ) : (
          <p className="m-auto text-sm text-slate-400">{t('dm.pick')}</p>
        )}
      </section>
    </div>
  )
}
