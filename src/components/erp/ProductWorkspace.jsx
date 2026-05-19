import { useMemo, useReducer, useState } from 'react'
import PhaseStepper from './PhaseStepper.jsx'
import TaskTable from './TaskTable.jsx'
import OperationList from './OperationList.jsx'
import BomEditor from './BomEditor.jsx'
import InquiryIntakeForm from './offers/InquiryIntakeForm.jsx'
import OfferWizard from './offers/OfferWizard.jsx'
import AuditTimeline from './AuditTimeline.jsx'
import { useLanguage } from '../../i18n/useLanguage.js'
import { selectInquiriesByProduct } from '../../domains/inquiries/selectors.js'
import { selectAuditByProduct } from '../../domains/audit/selectors.js'

const TAB_IDS = /** @type {const} */ (['overview', 'bom', 'inquiry', 'offer', 'operations', 'tasks', 'timeline'])

/**
 * @param {{
 *   db: import('../../data/mockDatabase.js').MockDatabase
 *   bundle: object | null
 *   onOpenReports?: () => void
 * }} props
 */
export default function ProductWorkspace({ db, bundle, onOpenReports }) {
  const { t } = useLanguage()
  const [tab, setTab] = useState(/** @type {typeof TAB_IDS[number]} */ ('overview'))
  const [, forceRefresh] = useReducer((x) => x + 1, 0)

  const productId = bundle?.product?.id ?? null
  const inquiries = useMemo(
    () => (productId ? selectInquiriesByProduct(db, productId) : []),
    [db, productId],
  )
  const auditEntries = useMemo(
    () => (productId ? selectAuditByProduct(db, productId) : []),
    [db, productId],
  )
  const employeeLookup = useMemo(
    () => Object.fromEntries(db.employees.map((e) => [e.id, e.name])),
    [db],
  )

  const openTaskCount = bundle?.tasks?.filter((x) => x.status !== 'resolved').length ?? 0
  const pendingInquiryCount = inquiries.filter((i) => i.status === 'received' || i.status === 'intake_pending').length

  if (!bundle) {
    return <p className="text-sm text-slate-500">{t('pws.notFound')}</p>
  }
  const { product, lifecycle, tasks, operations, pathTemplate } = bundle
  const latestInquiry = inquiries[inquiries.length - 1]

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{product.sku}</p>
          {product.type ? (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              product.type === 'raw_material'
                ? 'bg-amber-100 text-amber-800'
                : product.type === 'semi_finished'
                  ? 'bg-violet-100 text-violet-800'
                  : product.type === 'finished_good'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600'
            }`}>
              {t(`product.type.${product.type}`)}
            </span>
          ) : null}
        </div>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">{product.name}</h2>
        <p className="mt-2 text-sm text-slate-600">{product.description ?? t('pws.noDescription')}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
          {product.uom ? (
            <span>{t('pws.uom')} <span className="font-medium text-slate-700">{product.uom}</span></span>
          ) : null}
          {product.uom2 ? (
            <span>{t('pws.uom2')} <span className="font-medium text-slate-700">{product.uom2}</span></span>
          ) : null}
          {product.uomCoef != null ? (
            <span>{t('pws.uomCoef')} <span className="font-medium text-slate-700">{product.uomCoef}</span></span>
          ) : null}
          {product.priceAverage != null ? (
            <span>{t('pws.priceAverage')} <span className="font-medium text-slate-700">{product.priceAverage.toFixed(2)}</span></span>
          ) : null}
          {pathTemplate ? (
            <span>{t('pws.pathTemplate')} <span className="font-medium text-slate-700">{pathTemplate.name}</span></span>
          ) : null}
        </div>
      </div>
      <PhaseStepper currentPhaseId={lifecycle?.phaseId} blocked={lifecycle?.blocked} />

      <div className="sticky top-0 z-10 -mx-4 bg-slate-100/95 px-4 pb-1 pt-2 backdrop-blur md:-mx-0 md:px-0">
        <nav className="flex flex-wrap gap-2" role="tablist">
          {TAB_IDS.map((id) => {
            const badge = id === 'tasks' && openTaskCount > 0
              ? openTaskCount
              : id === 'inquiry' && pendingInquiryCount > 0
                ? pendingInquiryCount
                : null
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`relative rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  tab === id
                    ? 'bg-slate-900 text-white shadow'
                    : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {t(`pws.tab.${id}`)}
                {badge ? (
                  <span className={`ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                    tab === id ? 'bg-white/20 text-white' : 'bg-rose-500 text-white'
                  }`}>
                    {badge}
                  </span>
                ) : null}
              </button>
            )
          })}
        </nav>
      </div>

      {tab === 'overview' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <h3 className="text-sm font-semibold text-slate-900">{t('pws.quickStats')}</h3>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setTab('tasks')}
                className="rounded-xl border border-slate-100 p-2 text-left hover:border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <dt className="text-slate-500">{t('pws.openTasks')}</dt>
                <dd className={`text-lg font-semibold ${openTaskCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {openTaskCount}
                </dd>
              </button>
              <button
                type="button"
                onClick={() => setTab('inquiry')}
                className="rounded-xl border border-slate-100 p-2 text-left hover:border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <dt className="text-slate-500">{t('pws.inquiries')}</dt>
                <dd className="text-lg font-semibold text-slate-800">{inquiries.length}</dd>
              </button>
              <div className="rounded-xl border border-slate-100 p-2">
                <dt className="text-slate-500">{t('pws.phase')}</dt>
                <dd className="text-sm font-semibold text-slate-800">
                  {t(`lifecycle.phase.${lifecycle?.phaseId}`, lifecycle?.phaseId ?? '—')}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-100 p-2">
                <dt className="text-slate-500">{t('pws.completion')}</dt>
                <dd className="text-sm font-semibold text-slate-800">
                  {lifecycle?.completionPercent ?? 0}%
                </dd>
              </div>
            </dl>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <h3 className="text-sm font-semibold text-slate-900">{t('pws.recentActivity')}</h3>
            <div className="mt-2">
              <AuditTimeline
                entries={auditEntries.slice(-6)}
                employeeLookup={employeeLookup}
              />
            </div>
          </section>
        </div>
      ) : null}

      {tab === 'bom' ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">{t('pws.tab.bom')}</h3>
          <BomEditor db={db} productId={product.id} />
        </section>
      ) : null}

      {tab === 'inquiry' ? (
        <div className="space-y-4">
          <InquiryIntakeForm
            db={db}
            productId={product.id}
            defaultClientId={latestInquiry?.customerId}
            inquiry={latestInquiry}
            onChange={forceRefresh}
          />
          {inquiries.length > 1 ? (
            <details className="rounded-2xl border border-slate-200 bg-white p-3">
              <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                {t('inquiry.previous')}
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {inquiries.slice(0, -1).map((i) => (
                  <li key={i.id}>
                    #{i.id} — {i.receivedAt.slice(0, 10)} — {i.status}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      {tab === 'offer' ? (
        <OfferWizard
          db={db}
          productId={product.id}
          actorId={db.employees[0]?.id}
          onOpenReports={onOpenReports}
        />
      ) : null}

      {tab === 'operations' ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">{t('pws.operations')}</h3>
          <OperationList db={db} operations={operations} />
        </section>
      ) : null}

      {tab === 'tasks' ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">{t('pws.tasks')}</h3>
          <TaskTable db={db} tasks={tasks} />
        </section>
      ) : null}

      {tab === 'timeline' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <h3 className="text-sm font-semibold text-slate-900">{t('pws.timeline')}</h3>
          <div className="mt-3">
            <AuditTimeline entries={auditEntries} employeeLookup={employeeLookup} />
          </div>
        </section>
      ) : null}
    </div>
  )
}
