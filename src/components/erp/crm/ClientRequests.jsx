import { useLanguage } from '../../../i18n/useLanguage.js'

/**
 * "Who asked for what" — the customer's request history, built from inquiries.
 * Each row shows the requesting contact, the products + quantities requested,
 * when, the channel it came in through, and the current status.
 *
 * @param {{ db: any, clientId: string, onOpenProduct?: (id: string) => void }} props
 */
export default function ClientRequests({ db, clientId, onOpenProduct }) {
  const { t } = useLanguage()
  const productName = (id) => (db.products ?? []).find((p) => p.id === id)?.name ?? id ?? '—'

  const requests = (db.inquiries ?? [])
    .filter((i) => i.customerId === clientId)
    .sort((a, b) => String(b.receivedAt ?? '').localeCompare(String(a.receivedAt ?? '')))
    .map((i) => {
      const items = [
        { id: i.productId, name: productName(i.productId), qty: i.requestedQuantities ?? (i.requestedQuantity ? [i.requestedQuantity] : []) },
        ...(i.extraProducts ?? []).map((e) => ({ id: e.productId, name: e.name, qty: e.quantities ?? [] })),
      ]
      return {
        id: i.id,
        who: i.customerContactName || i.customerContactEmail || '—',
        items,
        when: (i.receivedAt ?? '').slice(0, 10),
        channel: i.channel,
        status: i.status,
      }
    })

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{t('client.requests')}</h3>
      {requests.length === 0 ? (
        <p className="text-xs text-slate-400">{t('client.requests.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-1 pr-3 font-medium">{t('client.requests.who')}</th>
                <th className="py-1 pr-3 font-medium">{t('client.requests.what')}</th>
                <th className="py-1 pr-3 font-medium">{t('client.requests.when')}</th>
                <th className="py-1 pr-3 font-medium">{t('client.requests.channel')}</th>
                <th className="py-1 pr-3 font-medium">{t('client.requests.status')}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 align-top">
                  <td className="py-1.5 pr-3 font-medium text-slate-800">{r.who}</td>
                  <td className="py-1.5 pr-3 text-slate-600">
                    {r.items.map((it, idx) => (
                      <div key={idx}>
                        <button type="button" onClick={() => it.id && onOpenProduct?.(it.id)}
                          className={it.id ? 'text-blue-700 hover:underline' : ''}>{it.name}</button>
                        {it.qty?.length ? <span className="text-slate-400"> · {it.qty.join(' / ')} {t('client.requests.pcs')}</span> : null}
                      </div>
                    ))}
                  </td>
                  <td className="py-1.5 pr-3 text-slate-500">{r.when || '—'}</td>
                  <td className="py-1.5 pr-3 text-slate-500">{t(`inquiry.channel.${r.channel}`, r.channel ?? '—')}</td>
                  <td className="py-1.5 pr-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {t(`inquiry.status.${r.status}`, r.status ?? '—')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
