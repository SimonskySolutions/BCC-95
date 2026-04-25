import { selectClientProfileBundle } from '../domains/crm/selectors.js'
import { selectProductById } from '../domains/products/selectors.js'
import { selectMachineById } from '../domains/machines/selectors.js'
import { useLanguage } from '../i18n/useLanguage.js'

/**
 * @param {{
 *   db: import('../data/mockDatabase.js').MockDatabase
 *   clientId: string
 *   onBack: () => void
 * }} props
 */
export default function ClientProfilePage({ db, clientId, onBack }) {
  const { t } = useLanguage()
  const bundle = selectClientProfileBundle(db, clientId)
  if (!bundle) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{t('client.notFound')}</p>
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-blue-700 underline"
        >
          {t('client.back')}
        </button>
      </div>
    )
  }
  const { client, orders, lines, executions, machineUsages, timeLogs, issues, invoices, payments, schematics } =
    bundle

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{client.name}</h2>
          <p className="text-sm text-slate-500">
            {client.segment} · {client.region}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          {t('client.back')}
        </button>
      </div>

      {client.notes ? <p className="text-sm text-slate-600">{client.notes}</p> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('client.ordersPrices')}</h3>
        <ul className="space-y-3 text-sm">
          {orders.map((o) => {
            const prod = selectProductById(db, o.productId)
            const oLines = lines.filter((l) => l.orderId === o.id)
            return (
              <li key={o.id} className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                <p className="font-medium text-slate-900">
                  {o.id} · {prod?.name ?? o.productId}{' '}
                  <span className="text-xs font-normal text-slate-500">({o.status})</span>
                </p>
                <ul className="mt-2 space-y-1 text-slate-600">
                  {oLines.map((l) => (
                    <li key={l.id}>
                      {l.description}: {l.qty} × {l.unitPrice}
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('client.execution')}</h3>
        <ul className="list-inside list-disc text-sm text-slate-600">
          {executions.map((e) => (
            <li key={e.id}>
              {e.milestone} — {e.completedAt}
              {e.notes ? ` (${e.notes})` : ''}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('client.machinesUsed')}</h3>
          <ul className="text-sm text-slate-600">
            {machineUsages.map((u) => {
              const mach = selectMachineById(db, u.machineId)
              return (
                <li key={u.id}>
                  {mach?.name ?? u.machineId}: {u.hours}
                  {t('client.hoursOrder')} {u.orderId}
                </li>
              )
            })}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('client.timePlanned')}</h3>
          <ul className="text-sm text-slate-600">
            {timeLogs.map((timeRow) => (
              <li key={timeRow.id}>
                {timeRow.phase}: {timeRow.plannedHours}h {t('client.timePlanActual')} {timeRow.actualHours}h{' '}
                {t('client.timeActual')} {timeRow.orderId}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('client.issues')}</h3>
        <ul className="space-y-2 text-sm text-slate-600">
          {issues.map((i) => (
            <li key={i.id} className="rounded-lg border border-slate-100 px-3 py-2">
              <span className="font-medium text-slate-800">{i.severity}</span> · {i.description} (
              {i.status})
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('client.invoices')}</h3>
        <ul className="space-y-2 text-sm text-slate-600">
          {invoices.map((inv) => (
            <li key={inv.id}>
              {inv.id}: {inv.amount} · {t('client.due')} {inv.dueAt}
            </li>
          ))}
        </ul>
        <ul className="mt-3 space-y-1 text-sm text-slate-600">
          {payments.map((p) => (
            <li key={p.id}>
              {t('client.paidOn')} {p.amount} {t('client.on')} {p.paidAt} —{' '}
              {p.daysLate === 0 ? t('client.onTime') : `${p.daysLate}d ${t('client.late')}`}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('client.schematics')}</h3>
        <ul className="space-y-2 text-sm">
          {schematics.map((s) => (
            <li key={s.id}>
              <a className="font-medium text-blue-700 hover:underline" href={s.url}>
                {s.title} {t('client.rev')} {s.revision}
              </a>
              <span className="text-slate-500">
                {' '}
                · {t('client.order')} {s.orderId}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
