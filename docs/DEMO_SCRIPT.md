# Demo video script

Target runtime: about 8 minutes total. Keep Part 1 under 5 minutes and Part 2 under 5 minutes. The bracketed directions are on-screen cues, not narration.

## Part 1 — Customer overview (about 3:45)

**0:00–0:30 — Introduce the decision**  
[Show the Decision page.] This workspace helps a day-ahead buyer understand the national wind forecast available before delivery. The analysis is deliberately limited to Elexon BMRS wind data for January 2026. It does not include demand or electricity prices, so it does not claim to calculate the total amount of power to buy.

**0:30–1:10 — Set delivery and cutoff**  
[Choose 15 January 2026 and the 09:00 London cutoff.] The buyer works with a forecast issued before the decision deadline on the previous day. The page selects the latest eligible issue separately for each delivery hour and shows when the issue was published.

**1:10–2:00 — Read the daily profile**  
[Trace the cyan forecast, amber actual, and shaded error band.] This day’s forecast peaks at about 15.8 gigawatts and averages about 11.6 gigawatts. The orange line shows actual wind output for comparison. The shaded range summarizes historical forecast error; it is a planning reference, not a promise that actual output will fall inside it.

**2:00–2:40 — Connect the uncertainty to past performance**  
[Point to the publication details and recommended buffer.] The archive has 24 matched delivery hours for this day. The historical P90 absolute error is about 4.3 gigawatts. That reference gives the buyer a sense of forecast uncertainty, but does not include demand, market costs, or the utility’s risk preference.

**2:40–3:25 — Quantify accuracy**  
[Open Accuracy.] Across the month at the same cutoff, mean absolute error is about 2.14 gigawatts, RMSE about 2.61 gigawatts, and MAPE about 22.4 percent. The error distribution and the breakdowns show how performance varies by delivery hour, forecast lead time, and actual wind-output level.

**3:25–3:45 — Close**  
[Open Method & sources.] The screens make the forecast’s publication time and the historical error visible together. The next step for a real procurement workflow would be to combine this wind view with demand, prices, and the buyer’s operating policy.

## Part 2 — Technical review (about 4:10)

**0:00–0:35 — Architecture**  
[Show the project tree.] The React, TypeScript, and Tailwind client uses a typed API client and React Query. FastAPI serves the metadata, daily decision, and accuracy endpoints. The January source archive is committed with the project, so deployed requests do not depend on Elexon being available.

**0:35–1:20 — Ingestion and normalization**  
[Show `backend/ingest/ingest.py` and the data directory.] Actuals come from FUELHH with `fuelType` set to WIND. Forecast issues come from WINDFOR and retain their publication timestamps. The ingestion code normalizes timestamps, filters the January delivery window, deduplicates, and writes compact source and quality files.

**1:20–2:05 — Decision-time analysis**  
[Show `backend/analytics/analytics.py` and the Method page.] For each hour, the analysis selects the latest forecast published by the previous day’s Europe/London cutoff. It averages the two half-hour actual readings to align with the hourly forecast. Missing matches remain missing. Errors use forecast minus actual, so positive bias means over-forecasting.

**2:05–2:50 — API and client**  
[Show `/api/docs`, then the API client and page.] Pydantic response models define the response contracts. The API validates January dates and cutoff times, returns a shared error envelope, and caches derived reports in process. The client requests only the data for the current view and selected cutoff. The browser screenshots in `docs/screenshots/` record the desktop and mobile review.

**2:50–3:30 — Accuracy choices and limits**  
[Show the accuracy charts and definitions.] MAE, RMSE, bias, MAPE, normalized MAE, and absolute-error quantiles expose different aspects of forecast performance. MAPE skips actual generation at or below 100 MW. The P90 buffer is a symmetric empirical reference; it is not an optimized reserve or purchase recommendation. The sample is one month and contains no demand or price data.

**3:30–4:10 — Build and verification**  
[Show `Dockerfile`, `docker-compose.yml`, `vercel.json`, and `README.md`.] Docker builds the frontend assets and Python API into one local app. The Vercel configuration builds the Vite bundle and includes the JSON data files. Frontend lint and production build, 26 backend tests, Ruff, Docker health, API/static route smoke checks, and Playwright viewport captures passed. The repository discloses OpenAI Codex assistance in the README.

## Recording checklist

- Replace the deployment mention with the verified live URL after Vercel deployment.
- Record the browser at 1440×900 or similar, with no personal browser profile or credential details visible.
- Keep both sections under five minutes and the combined video under ten minutes.
- Upload as unlisted, then open the URL in a private/incognito window and confirm it plays before submission.
