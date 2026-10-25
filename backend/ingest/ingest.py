"""Fetch and normalise the January 2026 Elexon wind data."""

from __future__ import annotations

import argparse
import json
import math
import sys
import time
from collections import Counter
from collections.abc import Callable, Iterable
from datetime import UTC as DATETIME_UTC
from datetime import date, datetime, timedelta
from datetime import time as dt_time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

UTC = DATETIME_UTC
API_ROOT = "https://data.elexon.co.uk/bmrs/api/v1"
DATA_DIR = Path(__file__).resolve().parents[2] / "data"
DELIVERY_START = date(2026, 1, 1)
DELIVERY_END = date(2026, 2, 1)
# Forecasts are retrieved from a month before delivery starts so the first
# January decision day can use the last published issue before its cutoff.
FORECAST_PUBLISH_START = date(2025, 12, 1)
FORECAST_PUBLISH_END = date(2026, 1, 31)


class IngestionError(RuntimeError):
    """Raised when Elexon returns data that cannot be safely ingested."""


def parse_utc(value: str) -> datetime:
    """Parse an ISO timestamp with an explicit UTC offset and return UTC."""
    if not isinstance(value, str):
        raise TypeError("timestamp must be a string")
    candidate = value[:-1] + "+00:00" if value.endswith("Z") else value
    parsed = datetime.fromisoformat(candidate)
    if parsed.tzinfo is None:
        raise ValueError(f"timestamp has no UTC offset: {value!r}")
    return parsed.astimezone(UTC)


def iso_utc(value: datetime) -> str:
    value = value.astimezone(UTC)
    return value.isoformat(timespec="auto").replace("+00:00", "Z")


def _fetch_json(url: str, retries: int = 4, timeout: int = 45) -> Any:
    """GET JSON with bounded exponential retry for transient failures."""
    headers = {"Accept": "application/json", "User-Agent": "gridbricks-wind-challenge/1.0"}
    for attempt in range(retries):
        try:
            request = Request(url, headers=headers)
            with urlopen(request, timeout=timeout) as response:
                return json.loads(response.read())
        except HTTPError as exc:
            if exc.code < 500 and exc.code != 429:
                raise IngestionError(f"Elexon returned HTTP {exc.code} for {url}") from exc
            if attempt == retries - 1:
                raise IngestionError(f"Elexon returned HTTP {exc.code} after {retries} attempts") from exc
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            if attempt == retries - 1:
                raise IngestionError(f"Elexon request failed after {retries} attempts: {exc}") from exc
        time.sleep(min(2**attempt, 8))
    raise AssertionError("unreachable")


def fetch_json(url: str, retries: int = 4, timeout: int = 45) -> Any:
    """Public wrapper so request behavior can be replaced in tests."""
    return _fetch_json(url, retries=retries, timeout=timeout)


def _array_response(payload: Any, dataset: str) -> list[dict[str, Any]]:
    if not isinstance(payload, list) or any(not isinstance(row, dict) for row in payload):
        raise IngestionError(f"Unexpected {dataset} response: expected a JSON array of objects")
    return payload


def fetch_actuals(
    request: Callable[[str], Any] = fetch_json, pause_seconds: float = 0.1
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    day = DELIVERY_START
    while day < DELIVERY_END:
        query = urlencode({
            "settlementDateFrom": day.isoformat(),
            "settlementDateTo": day.isoformat(),
            "fuelType": "WIND",
        })
        payload = request(f"{API_ROOT}/datasets/FUELHH/stream?{query}")
        rows.extend(_array_response(payload, "FUELHH"))
        day += timedelta(days=1)
        if pause_seconds:
            time.sleep(pause_seconds)
    return rows


def fetch_forecasts(
    request: Callable[[str], Any] = fetch_json, pause_seconds: float = 0.1
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    day = FORECAST_PUBLISH_START
    while day < FORECAST_PUBLISH_END:
        next_day = day + timedelta(days=1)
        query = urlencode({
            "publishDateTimeFrom": iso_utc(datetime.combine(day, dt_time.min, UTC)),
            "publishDateTimeTo": iso_utc(datetime.combine(next_day, dt_time.min, UTC)),
        })
        payload = request(f"{API_ROOT}/datasets/WINDFOR/stream?{query}")
        rows.extend(_array_response(payload, "WINDFOR"))
        day = next_day
        if pause_seconds:
            time.sleep(pause_seconds)
    return rows


def _number(value: Any, field: str) -> float | int:
    if isinstance(value, bool):
        raise TypeError(f"{field} must be numeric")
    number = float(value)
    if not math.isfinite(number):
        raise ValueError(f"{field} must be finite")
    return int(number) if number.is_integer() else number


def clean_actuals(rows: Iterable[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, int]]:
    accepted: dict[str, dict[str, Any]] = {}
    counters: Counter[str] = Counter()
    for row in rows:
        if row.get("fuelType") != "WIND":
            counters["non_wind_rows"] += 1
            continue
        try:
            start = parse_utc(row["startTime"])
            if not (datetime(2026, 1, 1, tzinfo=UTC) <= start < datetime(2026, 2, 1, tzinfo=UTC)):
                counters["out_of_window_rows"] += 1
                continue
            cleaned = {
                "startTime": iso_utc(start),
                "generation": _number(row["generation"], "generation"),
            }
            if "publishTime" in row:
                cleaned["publishTime"] = iso_utc(parse_utc(row["publishTime"]))
        except (KeyError, TypeError, ValueError):
            counters["invalid_rows"] += 1
            continue
        key = cleaned["startTime"]
        if key in accepted:
            counters["duplicate_rows"] += 1
            old_publish = accepted[key].get("publishTime", "")
            new_publish = cleaned.get("publishTime", "")
            if new_publish >= old_publish:
                accepted[key] = cleaned
        else:
            accepted[key] = cleaned
    result = sorted(accepted.values(), key=lambda item: item["startTime"])
    counters["accepted_rows"] = len(result)
    return result, dict(counters)


def clean_forecasts(rows: Iterable[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, int]]:
    accepted: dict[tuple[str, str], dict[str, Any]] = {}
    counters: Counter[str] = Counter()
    start_bound = datetime(2026, 1, 1, tzinfo=UTC)
    end_bound = datetime(2026, 2, 1, tzinfo=UTC)
    for row in rows:
        try:
            start = parse_utc(row["startTime"])
            published = parse_utc(row["publishTime"])
            if not start_bound <= start < end_bound:
                counters["out_of_window_rows"] += 1
                continue
            cleaned = {
                "startTime": iso_utc(start),
                "publishTime": iso_utc(published),
                "generation": _number(row["generation"], "generation"),
            }
        except (KeyError, TypeError, ValueError):
            counters["invalid_rows"] += 1
            continue
        key = (cleaned["startTime"], cleaned["publishTime"])
        if key in accepted:
            counters["duplicate_rows"] += 1
        accepted[key] = cleaned
    result = sorted(accepted.values(), key=lambda item: (item["startTime"], item["publishTime"]))
    counters["accepted_rows"] = len(result)
    return result, dict(counters)


def _expected_instants(start: datetime, end: datetime, minutes: int) -> set[str]:
    values: set[str] = set()
    current = start
    while current < end:
        values.add(iso_utc(current))
        current += timedelta(minutes=minutes)
    return values


def build_quality_report(
    actuals: list[dict[str, Any]],
    forecasts: list[dict[str, Any]],
    actual_counts: dict[str, int],
    forecast_counts: dict[str, int],
) -> dict[str, Any]:
    start = datetime(2026, 1, 1, tzinfo=UTC)
    end = datetime(2026, 2, 1, tzinfo=UTC)
    expected_actuals = _expected_instants(start, end, 30)
    expected_forecast_hours = _expected_instants(start, end, 60)
    actual_times = {row["startTime"] for row in actuals}
    forecast_times = {row["startTime"] for row in forecasts}
    missing_actuals = sorted(expected_actuals - actual_times)
    missing_forecast_hours = sorted(expected_forecast_hours - forecast_times)
    return {
        "delivery_window_utc": {"from": iso_utc(start), "to_exclusive": iso_utc(end)},
        "source_resolution": {"FUELHH_minutes": 30, "WINDFOR_minutes_observed": 60},
        "actuals": {
            "rows": len(actuals),
            "expected_half_hours": len(expected_actuals),
            "missing_half_hours": len(missing_actuals),
            "missing_start_times_utc": missing_actuals,
            **actual_counts,
        },
        "forecasts": {
            "rows": len(forecasts),
            "expected_target_hours": len(expected_forecast_hours),
            "covered_target_hours": len(expected_forecast_hours - set(missing_forecast_hours)),
            "target_hours_without_any_forecast": len(missing_forecast_hours),
            "target_times_without_forecast_utc": missing_forecast_hours,
            "publication_window_utc": {
                "from": iso_utc(datetime.combine(FORECAST_PUBLISH_START, dt_time.min, UTC)),
                "to_exclusive": iso_utc(datetime.combine(FORECAST_PUBLISH_END, dt_time.min, UTC)),
            },
            **forecast_counts,
        },
        "notes": [
            "Actual and forecast timestamps are stored in UTC.",
            "FUELHH is half-hourly; WINDFOR startTime values observed in the live API are hourly.",
            "Forecast coverage counts target hours with at least one forecast version; it does not measure decision-time availability.",
            "No resampling is performed during ingestion.",
        ],
    }


def save_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")


def run(output_dir: Path = DATA_DIR, request: Callable[[str], Any] = fetch_json) -> dict[str, Any]:
    raw_actuals = fetch_actuals(request)
    raw_forecasts = fetch_forecasts(request)
    actuals, actual_counts = clean_actuals(raw_actuals)
    forecasts, forecast_counts = clean_forecasts(raw_forecasts)
    report = build_quality_report(actuals, forecasts, actual_counts, forecast_counts)
    save_json(output_dir / "actuals.json", actuals)
    save_json(output_dir / "forecasts.json", forecasts)
    save_json(output_dir / "data-quality.json", report)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=DATA_DIR)
    args = parser.parse_args()
    try:
        report = run(args.output_dir)
    except IngestionError as exc:
        print(f"Ingestion failed: {exc}", file=sys.stderr)
        return 1
    print(json.dumps({
        "actual_rows": report["actuals"]["rows"],
        "actual_missing_half_hours": report["actuals"]["missing_half_hours"],
        "forecast_rows": report["forecasts"]["rows"],
        "forecast_uncovered_target_hours": report["forecasts"]["target_hours_without_any_forecast"],
        "report": str(args.output_dir / "data-quality.json"),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
