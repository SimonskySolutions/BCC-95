export default function ChartCard({ title, subtitle, children, footer }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="h-64">{children}</div>
      {footer ? <p className="mt-3 text-xs text-slate-500">{footer}</p> : null}
    </section>
  )
}
