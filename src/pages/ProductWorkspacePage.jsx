import { ArrowLeft } from 'lucide-react'
import ProductWorkspace from '../components/erp/ProductWorkspace.jsx'
import { selectProductWorkspaceBundle } from '../data/relations.js'
import { useLanguage } from '../i18n/useLanguage.js'

/**
 * @param {{
 *   db: import('../data/mockDatabase.js').MockDatabase
 *   productId: string
 *   onBack: () => void
 *   onOpenReports?: () => void
 *   onOpenOffer?: (quoteId: string) => void
 * }} props
 */
export default function ProductWorkspacePage({ db, productId, onBack, onOpenReports, onOpenOffer }) {
  const { t } = useLanguage()
  const bundle = selectProductWorkspaceBundle(db, productId)

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition"
      >
        <ArrowLeft size={14} />
        {t('pw.back')}
      </button>
      <ProductWorkspace db={db} bundle={bundle} onOpenReports={onOpenReports} onOpenOffer={onOpenOffer} />
    </div>
  )
}
