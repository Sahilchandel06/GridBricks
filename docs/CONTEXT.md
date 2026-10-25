# Project context

## Condensed brief

Build a first-version React frontend and Python backend for a UK utility’s day-ahead wind procurement decisions. Show forecast information available at decision time and quantify forecast accuracy. The official assignment limits the data to national wind generation actuals and forecasts from Elexon and to decisions in January 2026.

## Verified Elexon API notes

- Official developer portal: <https://developer.data.elexon.co.uk/>; machine-readable OpenAPI spec: <https://data.elexon.co.uk/swagger/v1/swagger.json>.
- The portal says its APIs are public and need no API key.
- Dataset endpoints expose source data and support retrieval using publication-time filters; stream endpoints return JSON and are described as having no result limits.
- Official dataset endpoint paths are `/datasets/FUELHH/stream` (actuals) and `/datasets/WINDFOR/stream` (forecasts), served from the BMRS API.
- FUELHH stream query parameters include `settlementDateFrom`, `settlementDateTo` (both `yyyy-MM-dd`), and repeated/list `fuelType`; actuals are filtered to `WIND`. Its JSON response is an array of records including `dataset`, `publishTime`, `startTime`, `settlementDate`, `settlementPeriod`, `fuelType`, and `generation`.
- WINDFOR stream query parameters are `publishDateTimeFrom` and `publishDateTimeTo` (date-time). Its JSON response is an array of records including `dataset`, `publishTime`, `startTime`, and `generation`.
- A live January 1 FUELHH request returned 48 half-hour rows. A live WINDFOR request returned hourly `startTime` points. Preserve the native resolutions during ingestion; any alignment belongs in analytics and must be explicit.
- `FUELHH/stream` cannot combine settlement date filters with publish date filters, per the OpenAPI description. The stream operation has no pagination parameters or stated result limit in the spec.
- Data is stored in UTC. Jan 2026 itself has no UK DST transition; dates outside that month must not be used to infer January half-hour counts.
- P2 analysis aligns each hourly WINDFOR point with the arithmetic mean of its two FUELHH half-hours. It selects the latest forecast publication at or before the previous delivery day’s Europe/London cutoff, then leaves unavailable matches as null.
- P2’s default cutoff is 09:00 Europe/London. For a configurable cutoff in a repeated fall-back hour, choose the later occurrence; reject a nonexistent spring-forward wall time.
- P2 empirical error uses `forecast - actual`; intervals for actual generation therefore invert error quantiles: `forecast - P90(error)` through `forecast - P10(error)`.

## Deployment direction

Proposed for evaluation: Vercel static frontend with Python serverless API functions, since the assignment permits Vercel or Heroku and Vercel does not host the Docker development stack. Docker remains the local application environment. Confirm function routing and bundled data size during later phases.

## API notes

- FastAPI application: `backend/app/main.py`; Vercel entry point: `api/index.py`.
- FastAPI serves the built Vite SPA with `app.frontend()` when `frontend/dist` exists; API path operations take priority and the SPA fallback supports direct page loads. Runtime requires FastAPI 0.138 or newer.
- Root `requirements.txt` delegates to `backend/requirements.txt` so Vercel installs the Python runtime dependencies.
- Vercel’s [FastAPI integration](https://vercel.com/docs/frameworks/backend/fastapi) recognizes the application entry point; the [Python runtime](https://vercel.com/docs/functions/runtimes/python) is currently labeled Beta. `vercel.json` builds the Vite assets and explicitly includes `data/**` and `frontend/dist/**` in the function bundle.
- `GET /api/meta` reports scope, units, resolutions, and source quality.
- `GET /api/decision?date=YYYY-MM-DD&cutoff=HH:MM` returns one January delivery day; cutoff is local Europe/London on D-1, default 09:00.
- Accuracy routes: `/api/accuracy/summary`, `/by-horizon`, `/by-hour`, `/by-wind-level`, and `/distribution`; each supports the same optional cutoff.
- API requests use the committed January JSON files only. Reports are cached in-process by cutoff; successful responses advertise a five-minute public cache.
- CORS allows only origins listed in `CORS_ORIGINS`; defaults are the Vite localhost origins. `GRIDBRICKS_DATA_DIR` can override the committed data folder.
- Errors share the shape `{ "error": { "code", "message", "details?" } }`. OpenAPI JSON and Swagger UI are available under `/api/openapi.json` and `/api/docs`.

## Directory map

| Path | Purpose |
| --- | --- |
| `backend/app/` | FastAPI application and API routes |
| `api/` | Vercel Python serverless entry point |
| `backend/ingest/` | Elexon data ingestion scripts |
| `backend/analytics/` | Forecast selection and accuracy calculations |
| `backend/tests/` | Backend tests |
| `frontend/` | React application |
| `frontend/src/api/` | Typed client and response contracts for the FastAPI routes |
| `frontend/src/components/` | App shell and shared UI primitives |
| `frontend/src/pages/DecisionChart.tsx` | Responsive SVG plot for hourly actuals, decision-time forecasts, and historical error bands |
| `frontend/src/pages/AccuracyCharts.tsx` | SVG error distribution and per-hour MAE charts |
| `frontend/src/pages/AccuracyPage.tsx` | Accuracy metrics and horizon/hour/wind-level breakdowns |
| `frontend/src/pages/MethodPage.tsx` | Source coverage, analysis steps, metric definitions, and limitations |
| `docs/screenshots/` | Reviewed desktop/mobile UI phase captures |
| `data/` | Processed, committed January 2026 data |
| `docs/` | Assignment, project memory, design, and progress records |
| `Dockerfile` | Multi-stage frontend build and combined FastAPI runtime image |
| `docker-compose.yml` | Local full-stack startup |
| `vercel.json` | Vercel FastAPI/Vite build and function file inclusion |

## Source of truth note

The supplied prompt includes detailed domain, analytics, screen, visual-design, and workflow requirements beyond the official PDF. The PDF remains authoritative where they conflict. To respect its explicit scope, implementation will first cover its two user needs and listed deliverables; additional detailed behavior from the prompt is treated as proposed direction pending scope review.
