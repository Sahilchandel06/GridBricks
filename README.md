# GridBricks

A day-ahead wind decision workspace for a UK utility. It shows the forecast available at a selected D-1 cutoff and evaluates that forecast against national Elexon BMRS wind actuals for January 2026.

## What it includes

- Decision view with hourly forecast and actual generation, empirical error band, publication time, and coverage.
- Accuracy view with MAE, RMSE, bias, MAPE, error distribution, and horizon/hour/wind-level breakdowns.
- Method and source notes covering data alignment, error definitions, and limits.
- FastAPI routes backed by the committed January source archive; the application does not call Elexon at request time.
- Responsive React/Vite/TypeScript frontend and dark/light themes.

## Start with Docker

Requires Docker Desktop with Compose. From the repository root:

```powershell
docker compose up --build
```

Open <http://localhost:8000>. The API is at `/api`; interactive docs are at <http://localhost:8000/api/docs>. Stop with `Ctrl+C` or run `docker compose down`.

The image builds the frontend assets, installs the Python API, and serves both from the FastAPI application.

## Start without Docker

Install Python requirements with `python -m pip install -r requirements.txt` and frontend requirements with `cd frontend && npm ci`.

Run these in separate terminals from the repository root:

```powershell
python -m uvicorn backend.app.main:app --reload
```

```powershell
cd frontend
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api` to the local FastAPI server on port 8000.

## Checks

```powershell
python -m pytest backend/tests -q
ruff check backend api
cd frontend
npm run lint
npm run build
```

## Repository map

| Path | Purpose |
| --- | --- |
| `api/` | Vercel FastAPI entry point |
| `backend/app/` | API routes, response models, and app setup |
| `backend/analytics/` | Decision-time forecast selection and accuracy calculations |
| `backend/ingest/` | Elexon ingestion and normalization |
| `backend/tests/` | Analytics, API, and ingestion tests |
| `data/` | Committed January 2026 actuals, forecast issues, quality report, and analytics |
| `frontend/src/api/` | Typed API client and response contracts |
| `frontend/src/components/` | App shell and reusable UI components |
| `frontend/src/pages/` | Decision, accuracy, method, and chart views |
| `docs/` | Assignment transcription, design notes, progress, and screenshots |
| `Dockerfile` / `docker-compose.yml` | Combined local Docker build and startup |
| `vercel.json` | Vercel build settings and required function data files |

## Data and limitations

Actual FUELHH half-hours are averaged in pairs to align with hourly WINDFOR target times. For each hour, the latest issue published at or before the previous day's Europe/London cutoff is selected. Forecast error is `forecast - actual`; positive bias means over-forecasting. MAPE excludes actual output at or below 100 MW. January results and the P90 buffer are historical references, not a demand or market-cost model.

The official Elexon sources are [FUELHH](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream) and [WINDFOR](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream).

## Deployment

The project is configured for Vercel with a Vite build and FastAPI Python function. **Live app:** pending deployment. Deploy from the repository root with `vercel --prod` after connecting the project to a Vercel account.

## AI assistance

OpenAI Codex was used to assist with planning, implementation, documentation, and UI review. The calculations and product scope are recorded in `docs/DECISIONS.md` and `docs/CONTEXT.md`.
