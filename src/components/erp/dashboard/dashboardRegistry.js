import {
  KpisWidget,
  ActionCenterWidget,
  PipelineWidget,
  DueSoonWidget,
  RecentOffersWidget,
  ExpiringOffersWidget,
} from './dashboardWidgets.jsx'

/**
 * Preset widget catalogue for the customisable dashboard. `span` controls grid
 * width ('full' = both columns).
 * @type {{ id: string; titleKey: string; defaultTitle: string; span: 'full'|'half'; Component: Function }[]}
 */
export const WIDGET_DEFS = [
  { id: 'kpis', titleKey: 'dash.widget.kpis', defaultTitle: 'KPI overview', span: 'full', Component: KpisWidget },
  { id: 'actionCenter', titleKey: 'dash.widget.actionCenter', defaultTitle: 'Action center', span: 'full', Component: ActionCenterWidget },
  { id: 'pipeline', titleKey: 'dash.widget.pipeline', defaultTitle: 'Inquiries pipeline', span: 'half', Component: PipelineWidget },
  { id: 'dueSoon', titleKey: 'dash.widget.dueSoon', defaultTitle: 'Due soon', span: 'half', Component: DueSoonWidget },
  { id: 'recentOffers', titleKey: 'dash.widget.recentOffers', defaultTitle: 'Recent offers', span: 'half', Component: RecentOffersWidget },
  { id: 'expiringOffers', titleKey: 'dash.widget.expiringOffers', defaultTitle: 'Expiring offers', span: 'half', Component: ExpiringOffersWidget },
]

export const DEFAULT_LAYOUT = ['kpis', 'actionCenter', 'pipeline', 'dueSoon']

export const WIDGET_MAP = Object.fromEntries(WIDGET_DEFS.map((w) => [w.id, w]))
