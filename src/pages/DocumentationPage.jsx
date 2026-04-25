import { useMemo } from 'react'
import DocumentationPanel from '../components/DocumentationPanel.jsx'
import { documentationLibrary, documentationStats } from '../data/dashboardData.js'
import { useLanguage } from '../i18n/useLanguage.js'

const DOC_STAT_IDS = ['totalProcessDocs', 'publishedQuarter', 'pendingReview', 'archived']

export default function DocumentationPage() {
  const { t } = useLanguage()
  const stats = useMemo(
    () =>
      documentationStats.map((s, i) => ({
        ...s,
        label: t(`doc.stat.${DOC_STAT_IDS[i]}`),
        note: t(`doc.statNote.${DOC_STAT_IDS[i]}`),
      })),
    [t],
  )

  return <DocumentationPanel stats={stats} library={documentationLibrary} />
}
