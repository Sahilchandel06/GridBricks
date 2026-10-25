# Progress

Last updated: 2026-10-25

## Requirement checklist

| PDF requirement or deliverable | Phase | Status |
| --- | --- | --- |
| Product context: UK utility buying in the day-ahead market; decisions made one day before delivery | P0 | Pending implementation |
| Show latest renewable forecast available when buying decisions are made | P2–P5 | Pass: decision-time selector and daily view show the selected publication, forecast, actual, and uncertainty band |
| Quantitatively evaluate renewable forecast accuracy to inform decisions | P2, P4–P6 | Pass: January error metrics and breakdowns are exposed in the responsive accuracy view |
| National-level wind actuals and forecasts from Elexon alone | P0–P2 | Pass: Elexon-only national datasets |
| FUELHH actuals filtered to `fuelType == WIND`, with `startTime` and `generation` | P0–P1 | Pass: 1,488 rows, no half-hour gaps |
| WINDFOR forecasts using `startTime`, `publishTime`, and `generation` | P0–P1 | Pass: 17,864 rows, 744 target hours covered |
| Only data relevant to January 2026 purchase decisions | P0–P2 | Pass: retained target times restricted to Jan 2026 |
| React frontend and Python backend | P0, P3–P7 | Pass: decision, accuracy, and method/source views use the FastAPI backend |
| Docker | P0, P7 | Pass: combined frontend/API image builds and runs through Compose |
| Deploy sample app to Vercel or Heroku | P0, P7 | In progress: Vercel build wiring complete; deployment needs an authenticated Vercel project |
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
- P4 added the Vite, React, TypeScript, Tailwind, and React Query frontend foundation with typed API methods for every P3 endpoint.
- P4 added the dark-first responsive app shell, stored light/dark theme toggle, shared Card/KPI/Select/DatePicker/Skeleton/Tooltip components, API connection status, and data coverage workspace scaffold.
- P4 verified with ESLint and a production TypeScript/Vite build; both pass. Playwright screenshots were captured at 1440px and 390px and reviewed. The review led to shortening a clipped mobile KPI caption and removing a decorative ring from the delivery card.
- P4 screenshots: `docs/screenshots/p4-desktop.png` and `docs/screenshots/p4-mobile.png`.
- P4 frontend committed as `c05a127`; checkpoint docs committed separately.
- P5 replaced the workspace scaffold with a date/cutoff-driven decision view bound to `/api/decision`.
- P5 includes the hourly forecast/actual plot, historical error band, forecast peak, average, recommended buffer, hourly coverage, latest publication timestamp, and data-source details.
- P5 lint and production build pass; backend verification remains green with 26 tests and Ruff. Playwright confirmed date and cutoff changes refetch the view, and screenshots at 1440px and 390px have no horizontal overflow.
- P5 screenshots: `docs/screenshots/p5-desktop.png` and `docs/screenshots/p5-mobile.png`.
- P5 feature committed as `c14beaa`; checkpoint docs committed separately.
- P6 replaced the accuracy placeholder with a live view of the summary, error distribution, per-hour errors, horizon groups, and low/mid/high wind-level groups.
- P6 shows MAE, RMSE, signed bias, MAPE, normalized MAE, median absolute error, and the P90 buffer reference, with explicit MAPE threshold and error-sign definitions.
- P6 lint and production build pass. Backend verification passes with 26 tests and Ruff. Playwright confirmed cutoff changes update the view and 1440px/390px layouts have no horizontal page overflow; mobile tables condense to the decision-relevant columns.
- P6 screenshots: `docs/screenshots/p6-desktop.png` and `docs/screenshots/p6-mobile.png`.
- P6 feature committed as `b5d5382`; checkpoint docs committed separately.
- P7 added a source/method page with the Elexon dataset links, analysis steps, archive coverage, formulas, interpretation guidance, and limitations.
- P7 upgrades FastAPI to `>=0.138` and serves the built React SPA from the API process with client-side route fallback. Local API, root, and `/method` static routes return 200.
- P7 adds a multi-stage Docker image and Compose service. `docker compose build` passed; the container reported healthy and served the SPA plus `/api/meta` successfully. The container was stopped after verification.
- P7 adds Vercel FastAPI framework/build configuration and explicit function inclusion for `data/**` and `frontend/dist/**`. The local CLI is 42.3.0, below Vercel's documented minimum 48.1.8 for current FastAPI CLI workflows, and is not authenticated, so a Vercel deployment could not be built or published from this session.
- P7 Playwright screenshots were captured from the Docker-hosted app at 1440px and 390px with no horizontal overflow: `docs/screenshots/p7-desktop.png` and `docs/screenshots/p7-mobile.png`.
- P7 implementation committed as `5b3e836`; checkpoint docs committed separately.
- P8 preparation drafted `docs/DEMO_SCRIPT.md` with a customer walkthrough and technical review script under the ten-minute total limit.

## In progress

- Frontend TypeScript-to-JavaScript migration is complete. JSX, API calls, routes, and UI behavior are unchanged; JavaScript lint and Vite production build replace the TypeScript build step.
- Verified with `npm install`, frontend lint/build, Playwright checks for all three pages and their controls at 1440px/390px, pixel-identical comparisons with the P5/P6/P7 captures, and a Docker image build. No separate frontend test suite is configured.
- P7 implementation complete. P8 demo/release preparation is underway; external publishing remains pending account access.

## Next (ordered)

1. Deploy to Vercel from an authenticated project and verify the live app/API and responsive routes.
2. Prepare the demo, public repository, and submission deliverables.

## Known issues

- The prompt's richer feature list and visual specifications exceed the official PDF; resolve scope in favor of the PDF where they conflict.
- Forecast accuracy represents one month and the D-1 09:00 default; other cutoffs can produce different results.
- The symmetric P90 absolute-error buffer does not model asymmetric market costs or demand.
- Vercel's Python runtime is documented as Beta. Local Docker/API/static routing passed; Vercel deployment has not been run because this environment is unauthenticated and the available CLI is outdated.
- Deployment, public repo creation, YouTube upload, and form submission are external deliverables.
- Vercel deployment is configured but not published; the available CLI is outdated and logged out.
- JavaScript no longer provides TypeScript's compile-time checks; keep the shared API response shapes documented in `frontend/src/api/client.js` and rely on ESLint, frontend behavior checks, and the production build.

## How to run now

Install backend dependencies with `python -m pip install -r requirements.txt` and frontend dependencies with `cd frontend && npm install`. Run the API locally with `uvicorn backend.app.main:app --reload`, then run Vite in another terminal with `cd frontend && npm run dev`. Generate analytics with `python -m backend.analytics.analytics`. Run backend tests with `python -m pytest backend/tests -q`, Python lint with `ruff check backend api`, and frontend lint/build with `cd frontend && npm run lint` and `npm run build`.

## Env needed

No environment variables are required for local startup. Vercel deployment requires an authenticated Vercel project. Public repo creation, unlisted video upload, and form submission remain external deliverables.
