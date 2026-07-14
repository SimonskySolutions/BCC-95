import { useState } from 'react'
import { ArrowLeft, ArrowDownRight, ArrowUpRight, Minus, Plus, Tags, Trash2, X } from 'lucide-react'
import { useLanguage } from '../../../i18n/useLanguage.js'
import { groupAmount } from '../../../lib/money.js'
import { PoStatusBadge, ContractStatusBadge, SortTh, inputCls, labelCls } from './shared.jsx'
import { sortRows, toggleSort } from './tableSort.js'
import {
  appendVendorCategory,
  appendVendorContact,
  removeVendorCategory,
  removeVendorContact,
  setVendorCategory,
} from '../../../domains/purchase/mutations.js'
import {
  contractStatus,
  discountIsActive,
  selectPurchaseOrderTotal,
  selectVendorCategories,
  selectVendorContracts,
  selectVendorDiscounts,
  selectVendorOrders,
  selectVendorPriceHistory,
  selectVendorStats,
  vendorCategoryName,
} from '../../../domains/purchase/selectors.js'

function Trend({ trend }) {
  if (trend === 'up') return <ArrowUpRight size={13} className="text-rose-500" />
  if (trend === 'down') return <ArrowDownRight size={13} className="text-emerald-600" />
  if (trend === 'same') return <Minus size={13} className="text-slate-400" />
  return null
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-card">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  )
}

const CONTACT_INIT = { name: '', position: 'N/A', positionOther: '', phone: '', email: '' }
const POSITION_OPTIONS = ['N/A', 'sales', 'purchasing', 'management', 'accounting', 'logistics', 'technical', 'other']

/** Vendor directory + per-vendor history: contacts, spend, orders, contracts, discounts, prices. */
export default function VendorsTab({ db, commit, currency }) {
  const { t } = useLanguage()
  const [selId, setSelId] = useState(/** @type {string | null} */ (null))
  const [query, setQuery] = useState('')
  const [contactForm, setContactForm] = useState(CONTACT_INIT)
  const [catFilter, setCatFilter] = useState('') // '' all · '__none' uncategorized · category id
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' })
  const [managingCats, setManagingCats] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  const categories = selectVendorCategories(db)

  function addCategory() {
    if (!newCatName.trim()) return
    commit(() => appendVendorCategory(db, newCatName))
    setNewCatName('')
  }

  function addContact(vendorId) {
    if (!contactForm.name.trim()) return
    const position = contactForm.position === 'other'
      ? (contactForm.positionOther.trim() || 'N/A')
      : contactForm.position === 'N/A' ? 'N/A' : t(`purchase.pos.${contactForm.position}`, contactForm.position)
    commit(() => appendVendorContact(db, vendorId, {
      name: contactForm.name,
      position,
      phone: contactForm.phone,
      email: contactForm.email,
    }))
    setContactForm(CONTACT_INIT)
  }

  const vendors = [...(db.vendors ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  const vendor = selId ? vendors.find((v) => v.id === selId) : null

  if (vendor) {
    const stats = selectVendorStats(db, vendor.id)
    const orders = selectVendorOrders(db, vendor.id)
    const contracts = selectVendorContracts(db, vendor.id)
    const discounts = selectVendorDiscounts(db, vendor.id)
    const prices = selectVendorPriceHistory(db, vendor.id)
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setSelId(null)} className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900">
          <ArrowLeft size={13} /> {t('purchase.backToVendors', 'All vendors')}
        </button>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{vendor.name}</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {[vendor.category, [vendor.address, vendor.city, vendor.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{[vendor.vat, vendor.phone, vendor.email].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                <Tags size={13} />
                <select
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                  value={vendor.categoryId ?? ''}
                  onChange={(e) => commit(() => setVendorCategory(db, vendor.id, e.target.value))}
                >
                  <option value="">{t('purchase.uncategorized', 'Uncategorized')}{!vendor.categoryId && vendorCategoryName(db, vendor) ? ` (${vendorCategoryName(db, vendor)})` : ''}</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-600">{vendor.status}</span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label={t('purchase.stat.spend', 'Total spend')} value={`${groupAmount(stats.spend)} ${currency}`} />
          <Stat label={t('purchase.stat.orders', 'Orders')} value={stats.orderCount} />
          <Stat label={t('purchase.stat.onTime', 'On-time delivery')} value={stats.onTimePercent === null ? '—' : `${stats.onTimePercent}%`} />
          <Stat label={t('purchase.stat.lastOrder', 'Last order')} value={stats.lastOrderAt ?? '—'} />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <h4 className="mb-2 text-sm font-semibold text-slate-900">{t('purchase.vendorContacts', 'Contact persons')}</h4>
          <ul className="space-y-1.5">
            {(vendor.contacts ?? []).map((c) => (
              <li key={c.id} className="group flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-slate-800">{c.name}</span>
                  <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${c.position === 'N/A' ? 'bg-slate-200 text-slate-500' : 'bg-blue-50 text-blue-700'}`}>{c.position}</span>
                  <span className="ml-2 text-slate-500">{[c.phone, c.email].filter(Boolean).join(' · ')}</span>
                </span>
                <button type="button" onClick={() => commit(() => removeVendorContact(db, vendor.id, c.id))} className="text-slate-300 opacity-0 transition-opacity hover:text-rose-600 group-hover:opacity-100" title={t('common.remove')}>
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
            {(vendor.contacts ?? []).length === 0 ? <li className="text-xs text-slate-400">{t('purchase.noContacts.person', 'No contact persons yet.')}</li> : null}
          </ul>
          <div className="mt-3 grid grid-cols-2 items-end gap-2 border-t border-slate-100 pt-3 md:grid-cols-[1.4fr_1fr_1fr_1.2fr_auto]">
            <label className={labelCls}>
              {t('purchase.contactName', 'Name')} *
              <input className={inputCls} value={contactForm.name} onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))} />
            </label>
            <label className={labelCls}>
              {t('purchase.position', 'Position')}
              <select className={inputCls} value={contactForm.position} onChange={(e) => setContactForm((f) => ({ ...f, position: e.target.value }))}>
                {POSITION_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p === 'N/A' ? t('purchase.pos.na', 'N/A — unknown') : t(`purchase.pos.${p}`, p)}</option>
                ))}
              </select>
              {contactForm.position === 'other' ? (
                <input className={inputCls} placeholder={t('purchase.pos.other.ph', 'Position…')} value={contactForm.positionOther} onChange={(e) => setContactForm((f) => ({ ...f, positionOther: e.target.value }))} />
              ) : null}
            </label>
            <label className={labelCls}>
              {t('purchase.contactPhone', 'Phone')}
              <input className={inputCls} value={contactForm.phone} onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))} />
            </label>
            <label className={labelCls}>
              {t('client.field.email', 'Email')}
              <input type="email" className={inputCls} value={contactForm.email} onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))} />
            </label>
            <button type="button" onClick={() => addContact(vendor.id)} disabled={!contactForm.name.trim()} className="mb-0.5 inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              <Plus size={12} /> {t('common.add', 'Add')}
            </button>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <h4 className="mb-2 text-sm font-semibold text-slate-900">{t('purchase.contracts', 'Contracts')}</h4>
            <ul className="space-y-1.5">
              {contracts.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-slate-800">{c.title}</span>
                    {c.refNo ? <span className="ml-1 text-slate-400">({c.refNo})</span> : null}
                    <span className="ml-2 text-slate-500">{[c.validFrom, c.validTo].filter(Boolean).join(' → ')}</span>
                    {c.discountPercent ? <span className="ml-2 font-medium text-emerald-700">−{c.discountPercent}%</span> : null}
                  </span>
                  <ContractStatusBadge status={contractStatus(c)} />
                </li>
              ))}
              {contracts.length === 0 ? <li className="text-xs text-slate-400">{t('purchase.noContracts', 'No contracts recorded.')}</li> : null}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <h4 className="mb-2 text-sm font-semibold text-slate-900">{t('purchase.discounts', 'Special discounts')}</h4>
            <ul className="space-y-1.5">
              {discounts.map((d) => {
                const mat = d.materialId ? (db.materials ?? []).find((m) => m.id === d.materialId) : null
                return (
                  <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold text-emerald-700">−{d.percent}%</span>
                      <span className="ml-2 text-slate-700">{mat ? mat.name : (d.scope || t('purchase.allItems', 'all items'))}</span>
                      {d.minQty ? <span className="ml-2 text-slate-400">≥ {groupAmount(d.minQty)}</span> : null}
                      {d.validTo ? <span className="ml-2 text-slate-400">{t('purchase.until', 'until')} {d.validTo}</span> : null}
                    </span>
                    {!discountIsActive(d) ? <ContractStatusBadge status="expired" /> : null}
                  </li>
                )
              })}
              {discounts.length === 0 ? <li className="text-xs text-slate-400">{t('purchase.noDiscounts', 'No special discounts.')}</li> : null}
            </ul>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <h4 className="mb-2 text-sm font-semibold text-slate-900">{t('purchase.orderHistory', 'Order history')}</h4>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-3">{t('purchase.colPO')}</th>
                <th className="py-2 pr-3">{t('purchase.colOrdered')}</th>
                <th className="py-2 pr-3">{t('common.status')}</th>
                <th className="py-2 text-right">{t('purchase.total', 'Total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((po) => (
                <tr key={po.id}>
                  <td className="py-2 pr-3 font-medium text-slate-800">{po.no ?? po.id}</td>
                  <td className="py-2 pr-3 text-slate-600">{po.orderedAt}</td>
                  <td className="py-2 pr-3"><PoStatusBadge status={po.status} /></td>
                  <td className="py-2 text-right font-medium text-slate-800">{groupAmount(selectPurchaseOrderTotal(db, po.id))} {po.currency ?? currency}</td>
                </tr>
              ))}
              {orders.length === 0 ? <tr><td colSpan={4} className="py-4 text-center text-xs text-slate-400">{t('purchase.noOrders', 'No purchase orders yet.')}</td></tr> : null}
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <h4 className="mb-2 text-sm font-semibold text-slate-900">{t('purchase.priceHistory', 'Purchase price history')}</h4>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-3">{t('purchase.colDate', 'Date')}</th>
                <th className="py-2 pr-3">{t('purchase.colItem', 'Item')}</th>
                <th className="py-2 pr-3">{t('purchase.colQty', 'Qty')}</th>
                <th className="py-2 pr-3">{t('purchase.colNetUnit', 'Net unit price')}</th>
                <th className="py-2">{t('purchase.colTrend', 'Trend')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prices.map((r) => (
                <tr key={r.lineId}>
                  <td className="py-2 pr-3 text-slate-600">{r.date}</td>
                  <td className="py-2 pr-3 font-medium text-slate-800">{r.itemLabel}</td>
                  <td className="py-2 pr-3 text-slate-600">{groupAmount(r.qty)} {r.uom ?? ''}</td>
                  <td className="py-2 pr-3 text-slate-800">
                    {groupAmount(r.netUnitCost)} {r.currency ?? currency}
                    {r.discountPercent ? <span className="ml-1 text-[11px] text-emerald-700">(−{r.discountPercent}%)</span> : null}
                  </td>
                  <td className="py-2"><Trend trend={r.trend} /></td>
                </tr>
              ))}
              {prices.length === 0 ? <tr><td colSpan={5} className="py-4 text-center text-xs text-slate-400">{t('purchase.noPrices', 'No purchases recorded yet.')}</td></tr> : null}
            </tbody>
          </table>
        </section>
      </div>
    )
  }

  const q = query.trim().toLowerCase()
  const filtered = vendors.filter((v) => {
    if (q && ![v.name, v.city, v.country, vendorCategoryName(db, v)].filter(Boolean).join(' ').toLowerCase().includes(q)) return false
    if (catFilter === '__none') return !v.categoryId
    if (catFilter) return v.categoryId === catFilter
    return true
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="w-full max-w-sm rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
          placeholder={t('purchase.searchVendors', 'Search vendors…')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="">{t('purchase.allCategories', 'All categories')}</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value="__none">{t('purchase.uncategorized', 'Uncategorized')}</option>
        </select>
        <button
          type="button"
          onClick={() => setManagingCats((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${managingCats ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          <Tags size={13} /> {t('purchase.manageCategories', 'Categories')}
        </button>
      </div>

      {managingCats ? (
        <div className="space-y-2 rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((c) => {
              const count = vendors.filter((v) => v.categoryId === c.id).length
              return (
                <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                  {c.name}
                  <span className="text-[10px] text-slate-400">{count}</span>
                  <button type="button" onClick={() => commit(() => removeVendorCategory(db, c.id))} className="text-slate-300 hover:text-rose-600" title={t('common.remove')}><X size={11} /></button>
                </span>
              )
            })}
            {categories.length === 0 ? <span className="text-xs text-slate-400">{t('purchase.noCategories', 'No categories yet — add material types like "Metals", "Packaging", "Fasteners".')}</span> : null}
          </div>
          <div className="flex items-center gap-2">
            <input
              className="w-56 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
              placeholder={t('purchase.newCategory.ph', 'New category…')}
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }}
            />
            <button type="button" onClick={addCategory} disabled={!newCatName.trim()} className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{t('common.add', 'Add')}</button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <SortTh label={t('purchase.colVendor')} k="name" sort={sort} onSort={(k) => setSort((s0) => toggleSort(s0, k))} />
              <SortTh label={t('purchase.category', 'Category')} k="category" sort={sort} onSort={(k) => setSort((s0) => toggleSort(s0, k))} />
              <SortTh label={t('purchase.colLocation', 'Location')} k="location" sort={sort} onSort={(k) => setSort((s0) => toggleSort(s0, k))} />
              <SortTh label={t('purchase.stat.orders', 'Orders')} k="orders" sort={sort} onSort={(k) => setSort((s0) => toggleSort(s0, k))} />
              <SortTh label={t('purchase.stat.spend', 'Total spend')} k="spend" sort={sort} onSort={(k) => setSort((s0) => toggleSort(s0, k))} align="right" />
              <SortTh label={t('common.status')} k="status" sort={sort} onSort={(k) => setSort((s0) => toggleSort(s0, k))} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortRows(
              filtered.map((v) => ({ v, stats: selectVendorStats(db, v.id), catName: vendorCategoryName(db, v) })),
              sort,
              {
                name: (r) => r.v.name,
                category: (r) => r.catName,
                location: (r) => [r.v.city, r.v.country].filter(Boolean).join(', '),
                orders: (r) => r.stats.orderCount,
                spend: (r) => r.stats.spend,
                status: (r) => r.v.status,
              },
            ).map(({ v, stats, catName }) => {
              return (
                <tr key={v.id} className="cursor-pointer hover:bg-slate-50/80" onClick={() => setSelId(v.id)}>
                  <td className="px-4 py-3 font-medium text-slate-900">{v.name}</td>
                  <td className="px-4 py-3">
                    {catName
                      ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${v.categoryId ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' : 'bg-slate-100 text-slate-500'}`}>{catName}</span>
                      : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{[v.city, v.country].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{stats.orderCount}</td>
                  <td className="px-4 py-3 text-right text-slate-800">{stats.spend ? `${groupAmount(stats.spend)} ${currency}` : '—'}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-600">{v.status}</span></td>
                </tr>
              )
            })}
            {filtered.length === 0 ? <tr><td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-400">{t('purchase.noVendorsMatch', 'No vendors match the current filter.')}</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
