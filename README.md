# RTA Analysis Toolkit

A web-based **Rate Transient Analysis (RTA)** application built with Angular 21. Designed for reservoir engineers to analyse production and pressure data using industry-standard methods such as Blasingame type curve analysis.

> **Deployment target:** Initially a standalone web app. Final deployment will be hosted inside **OFM (SLB/Sensia)** software via WebView2 (C# WPF).

---

## Quick Start

```bash
npm install
ng serve
```

Open `http://localhost:4200/` in your browser.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Angular 21 (standalone components) |
| UI Library | Angular Material 21 |
| Charts | Plotly.js 3 |
| Reactive State | RxJS 7 |
| Testing | Vitest |
| Language | TypeScript 5.9 |

---

## Project Structure

```
src/app/
├── features/
│   ├── blasingame/                   # Blasingame type curve analysis
│   │   └── type-curve-matcher/       # Interactive parameter matching
│   ├── diagnostic-plots/             # Production diagnostic plots
│   └── well-selector/                # Well selection UI
├── services/
│   ├── app-state.service.ts          # Central RxJS state hub
│   ├── blasingame-calculation.service.ts
│   ├── type-curve-matching.service.ts
│   ├── data-provider.interface.ts    # Data provider contract
│   ├── data-provider.factory.ts      # mock ↔ http switcher
│   ├── mock-data-provider.service.ts # Synthetic data (3 wells)
│   └── http-data-provider.service.ts # REST skeleton (incomplete)
├── models/
│   ├── well.model.ts
│   ├── production-data.model.ts
│   ├── blasingame.model.ts
│   ├── rta-results.model.ts
│   ├── chart-config.model.ts
│   └── loading-state.model.ts
├── shared/
│   └── components/
│       └── plotly-chart/             # Universal Plotly wrapper
└── utils/
    └── numerical.utils.ts            # Trapz integration, log derivative, etc.
```

---

## Current Status

### Implemented

| Feature | Notes |
|---|---|
| Blasingame type curves | Normalized rate (q/Δp), integral (q/Δp)i, derivative (q/Δp)id on log-log |
| Material balance time | te = Np/q |
| Pressure normalization | Uses measured pressure; falls back to average estimate |
| Flow regime identification | Slope-based: infinite-acting, transition, BDF, depletion |
| Interactive type curve matching | Manual sliders for kh, skin, drainage area |
| Match quality metrics | R², RMSE, MAE |
| Diagnostic plots | Rate vs Time (linear), Rate vs Cumulative |
| Plotly chart wrapper | Log-log, semi-log, linear axes; dual Y-axis; PNG export |
| Mock data provider | 3 synthetic wells (2 oil Wolfcamp, 1 gas Piceance) |
| CSV export | Type curve matching results only |
| Responsive Material UI | Tabs-based layout |

### Not Yet Implemented / Incomplete

| Feature | Priority | Notes |
|---|---|---|
| **Data import (CSV)** | High | ✅ Step 1.1 done — drag-drop upload, preview table, well metadata form, localStorage persistence |
| **Data import (Excel upload)** | High | ✅ Step 1.2 done — SheetJS, sheet selector, auto-detect + manual column mapper |
| **HTTP data provider** | High | Skeleton exists, endpoints not wired |
| **Automatic type curve matching** | High | Manual sliders only; no optimisation algorithm |
| **Agarwal-Gardner analysis** | High | Not started |
| **Normalised Pressure Integral (NPI)** | High | Not started |
| **URL routing** | Medium | `app.routes.ts` is empty |
| **Pressure buildup / shut-in analysis** | Medium | Model defined, no implementation |
| **Dimensionless time display** | Medium | Calculated but not shown on Blasingame plot |
| **PDF / Excel report export** | Medium | CSV only, partial coverage |
| **Multi-well comparison** | Medium | Single-well only |
| **Uncertainty / sensitivity analysis** | Medium | Not started |
| **Results persistence** | Medium | No local storage or backend save |
| **OFM / WebView2 data bridge** | Low* | Will be needed at deployment stage |
| **Well performance forecast** | Low | Not started |
| **User authentication** | Low | Not started |

> *Low priority now because OFM integration comes after web functionality is complete.

---

## Development Roadmap

Each phase below is a self-contained milestone. Complete one phase before moving to the next.

---

### Phase 1 — Data Import (Current Priority)

**Goal:** Allow users to load real production data into the app.

#### Step 1.1 — CSV File Upload ✅ Complete
- [x] Create `DataImportService` to parse CSV files
- [x] Define expected CSV column schema (date, oil rate, gas rate, water rate, pressure) with flexible aliases
- [x] Build `DataImportDialogComponent` (MatStepper) with `FileDropZoneComponent` drag-and-drop
- [x] Validate and preview parsed data in `ImportPreviewTableComponent` before confirming import
- [x] Full well metadata form (name, API number, field, fluid type, completion type)
- [x] Map parsed data to existing `ProductionData` model (cumulative via trapezoidal integration)
- [x] Feed imported data into `AppStateService.loadImportedData()` (bypasses mock provider)
- [x] Show blocking errors and non-blocking warnings with clear messages

#### Step 1.2 — Excel File Upload ✅ Complete
- [x] Add `xlsx` (SheetJS 0.18) library
- [x] Support `.xlsx` and `.xls` formats
- [x] Sheet selector (shown only when workbook has more than 1 sheet)
- [x] `ColumnMapperComponent` — auto-detects columns by header name; manual dropdowns override
- [x] Reuses same validation and preview pipeline as Step 1.1

#### Step 1.3 — Data Management UI ✅ Complete
- [x] Display currently loaded dataset (well name, source file, date range, record count) via `DataManagementPanelComponent`
- [x] Allow clearing (restores mock data) or replacing (re-opens import dialog)
- [x] Store last imported data in browser `localStorage` via `ImportPersistenceService` (survives page refresh)

---

### Phase 2 — Routing & Navigation

**Goal:** Proper URL-based navigation so each analysis module has its own page.

- [ ] Define routes in `app.routes.ts`:
  - `/` → Dashboard / well selector
  - `/diagnostic-plots` → Diagnostic plots
  - `/blasingame` → Blasingame type curves
  - `/blasingame/match` → Type curve matcher
  - `/agarwal-gardner` → (placeholder for Phase 3)
- [ ] Add `RouterOutlet` to root template
- [ ] Implement lazy loading for each feature module
- [ ] Add breadcrumb navigation

---

### Phase 3 — Additional Analysis Methods

**Goal:** Expand beyond Blasingame to cover standard RTA workflow.

#### Step 3.1 — Agarwal-Gardner Analysis
- [ ] Implement Agarwal-Gardner normalised rate and cumulative functions
- [ ] Display on log-log plot with same wrapper component
- [ ] Integrate flow regime overlay

#### Step 3.2 — Normalised Pressure Integral (NPI)
- [ ] Implement NPI calculation
- [ ] Plot NPI and NPI derivative
- [ ] Combine with Blasingame on overlay plot

#### Step 3.3 — Pressure Buildup / Shut-in Analysis
- [ ] Detect shut-in periods from production data
- [ ] Implement Horner plot
- [ ] Extract skin and permeability from slope

---

### Phase 4 — Automatic Type Curve Matching

**Goal:** Replace manual sliders with an optimisation algorithm.

- [ ] Implement Nelder-Mead (or Levenberg-Marquardt) optimisation in `NumericalUtils`
- [ ] Add "Auto Match" button to `TypeCurveMatcherComponent`
- [ ] Show convergence progress (iterations, objective function value)
- [ ] Allow user to refine auto result with sliders afterwards
- [ ] Report 95% confidence intervals on matched parameters

---

### Phase 5 — Enhanced Export & Reporting

**Goal:** Produce engineer-ready outputs.

- [ ] Export Blasingame results to CSV
- [ ] Export diagnostic plots to CSV
- [ ] Generate PDF report: well summary + all charts + matched parameters table
- [ ] Excel export with raw data + calculated columns on separate sheets

---

### Phase 6 — HTTP Backend Integration

**Goal:** Connect to a real data backend (when available).

- [ ] Complete `HttpDataProviderService`:
  - `GET /api/wells` → well list
  - `GET /api/wells/:id/properties` → well static properties
  - `GET /api/wells/:id/production` → production time series
  - `GET /api/wells/:id/pressure` → pressure test records
  - `POST /api/analysis` → save analysis results
- [ ] Add environment config (`environment.ts`) for API base URL
- [ ] Switch `DataProviderFactory` from `mock` to `http` via environment flag
- [ ] Add HTTP interceptor for error handling and loading state
- [ ] Implement result persistence (save / load analysis sessions)

---

### Phase 7 — OFM / WebView2 Integration

**Goal:** Host the web app inside OFM (SLB/Sensia) via C# WPF WebView2.

- [ ] Design `OFMBridgeService` to communicate with the host application:
  - Listen for `window.chrome.webview.addEventListener('message', ...)` events
  - Post messages back via `window.chrome.webview.postMessage(...)`
- [ ] Define message schema (e.g., `{ type: 'LOAD_WELL', payload: {...} }`)
- [ ] Replace or supplement `DataProviderFactory` with OFM bridge provider
- [ ] Test data injection from C# side into Angular state
- [ ] Handle OFM lifecycle events (well change, project close)
- [ ] Build and package as static assets for embedding in WPF app

---

## Data Flow (Current)

```
App Init
  └─► DataProviderFactory (mode: 'mock')
        └─► MockDataProviderService
              └─► AppStateService
                    ├─► wellList$          ──► WellSelectorComponent
                    ├─► selectedWell$      ──► All analysis components
                    ├─► productionData$    ──► BlasingameComponent
                    │                          DiagnosticPlotsComponent
                    └─► loadingState$      ──► Loading spinners / error messages
```

---

## Data Provider Toggle

To switch from mock data to real HTTP data, change the mode in [src/app/app.config.ts](src/app/app.config.ts):

```typescript
// Current (mock)
{ provide: DATA_PROVIDER_MODE, useValue: 'mock' }

// When backend is ready
{ provide: DATA_PROVIDER_MODE, useValue: 'http' }
```

---

## Expected CSV Import Format (Phase 1 target)

```csv
date,oil_rate_stbd,gas_rate_mscfd,water_rate_stbd,pressure_psia
2022-01-01,750,1200,50,3800
2022-01-02,745,1195,51,3795
...
```

All columns except `date` and at least one rate column are optional.

---

## Running Tests

```bash
ng test
```

---

## Building for Production

```bash
ng build --configuration production
```

Output is in `dist/rta-analysis-toolkit/`.
