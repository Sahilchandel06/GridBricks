# Progress

Last updated: 2026-10-25

## Requirement checklist

| PDF requirement or deliverable | Phase | Status |
| --- | --- | --- |
| Product context: UK utility buying in the day-ahead market; decisions made one day before delivery | P0 | Pending implementation |
| Show latest renewable forecast available when buying decisions are made | P2–P5 | In progress: selection logic complete; decision UI pending |
| Quantitatively evaluate renewable forecast accuracy to inform decisions | P2, P4–P6 | In progress: metrics complete; accuracy UI pending |
| National-level wind actuals and forecasts from Elexon alone | P0–P2 | Pass: Elexon-only national datasets |
| FUELHH actuals filtered to `fuelType == WIND`, with `startTime` and `generation` | P0–P1 | Pass: 1,488 rows, no half-hour gaps |
| WINDFOR forecasts using `startTime`, `publishTime`, and `generation` | P0–P1 | Pass: 17,864 rows, 744 target hours covered |
| Only data relevant to January 2026 purchase decisions | P0–P2 | Pass: retained target times restricted to Jan 2026 |
| React frontend and Python backend | P0, P3–P6 | In progress: FastAPI API complete; frontend pending |
| Docker | P0, P7 | Pending |
| Deploy sample app to Vercel or Heroku | P0, P7 | Pending |
| Respect the 16-hour effort limit | All | In progress; scope must stay lean |
| Pitch/demo video: two parts, each overview no more than five minutes, total no more than ten minutes; unlisted YouTube | P7–P8 | Pending; external account action needed |
| Public GitHub repo with anonymous/random repo name | P8 | Pending; external account action needed |
| README lists files/directories, startup instructions, and live app link | P8 | Pending |
| Submit assignment details through specified form | P8 | Pending; external form action needed |
| Open every submitted URL in incognito mode and verify access | P8 | Pending |

## Done

- Read the complete official assignment PDF.
- Created the P0 project documentation and skeleton directories.
- Confirmed the official Elexon developer portal publishes public API definitions and describes streaming responses as JSON without result limits.
- Verified the exact Elexon stream filters and response structures in the official OpenAPI spec and a live API sample.
- P1 ingestion: added daily requests with retry, UTC normalization, filtering, deduplication, sorting, compact JSON outputs, and a coverage report.
- Fetched and committed-data-ready outputs: `data/actuals.json`, `data/forecasts.json`, and `data/data-quality.json`.
- P1 tests pass: 8 tests.
- P1 committed as `a4d1441`; generated Python bytecode was removed and ignore rules fixed in `6fd24f3`.
- Ruff lint passes for the P1 ingestion module and tests.
- P2 decision-time selection and accuracy analytics are implemented in `backend/analytics/analytics.py`.
- P2 covers UK local cutoff/DST behavior, hourly-to-half-hourly alignment, cutoff gaps, summary metrics, horizon/hour/wind-level breakdowns, error histogram, uncertainty bands, and the historical buffer.
- Generated `data/analytics.json`: 744/744 hourly decisions matched at D-1 09:00 Europe/London; MAE 2,142.1 MW, RMSE 2,611.7 MW, bias +1,851.9 MW, P90 absolute error 4,300.2 MW.
- P2 tests pass: 16 tests across ingestion and analytics; Ruff passes.
- P3 FastAPI endpoints are implemented for metadata, decision day, accuracy summary, all three breakdowns, and error distribution.
- P3 includes Pydantic response models, January-only date validation, cutoff validation, structured errors, configured CORS, five-minute HTTP caching, and OpenAPI/Swagger routes.
- Added `api/index.py` as the Vercel Python function entry point and backend runtime/development requirements.
- P3 verification passes: 26 pytest tests across all phases, Ruff checks `backend` and `api`, and OpenAPI path/error schemas were inspected.
- P3 committed as `66d74fe`.

## In progress

- No phase is currently in progress.

## Next (ordered)

1. Build P4 React/Vite/TypeScript/Tailwind foundation, shell, theme, and typed API client.
2. Implement the decision view and bind it to `/api/decision`.
3. Implement the accuracy view and bind it to the analytics endpoints.

## Known issues

- The prompt's richer feature list and visual specifications exceed the official PDF; resolve scope in favor of the PDF where they conflict.
- Forecast accuracy represents one month and the D-1 09:00 default; other cutoffs can produce different results.
- The symmetric P90 absolute-error buffer does not model asymmetric market costs or demand.
- Vercel currently documents its Python runtime as Beta; P7 must verify build routing and data-file inclusion before relying on it.
- Deployment, public repo creation, YouTube upload, and form submission are external deliverables.
- Product views and Docker setup are not implemented yet.

## How to run now

Install backend dependencies with `python -m pip install -r requirements.txt`. Run the API locally with `uvicorn backend.app.main:app --reload`. Generate analytics with `python -m backend.analytics.analytics`. Run tests with `python -m pytest backend/tests -q` and lint with `ruff check backend api`.

## Env needed

No environment variables are required. Public deployment will later require hosting and GitHub credentials, and a YouTube account for the required video deliverable.
