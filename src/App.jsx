import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import Sidebar from './components/Sidebar.jsx'
import Header from './components/Header.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import ChatLauncher from './components/ChatLauncher.jsx'
import AiAssistantPanel from './components/AiAssistantPanel.jsx'
import { useLanguage } from './i18n/useLanguage.js'
import { useFactoryConfig } from './config/useFactoryConfig.js'
import { useCurrentUser } from './auth/useCurrentUser.js'
import { useDb } from './data/useDb.js'
import NewInquiryForm from './components/erp/offers/NewInquiryForm.jsx'
// Route pages are lazy-loaded so the initial bundle stays small — each page
// (and its heavy deps like charts/flow) loads only when first navigated to.
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'))
const ProductsPage = lazy(() => import('./pages/ProductsPage.jsx'))
const ProductWorkspacePage = lazy(() => import('./pages/ProductWorkspacePage.jsx'))
const QuotationsPage = lazy(() => import('./pages/QuotationsPage.jsx'))
const OfferWorkspacePage = lazy(() => import('./pages/OfferWorkspacePage.jsx'))
const MyTasksPage = lazy(() => import('./pages/MyTasksPage.jsx'))
const TeamWorkloadPage = lazy(() => import('./pages/TeamWorkloadPage.jsx'))
const ManufacturingPage = lazy(() => import('./pages/ManufacturingPage.jsx'))
const MachinesPage = lazy(() => import('./pages/MachinesPage.jsx'))
const MachineProfilePage = lazy(() => import('./pages/MachineProfilePage.jsx'))
const PeoplePage = lazy(() => import('./pages/PeoplePage.jsx'))
const MessagesPage = lazy(() => import('./pages/MessagesPage.jsx'))
const QualityPage = lazy(() => import('./pages/QualityPage.jsx'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.jsx'))
const PlanningPage = lazy(() => import('./pages/PlanningPage.jsx'))
const DocumentationPage = lazy(() => import('./pages/DocumentationPage.jsx'))
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'))
const InventoryPage = lazy(() => import('./pages/InventoryPage.jsx'))
const PurchasePage = lazy(() => import('./pages/PurchasePage.jsx'))
const ShippingPage = lazy(() => import('./pages/ShippingPage.jsx'))
const CRMPage = lazy(() => import('./pages/CRMPage.jsx'))
const ClientProfilePage = lazy(() => import('./pages/ClientProfilePage.jsx'))
const AiAgentsPage = lazy(() => import('./pages/AiAgentsPage.jsx'))
const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx'))
const OfferAcceptancePage = lazy(() => import('./pages/public/OfferAcceptancePage.jsx'))
const UploadPortalPage = lazy(() => import('./pages/public/UploadPortalPage.jsx'))
import { ERP_NAV_ITEMS } from './config/erpNav.js'

const PAGE_META_KEYS = {
  dashboard: { titleKey: 'page.dashboard.title', subtitleKey: 'page.dashboard.subtitle' },
  products: { titleKey: 'page.products.title', subtitleKey: 'page.products.subtitle' },
  quotations: { titleKey: 'page.quotations.title', subtitleKey: 'page.quotations.subtitle' },
  'offer-workspace': { titleKey: 'page.quotations.title', subtitleKey: 'page.quotations.subtitle' },
  'product-workspace': {
    titleKey: 'page.productWorkspace.title',
    subtitleKey: 'page.productWorkspace.subtitle',
  },
  tasks: { titleKey: 'page.tasks.title', subtitleKey: 'page.tasks.subtitle' },
  'team-workload': { titleKey: 'page.teamWorkload.title', subtitleKey: 'page.teamWorkload.subtitle' },
  planning: { titleKey: 'page.planning.title', subtitleKey: 'page.planning.subtitle' },
  manufacturing: { titleKey: 'page.manufacturing.title', subtitleKey: 'page.manufacturing.subtitle' },
  machines: { titleKey: 'page.machines.title', subtitleKey: 'page.machines.subtitle' },
  'machine-profile': {
    titleKey: 'page.machineProfile.title',
    subtitleKey: 'page.machineProfile.subtitle',
  },
  inventory: { titleKey: 'page.inventory.title', subtitleKey: 'page.inventory.subtitle' },
  purchase: { titleKey: 'page.purchase.title', subtitleKey: 'page.purchase.subtitle' },
  shipping: { titleKey: 'page.shipping.title', subtitleKey: 'page.shipping.subtitle' },
  people: { titleKey: 'page.people.title', subtitleKey: 'page.people.subtitle' },
  messages: { titleKey: 'page.messages.title', subtitleKey: 'page.messages.subtitle' },
  quality: { titleKey: 'page.quality.title', subtitleKey: 'page.quality.subtitle' },
  analytics: { titleKey: 'page.analytics.title', subtitleKey: 'page.analytics.subtitle' },
  reports: { titleKey: 'page.reports.title', subtitleKey: 'page.reports.subtitle' },
  'ai-agents': { titleKey: 'page.aiAgents.title', subtitleKey: 'page.aiAgents.subtitle' },
  crm: { titleKey: 'page.crm.title', subtitleKey: 'page.crm.subtitle' },
  'client-profile': {
    titleKey: 'page.clientProfile.title',
    subtitleKey: 'page.clientProfile.subtitle',
  },
  documentation: { titleKey: 'page.documentation.title', subtitleKey: 'page.documentation.subtitle' },
  settings: { titleKey: 'page.settings.title', subtitleKey: 'page.settings.subtitle' },
}

/**
 * @param {{ page: string; productId: string | null; clientId: string | null; machineId: string | null }} route
 * @param {import('./data/mockDatabase.js').MockDatabase} db
 * @param {{
 *   openProduct: (id: string) => void
 *   backFromProduct: () => void
 *   openTeamWorkload: () => void
 *   openClient: (id: string) => void
 *   backFromClient: () => void
 *   openMachine: (id: string) => void
 *   backFromMachine: () => void
 *   openReports: () => void
 * }} actions
 */
function PageFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
    </div>
  )
}

function renderPage(route, db, actions) {
  switch (route.page) {
    case 'dashboard':
      return (
        <DashboardPage
          db={db}
          onNewInquiry={actions.openNewInquiry}
          onNavigate={actions.navigate}
          onOpenOffer={actions.openOffer}
          onOpenClient={actions.openClient}
        />
      )
    case 'products':
      return <ProductsPage db={db} onOpenProduct={actions.openProduct} />
    case 'quotations':
      return <QuotationsPage db={db} onOpenOffer={actions.openOffer} onOpenProduct={actions.openProduct} onNewInquiry={actions.openNewInquiry} />
    case 'offer-workspace':
      return (
        <OfferWorkspacePage
          db={db}
          quoteId={route.quoteId}
          onBack={actions.backFromOffer}
          onOpenProduct={actions.openProduct}
          onOpenReports={actions.openReports}
        />
      )
    case 'product-workspace':
      return (
        <ProductWorkspacePage
          db={db}
          productId={route.productId ?? 'prod-1'}
          onBack={actions.backFromProduct}
          onOpenReports={actions.openReports}
          onOpenOffer={actions.openOffer}
        />
      )
    case 'tasks':
      return <MyTasksPage db={db} />
    case 'team-workload':
      return <TeamWorkloadPage db={db} />
    case 'planning':
      return <PlanningPage db={db} />
    case 'manufacturing':
      return <ManufacturingPage db={db} />
    case 'machines':
      return <MachinesPage db={db} onOpenMachine={actions.openMachine} />
    case 'machine-profile':
      return (
        <MachineProfilePage
          db={db}
          machineId={route.machineId ?? 'mach-1'}
          onBack={actions.backFromMachine}
        />
      )
    case 'inventory':
      return <InventoryPage db={db} />
    case 'purchase':
      return <PurchasePage db={db} />
    case 'shipping':
      return <ShippingPage db={db} />
    case 'people':
      return <PeoplePage db={db} onTeamWorkload={actions.openTeamWorkload} />
    case 'messages':
      return <MessagesPage />
    case 'quality':
      return <QualityPage db={db} />
    case 'analytics':
      return <AnalyticsPage db={db} />
    case 'reports':
      return <ReportsPage db={db} />
    case 'ai-agents':
      return <AiAgentsPage db={db} />
    case 'crm':
      return <CRMPage db={db} onOpenClient={actions.openClient} />
    case 'client-profile':
      return (
        <ClientProfilePage
          db={db}
          clientId={route.clientId ?? 'client-1'}
          onBack={actions.backFromClient}
          onOpenOffer={actions.openOffer}
          onOpenProduct={actions.openProduct}
        />
      )
    case 'documentation':
      return <DocumentationPage />
    case 'settings':
      return <SettingsPage />
    default:
      return <DashboardPage db={db} />
  }
}

/** @returns {null | { token: string }} */
function detectAcceptanceToken() {
  if (typeof window === 'undefined') return null
  const path = window.location?.pathname ?? ''
  const accept = /^\/offer-accept\/([^/?#]+)/.exec(path)
  if (accept) return { type: 'offer-accept', token: decodeURIComponent(accept[1]) }
  const upload = /^\/upload\/([^/?#]+)/.exec(path)
  if (upload) return { type: 'upload', token: decodeURIComponent(upload[1]) }
  const params = new URLSearchParams(window.location?.search ?? '')
  if (params.get('offerAccept')) return { type: 'offer-accept', token: params.get('offerAccept') }
  if (params.get('upload')) return { type: 'upload', token: params.get('upload') }
  return null
}

function App() {
  const { t } = useLanguage()
  const { config, theme } = useFactoryConfig()
  const { can } = useCurrentUser()
  const { db } = useDb()
  const [route, setRoute] = useState(
    /** @type {{ page: string; productId: string | null; clientId: string | null; machineId: string | null }} */ ({
      page: 'dashboard',
      productId: null,
      clientId: null,
      machineId: null,
    }),
  )
  const [showNewInquiry, setShowNewInquiry] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const publicRoute = useMemo(() => detectAcceptanceToken(), [])

  const sidebarItems = useMemo(
    () =>
      ERP_NAV_ITEMS
        // Dashboard + Settings are always reachable (avoid locking yourself out
        // of the control panel); everything else respects module toggles + perms.
        .filter((item) => item.id === 'dashboard' || item.id === 'settings' ||
          (config.enabledModules.includes(item.id) && can(`module.${item.id}`)))
        .map((item) => ({
          id: item.id,
          icon: item.icon,
          label: t(item.labelKey),
          active:
            item.id === route.page ||
            (route.page === 'product-workspace' && item.id === 'products') ||
            (route.page === 'offer-workspace' && item.id === 'quotations') ||
            (route.page === 'client-profile' && item.id === 'crm') ||
            (route.page === 'machine-profile' && item.id === 'machines'),
        })),
    [route.page, t, config.enabledModules, can],
  )

  const [cmdOpen, setCmdOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const mainRef = useRef(/** @type {HTMLElement | null} */ (null))

  // Always start a newly opened page at the top, not wherever the previous
  // page was scrolled to.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [route.page, route.quoteId, route.productId, route.clientId, route.machineId])

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const metaKeys = PAGE_META_KEYS[route.page] ?? PAGE_META_KEYS.dashboard
  const meta = { title: t(metaKeys.titleKey), subtitle: t(metaKeys.subtitleKey) }

  const actions = useMemo(
    () => ({
      openProduct: (id) =>
        setRoute({ page: 'product-workspace', productId: id, clientId: null, machineId: null }),
      backFromProduct: () =>
        setRoute({ page: 'products', productId: null, clientId: null, machineId: null }),
      openTeamWorkload: () =>
        setRoute({ page: 'team-workload', productId: null, clientId: null, machineId: null }),
      openClient: (id) =>
        setRoute({ page: 'client-profile', clientId: id, productId: null, machineId: null }),
      backFromClient: () =>
        setRoute({ page: 'crm', productId: null, clientId: null, machineId: null }),
      openMachine: (id) =>
        setRoute({ page: 'machine-profile', machineId: id, productId: null, clientId: null }),
      backFromMachine: () =>
        setRoute({ page: 'machines', productId: null, clientId: null, machineId: null }),
      openReports: () =>
        setRoute({ page: 'reports', productId: null, clientId: null, machineId: null }),
      openOffer: (id) =>
        setRoute({ page: 'offer-workspace', quoteId: id, productId: null, clientId: null, machineId: null }),
      backFromOffer: () =>
        setRoute({ page: 'quotations', quoteId: null, productId: null, clientId: null, machineId: null }),
      openNewInquiry: () => setShowNewInquiry(true),
      navigate: (page) => setRoute({ page, productId: null, clientId: null, machineId: null }),
    }),
    [],
  )

  if (publicRoute?.type === 'offer-accept') {
    return <Suspense fallback={<PageFallback />}><OfferAcceptancePage db={db} token={publicRoute.token} /></Suspense>
  }
  if (publicRoute?.type === 'upload') {
    return <Suspense fallback={<PageFallback />}><UploadPortalPage token={publicRoute.token} /></Suspense>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      <CommandPalette
        db={db}
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onOpenProduct={actions.openProduct}
        onOpenClient={actions.openClient}
        onNavigate={actions.navigate}
      />
      <Sidebar
        items={sidebarItems}
        onSelect={(id) => setRoute({ page: id, productId: null, clientId: null, machineId: null })}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 xl:p-8">
        <Header
          title={meta.title}
          subtitle={meta.subtitle}
          onMenuOpen={() => setSidebarOpen(true)}
          onSearch={() => setCmdOpen(true)}
          aiOpen={aiOpen}
          onToggleAi={() => setAiOpen((v) => !v)}
          onNavigate={(link) => setRoute({ page: link.page, quoteId: link.quoteId ?? null, productId: link.productId ?? null, clientId: link.clientId ?? null, machineId: null })}
        />
        <Suspense fallback={<PageFallback />}>{renderPage(route, db, actions)}</Suspense>
      </main>

      {/* Floating action button — New Inquiry (dashboard only) */}
      {route.page === 'dashboard' && (
        <button
          type="button"
          onClick={() => setShowNewInquiry(true)}
          title={t('dashboard.quickActions.newInquiry')}
          className={`fixed bottom-24 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition active:scale-95 ${theme.primaryBtn}`}
        >
          <Plus size={22} />
        </button>
      )}

      {/* New Inquiry modal */}
      {showNewInquiry ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) setShowNewInquiry(false) }}
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <header className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{t('newInquiry.title')}</h2>
                <p className="mt-1 text-xs text-slate-500">{t('newInquiry.subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewInquiry(false)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                aria-label={t('common.close')}
              >
                ✕
              </button>
            </header>
            <NewInquiryForm
              db={db}
              onCancel={() => setShowNewInquiry(false)}
              onCreated={(productId) => {
                setShowNewInquiry(false)
                setRoute({ page: 'product-workspace', productId, clientId: null, machineId: null })
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Toggleable right-side AI assistant */}
      <AiAssistantPanel open={aiOpen} onClose={() => setAiOpen(false)} />

      {/* Global floating chat bubble — 1:1 employee conversations */}
      <ChatLauncher />
    </div>
  )
}

export default App
