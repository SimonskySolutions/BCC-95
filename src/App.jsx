import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import Sidebar from './components/Sidebar.jsx'
import Header from './components/Header.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import ChatLauncher from './components/ChatLauncher.jsx'
import { useLanguage } from './i18n/useLanguage.js'
import { useFactoryConfig } from './config/useFactoryConfig.js'
import { useDb } from './data/useDb.js'
import DashboardPage from './pages/DashboardPage.jsx'
import NewInquiryForm from './components/erp/offers/NewInquiryForm.jsx'
import ProductsPage from './pages/ProductsPage.jsx'
import ProductWorkspacePage from './pages/ProductWorkspacePage.jsx'
import QuotationsPage from './pages/QuotationsPage.jsx'
import OfferWorkspacePage from './pages/OfferWorkspacePage.jsx'
import MyTasksPage from './pages/MyTasksPage.jsx'
import TeamWorkloadPage from './pages/TeamWorkloadPage.jsx'
import ManufacturingPage from './pages/ManufacturingPage.jsx'
import MachinesPage from './pages/MachinesPage.jsx'
import MachineProfilePage from './pages/MachineProfilePage.jsx'
import PeoplePage from './pages/PeoplePage.jsx'
import MessagesPage from './pages/MessagesPage.jsx'
import QualityPage from './pages/QualityPage.jsx'
import AnalyticsPage from './pages/AnalyticsPage.jsx'
import PlanningPage from './pages/PlanningPage.jsx'
import DocumentationPage from './pages/DocumentationPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import InventoryPage from './pages/InventoryPage.jsx'
import PurchasePage from './pages/PurchasePage.jsx'
import ShippingPage from './pages/ShippingPage.jsx'
import CRMPage from './pages/CRMPage.jsx'
import ClientProfilePage from './pages/ClientProfilePage.jsx'
import AiAgentsPage from './pages/AiAgentsPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import OfferAcceptancePage from './pages/public/OfferAcceptancePage.jsx'
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
function renderPage(route, db, actions) {
  switch (route.page) {
    case 'dashboard':
      return (
        <DashboardPage
          db={db}
          onNewInquiry={actions.openNewInquiry}
          onNavigate={actions.navigate}
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
  const match = /^\/offer-accept\/([^/?#]+)/.exec(path)
  if (match) return { token: decodeURIComponent(match[1]) }
  const params = new URLSearchParams(window.location?.search ?? '')
  const queryToken = params.get('offerAccept')
  if (queryToken) return { token: queryToken }
  return null
}

function App() {
  const { t } = useLanguage()
  const { config, theme } = useFactoryConfig()
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
        .filter((item) => config.enabledModules.includes(item.id))
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
    [route.page, t, config.enabledModules],
  )

  const [cmdOpen, setCmdOpen] = useState(false)

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

  if (publicRoute) {
    return <OfferAcceptancePage db={db} token={publicRoute.token} />
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

      <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 xl:p-8">
        <Header title={meta.title} subtitle={meta.subtitle} onMenuOpen={() => setSidebarOpen(true)} onSearch={() => setCmdOpen(true)} />
        {renderPage(route, db, actions)}
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

      {/* Global floating chat bubble — 1:1 employee conversations */}
      <ChatLauncher />
    </div>
  )
}

export default App
