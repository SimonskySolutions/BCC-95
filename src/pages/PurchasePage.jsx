import { useState } from 'react'
import { Banknote, Building2, FileSignature, Inbox, Scale, ShoppingCart, TriangleAlert } from 'lucide-react'
import { useDb } from '../data/useDb.js'
import { useCurrentUser } from '../auth/useCurrentUser.js'
import { useFactoryConfig } from '../config/useFactoryConfig.js'
import { useLanguage } from '../i18n/useLanguage.js'
import { groupAmount } from '../lib/money.js'
import {
  contractStatus,
  selectMonthlySpend,
  selectOpenPurchaseOrders,
  selectQuoteItems,
  selectRfqsSorted,
} from '../domains/purchase/selectors.js'
import OrdersTab from '../components/erp/purchase/OrdersTab.jsx'
import RfqTab from '../components/erp/purchase/RfqTab.jsx'
import VendorsTab from '../components/erp/purchase/VendorsTab.jsx'
import ContractsTab from '../components/erp/purchase/ContractsTab.jsx'
import CompareTab from '../components/erp/purchase/CompareTab.jsx'

/**
 * Purchasing: order lifecycle + receiving, RFQs, vendor directory with
 * history, contracts & special discounts, offer comparison.
 */
export default function PurchasePage() {
  const { db, commit } = useDb()
  const { user } = useCurrentUser()
  const { config } = useFactoryConfig()
  const { t } = useLanguage()
  const [tab, setTab] = useState('orders')
  const currency = config.currency ?? 'BGN'

  const openOrders = selectOpenPurchaseOrders(db).length
  const openRfqs = selectRfqsSorted(db).filter((r) => r.status !== 'closed').length
  const expiringContracts = (db.vendorContracts ?? []).filter((c) => contractStatus(c) === 'expiring').length
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthSpend = selectMonthlySpend(db).find((m) => m.month === thisMonth)?.spend ?? 0

  const TABS = [
    { id: 'orders', icon: ShoppingCart, key: 'purchase.tab.orders', fallback: 'Orders', count: (db.purchaseOrders ?? []).length },
    { id: 'rfq', icon: Inbox, key: 'purchase.tab.rfq', fallback: 'RFQs', count: (db.rfqRequests ?? []).length },
    { id: 'vendors', icon: Building2, key: 'purchase.tab.vendors', fallback: 'Vendors', count: (db.vendors ?? []).length },
    { id: 'contracts', icon: FileSignature, key: 'purchase.tab.contracts', fallback: 'Contracts & discounts', count: (db.vendorContracts ?? []).length + (db.vendorDiscounts ?? []).length },
    { id: 'compare', icon: Scale, key: 'purchase.tab.compare', fallback: 'Compare offers', count: selectQuoteItems(db).length },
  ]

  const KPIS = [
    { icon: ShoppingCart, label: t('purchase.kpi.openOrders', 'Open orders'), value: openOrders, accent: 'bg-blue-50 text-blue-600', goto: 'orders' },
    { icon: Banknote, label: t('purchase.kpi.monthSpend', 'Spend this month'), value: `${groupAmount(monthSpend)} ${currency}`, accent: 'bg-emerald-50 text-emerald-600', goto: 'orders' },
    { icon: Inbox, label: t('purchase.kpi.openRfqs', 'Open RFQs'), value: openRfqs, accent: 'bg-indigo-50 text-indigo-600', goto: 'rfq' },
    { icon: TriangleAlert, label: t('purchase.kpi.expiringContracts', 'Contracts expiring soon'), value: expiringContracts, accent: expiringContracts > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400', goto: 'contracts' },
  ]

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {KPIS.map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={() => setTab(k.goto)}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${k.accent}`}>
              <k.icon size={18} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-medium uppercase tracking-wide text-slate-400">{k.label}</span>
              <span className="block text-lg font-semibold leading-tight text-slate-900">{k.value}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Segmented tab bar */}
      <div className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-card">
        {TABS.map((tb) => {
          const active = tab === tb.id
          return (
            <button
              key={tb.id}
              type="button"
              onClick={() => setTab(tb.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <tb.icon size={14} />
              {t(tb.key, tb.fallback)}
              {tb.count > 0 ? (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                  active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tb.count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div key={tab} className="animate-fade-in-up">
        {tab === 'orders' ? <OrdersTab db={db} commit={commit} currency={currency} actorId={user?.id} companyName={config.companyName} /> : null}
        {tab === 'rfq' ? <RfqTab db={db} commit={commit} currency={currency} actorId={user?.id} /> : null}
        {tab === 'vendors' ? <VendorsTab db={db} commit={commit} currency={currency} /> : null}
        {tab === 'contracts' ? <ContractsTab db={db} commit={commit} /> : null}
        {tab === 'compare' ? <CompareTab db={db} commit={commit} currency={currency} actorId={user?.id} /> : null}
      </div>
    </div>
  )
}
