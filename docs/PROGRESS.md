# Progress

Last updated: 2026-10-25

## Requirement checklist

| PDF requirement or deliverable | Phase | Status |
| --- | --- | --- |
| Product context: UK utility buying in the day-ahead market; decisions made one day before delivery | P0 | Pending implementation |
| Show latest renewable forecast available when buying decisions are made | P2–P5 | Pending |
| Quantitatively evaluate renewable forecast accuracy to inform decisions | P2, P4–P6 | Pending |
| National-level wind actuals and forecasts from Elexon alone | P0–P2 | Pending |
| FUELHH actuals filtered to `fuelType == WIND`, with `startTime` and `generation` | P0–P1 | Pass: 1,488 rows, no half-hour gaps |
| WINDFOR forecasts using `startTime`, `publishTime`, and `generation` | P0–P1 | Pass: 17,864 rows, 744 target hours covered |
| Only data relevant to January 2026 purchase decisions | P0–P2 | Pass: retained target times restricted to Jan 2026 |
| React frontend and Python backend | P0, P3–P6 | Pending |
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

## In progress

- No phase is currently in progress.

## Next (ordered)

1. Implement P2 analytics with strict cutoff selection and tests for gaps and timezones.
2. Align hourly WINDFOR with half-hour FUELHH explicitly for accuracy analysis.
3. Address neutral-identity phase commits when repository metadata is writable.

## Known issues

- The prompt's richer feature list and visual specifications exceed the official PDF; resolve scope in favor of the PDF where they conflict.
- P1 reports whether any forecast exists for each target hour, but does not assess whether a forecast version was available at each decision cutoff; P2 must measure that.
- WINDFOR timestamps are hourly while FUELHH timestamps are half-hourly; P2 must state and test how to align them for comparison.
- Deployment, public repo creation, YouTube upload, and form submission are external deliverables.
- No feature code exists yet.

## How to run now

Run the ingestion script with `python -m backend.ingest.ingest`. Run ingestion tests with `python -m pytest backend/tests -q`.

## Env needed

No environment variables are required. Public deployment will later require hosting and GitHub credentials, and a YouTube account for the required video deliverable.
