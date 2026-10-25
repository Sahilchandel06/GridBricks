# Decisions

- 2026-10-25 — Treat the supplied PDF as the binding scope because the prompt explicitly names it as ground truth; list the prompt’s added detail as proposed direction only.
- 2026-10-25 — Plan Vercel for public deployment with a static React build and Python serverless API, keeping Docker for local full-stack development; this fits the assignment’s allowed hosts and Vercel’s runtime model with the fewest deployment components.
- 2026-10-25 — Commit with a neutral, per-command author identity and an explicit repository safe-directory setting; avoid changing global git configuration. Repository writes may still require environment approval.
- 2026-10-25 — Fetch actuals by settlement date (`settlementDateFrom`/`settlementDateTo`) and forecast versions by publication-time day chunks (`publishDateTimeFrom`/`publishDateTimeTo`), then retain only January 2026 target times; these are the confirmed stream API filters.
- 2026-10-25 — Store actuals at their 30-minute FUELHH resolution and forecasts at the hourly WINDFOR resolution observed from the live API; ingestion must not invent half-hour forecast values.
- 2026-10-25 — Include WINDFOR publication data from 2025-12-01 through 2026-01-30 so the first delivery day has preceding forecast issues available for the later decision-time selection.
- 2026-10-25 — Align forecast and actuals at hourly resolution by averaging the corresponding two FUELHH half-hour MW values; require both readings and leave incomplete hours unmatched rather than imputing.
- 2026-10-25 — Resolve a repeated local cutoff time to its later UTC occurrence and reject nonexistent cutoff times during the spring DST jump.
- 2026-10-25 — Guard MAPE by excluding actual output at or below 100 MW; this fixed threshold is reported with the metrics.
- 2026-10-25 — Define the actual-generation uncertainty interval by inverting the P10/P90 quantiles of `forecast - actual` errors; define the recommended buffer as P90 absolute error for a transparent symmetric historical-error buffer.
- 2026-10-25 — Define low/mid/high wind levels by terciles of matched actual generation in the January sample and horizon groups as 0–6, 6–12, 12–24, 24–48, and 48+ hours.
