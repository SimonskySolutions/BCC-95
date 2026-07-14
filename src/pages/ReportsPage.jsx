import { useMemo, useState } from 'react'
import { useLanguage } from '../i18n/useLanguage.js'
import { REPORT_CATALOG, runReport } from '../services/reporting/reportService.js'
import {
  exportReportAsCsv,
  exportReportAsPdf,
  exportReportAsXlsx,
} from '../services/reporting/exportService.js'
import DatePicker from '../components/DatePicker.jsx'

/**
 * @param {{ db: import('../data/mockDatabase.js').MockDatabase }} props
 */
export default function ReportsPage({ db }) {
  const { t } = useLanguage()
  const [reportId, setReportId] = useState(/** @type {import('../services/reporting/reportService.js').ReportId} */ ('offers'))
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [productId, setProductId] = useState('')
  const [clientId, setClientId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [status, setStatus] = useState('')

  const report = useMemo(
    () =>
      runReport(db, reportId, {
        from: from || undefined,
        to: to || undefined,
        productId: productId || undefined,
        clientId: clientId || undefined,
        employeeId: employeeId || undefined,
        status: status || undefined,
      }),
    [db, reportId, from, to, productId, clientId, employeeId, status],
  )

  const filename = `${report.id}-${new Date().toISOString().slice(0, 10)}`

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <h2 className="text-sm font-semibold text-slate-900">{t('reports.filters')}</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="block text-xs font-medium text-slate-600">
            {t('reports.reportType')}
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
              value={reportId}
              onChange={(e) =>
                setReportId(/** @type {import('../services/reporting/reportService.js').ReportId} */ (e.target.value))
              }
            >
              {REPORT_CATALOG.map((r) => (
                <option key={r.id} value={r.id}>
                  {t(r.titleKey, r.id)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-600">
            {t('reports.from')}
            <DatePicker className="mt-1" value={from} onChange={(iso) => setFrom(iso)} />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            {t('reports.to')}
            <DatePicker className="mt-1" value={to} onChange={(iso) => setTo(iso)} />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            {t('reports.product')}
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">{t('common.all')}</option>
              {db.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-600">
            {t('reports.client')}
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">{t('common.all')}</option>
              {db.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-600">
            {t('reports.employee')}
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">{t('common.all')}</option>
              {db.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-600">
            {t('reports.status')}
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="draft / sent / …"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {t(`reports.${reportId}`, report.title)}
            </h2>
            <p className="text-xs text-slate-500">
              {report.rows.length} {t('reports.rows')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => exportReportAsCsv(report, filename)}
              className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              {t('export.csv')}
            </button>
            <button
              type="button"
              onClick={() => exportReportAsXlsx(report, filename)}
              className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              {t('export.xlsx')}
            </button>
            <button
              type="button"
              onClick={() => exportReportAsPdf(report, filename)}
              className="rounded-lg bg-rose-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-800"
            >
              {t('export.pdf')}
            </button>
          </div>
        </header>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
              <tr>
                {report.columns.map((c) => (
                  <th key={c.key} className="px-2 py-1.5">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  {report.columns.map((c) => (
                    <td key={c.key} className="px-2 py-1.5 text-slate-700">
                      {String(row[c.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
