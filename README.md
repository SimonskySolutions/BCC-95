# BCC Manufacturing ERP — Dashboard UI

A scalable, modular, product-centric manufacturing ERP built with React, Vite and Tailwind CSS.

The system follows a fixed product lifecycle (VSM):

1. **Запитване** (Inquiry)
2. **Внедряване** (Implementation)
3. **Нулева серия** (Zero series)
4. **Серийно производство** (Serial production)
5. **Експедиция и приключване** (Shipping & closure)
6. **Рекламации** (Complaints)
7. **Подобрения** (Improvements)

The Product entity is the central anchor across all modules. Phases are strictly gated: a product cannot move to the next phase until the current one is completed and approved.

---

## Architecture highlights

- **Domain-driven folder structure** under `src/domains/` — `products`, `lifecycle`, `tasks`, `manufacturing-path`, `operations`, `machines`, `people`, `kpis`, `quotations`, `inquiries`, `communications`, `audit`, plus placeholders for `planning`, `scheduling`, `shifts`, `costing`, `iot`.
- **One canonical Task model** — tasks can reference Product, Phase and (optionally) Operation without duplication.
- **Shared service / selector layer** under `src/services/` and `src/domains/*/selectors.js`.
- **Stable UI shell** — navigation, Product Workspace, and page scaffolds don't change when new modules are added.
- **Data-driven KPIs** — every KPI is computed from underlying data (tasks, operations, machines), never hard-coded.
- **Full i18n** — English + Bulgarian translations in `src/i18n/translations.js`.

### Offer sub-state machine (Phase 1 — Запитване и офериране)

The first phase is driven by an explicit sub-state machine (`src/services/offers/offerSubStateMachine.js`):

```
inquiry_received -> intake_complete -> feasibility_done -> tech_review_done
                 -> costing_done -> quote_drafted -> approved -> sent -> decided_accepted
```

Each gate is enforced by services (e.g. `quoteVersioningService` refuses to draft until quotation tasks are resolved) and recorded in an audit trail (`src/domains/audit/`). When the customer accepts an offer, `customerDecisionService` automatically transitions the product from **Запитване** to **Внедряване** through `phaseTransitionService`.

### Public customer acceptance

Offers are sent with a tokenized public link:

```
/offer-accept/:token
```

This is a standalone, unauthenticated page (`src/pages/public/OfferAcceptancePage.jsx`) where customers can **Accept / Request revision / Reject** the offer. The decision is written back into the ERP, the audit log is updated, and the lifecycle advances if accepted.

### Reporting & exports

The Reports page (`src/pages/ReportsPage.jsx`) exposes filterable reports for Products, Inquiries, Offers, Offer line items, Tasks and the Audit trail. All reports can be exported as **CSV / XLSX / PDF** via `src/services/reporting/exportService.js`.

---

## Getting started

```bash
npm install
npm run dev       # start Vite dev server
npm run build     # production build → dist/
npm run preview   # preview the production build locally
npm run lint      # eslint
npm run validate  # run functional checks on selectors/services
```

Node 18+ is recommended.

---

## Deployment — Vercel

This repository is configured to deploy to Vercel out of the box (`vercel.json`).

### One-time setup

1. Push this repo to GitHub: https://github.com/SimonskySolutions/BCC-95.git
2. In [vercel.com](https://vercel.com/) click **Add New → Project** and import the GitHub repo `SimonskySolutions/BCC-95`.
3. Vercel auto-detects the framework as **Vite** (overridden explicitly in `vercel.json`):
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
4. Click **Deploy**. On success you get a public URL like `https://bcc-95.vercel.app`.

### Environment variables

Optional — override the base URL used when building public customer acceptance links:

| Variable           | Example                          | Purpose                                                |
| ------------------ | -------------------------------- | ------------------------------------------------------ |
| `VITE_PUBLIC_BASE_URL` | `https://bcc-95.vercel.app` | Prefix used by `quoteSendService` for `/offer-accept/:token` links in outbound emails |

If not set, the app falls back to `window.location.origin` at runtime.

### SPA routing

`vercel.json` rewrites every path to `/index.html` so client-side routes (including `/offer-accept/:token`) are served by the React app. Static assets under `/assets/*` are served with a 1-year immutable cache.

### Deploy via CLI (optional)

```bash
npm i -g vercel
vercel login
vercel           # preview deployment
vercel --prod    # production deployment
```

---

## Repository layout

```
erp-dashboard-ui/
├── src/
│   ├── domains/          # Business domains (product, lifecycle, tasks, offers, ...)
│   ├── services/         # Business logic (phase transitions, offer workflow, reporting)
│   ├── components/       # Reusable UI (Sidebar, Header, ProductWorkspace, offer/*, ...)
│   ├── pages/            # Page scaffolds (dashboard, products, tasks, reports, public/*)
│   ├── i18n/             # EN + BG translations
│   ├── config/           # Navigation + shell config
│   └── data/             # In-memory mock database
├── scripts/
│   └── validate-erp.mjs  # Functional checks (selectors, services, KPIs)
├── vercel.json           # Vercel deploy config (SPA rewrites, caching)
└── vite.config.js
```

---

## Roadmap (release-based, non-breaking)

- **Release 1 (current):** Products, Lifecycle, Tasks, Product Workspace, Manufacturing Path, Operations, Machine Park, basic KPIs, Inquiry + Offer workflow, Reports.
- **Release 2:** Production planning, Work centers, Capacity view, Shift management, improved KPIs.
- **Release 3:** Scheduling engine, Operation dependencies, Machine timeline, Conflict detection.
- **Release 4:** Cost tracking per operation, Product cost summary, Real-time machine data (IoT), Downtime tracking.

All future modules slot in under existing domains — the UI shell and navigation remain stable.
