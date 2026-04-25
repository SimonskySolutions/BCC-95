import { useLanguage } from '../i18n/useLanguage.js'

const statusStyles = {
  Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  Rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
}

export default function DataTable({ title, subtitle, columns, rows }) {
  const { t } = useLanguage()

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${row.sn}-${rowIndex}`} className="hover:bg-slate-50/80">
                {columns.map((column) => {
                  const cellValue = row[column.key]
                  if (column.key === 'status') {
                    const statusKey = `status.${cellValue}`
                    const label = t(statusKey, String(cellValue))
                    return (
                      <td key={column.key} className="border-b border-slate-100 px-3 py-3 text-sm">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusStyles[cellValue] ?? 'bg-slate-50 text-slate-700 ring-slate-200'}`}>
                          {label}
                        </span>
                      </td>
                    )
                  }
                  return (
                    <td key={column.key} className="border-b border-slate-100 px-3 py-3 text-sm text-slate-700">
                      {cellValue}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
