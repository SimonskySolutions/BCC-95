/**
 * Export helpers used by the Reports page and any ad-hoc table export.
 * Formats supported in Release 1:
 *   - CSV (zero-dep)
 *   - XLSX (via the `xlsx` package, loaded lazily)
 *   - PDF  (via `jspdf` + `jspdf-autotable`, loaded lazily)
 *
 * Lazy-loading keeps the main bundle small and lets the UI render even if a
 * specific export dependency fails to load.
 */

/** @param {string} value */
function csvEscape(value) {
  if (value == null) return ''
  const stringValue = String(value)
  if (/[",\n;]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

/** @param {Blob} blob; @param {string} filename */
function triggerDownload(blob, filename) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * @param {{ columns: Array<{ key: string; label: string }>; rows: Array<Record<string, unknown>> }} report
 * @param {string} filename
 */
export function exportReportAsCsv(report, filename) {
  const headers = report.columns.map((c) => csvEscape(c.label)).join(',')
  const lines = report.rows
    .map((row) => report.columns.map((c) => csvEscape(row[c.key] ?? '')).join(','))
    .join('\n')
  const csv = `${headers}\n${lines}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`)
}

/**
 * @param {{ title: string; columns: Array<{ key: string; label: string }>; rows: Array<Record<string, unknown>> }} report
 * @param {string} filename
 */
export async function exportReportAsXlsx(report, filename) {
  const XLSX = await import('xlsx')
  const data = [report.columns.map((c) => c.label), ...report.rows.map((row) => report.columns.map((c) => row[c.key] ?? ''))]
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, (report.title ?? 'Report').slice(0, 28))
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  triggerDownload(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

/**
 * @param {{ title: string; columns: Array<{ key: string; label: string }>; rows: Array<Record<string, unknown>> }} report
 * @param {string} filename
 */
export async function exportReportAsPdf(report, filename) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  doc.setFontSize(14)
  doc.text(report.title ?? 'Report', 40, 40)
  autoTable(doc, {
    startY: 60,
    head: [report.columns.map((c) => c.label)],
    body: report.rows.map((row) => report.columns.map((c) => String(row[c.key] ?? ''))),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 41, 59] },
  })
  const blob = doc.output('blob')
  triggerDownload(blob, filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}

/**
 * Exports an arbitrary offer preview string as a PDF (used by OfferPreview).
 * @param {string} title
 * @param {string} text
 * @param {string} filename
 */
export async function exportTextAsPdf(title, text, filename) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  doc.setFontSize(14)
  doc.text(title, 40, 40)
  doc.setFontSize(10)
  const lines = doc.splitTextToSize(text, 520)
  doc.text(lines, 40, 70)
  const blob = doc.output('blob')
  triggerDownload(blob, filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}
