from datetime import UTC, datetime
from io import BytesIO
from urllib.error import URLError
from urllib.parse import parse_qs, urlparse

import pytest

import backend.ingest.ingest as ingestion
from backend.ingest.ingest import (
    build_quality_report,
    clean_actuals,
    clean_forecasts,
    fetch_actuals,
    fetch_forecasts,
    parse_utc,
)


def test_parse_utc_normalizes_offsets():
    assert parse_utc("2026-01-01T01:00:00+01:00") == datetime(2026, 1, 1, tzinfo=UTC)


def test_parse_utc_requires_timezone():
    with pytest.raises(ValueError, match="no UTC offset"):
        parse_utc("2026-01-01T00:00:00")


def test_actuals_filter_wind_normalize_dedupe_and_sort():
    rows = [
        {"fuelType": "WIND", "startTime": "2026-01-01T01:00:00+01:00", "generation": 12, "publishTime": "2026-01-01T01:30:00+01:00"},
        {"fuelType": "SOLAR", "startTime": "2026-01-01T00:00:00Z", "generation": 90},
        {"fuelType": "WIND", "startTime": "2026-01-01T00:00:00Z", "generation": 15, "publishTime": "2026-01-01T00:45:00Z"},
    ]
    cleaned, counts = clean_actuals(rows)
    assert cleaned == [{"startTime": "2026-01-01T00:00:00Z", "generation": 15, "publishTime": "2026-01-01T00:45:00Z"}]
    assert counts["non_wind_rows"] == 1
    assert counts["duplicate_rows"] == 1


def test_forecasts_retain_versions_but_drop_exact_duplicates_and_outside_window():
    row = {"startTime": "2026-01-01T00:00:00Z", "publishTime": "2025-12-31T08:30:00Z", "generation": 100}
    cleaned, counts = clean_forecasts([row, row, {**row, "publishTime": "2025-12-31T12:30:00Z", "generation": 120}, {**row, "startTime": "2026-02-01T00:00:00Z"}])
    assert len(cleaned) == 2
    assert cleaned[0]["publishTime"] < cleaned[1]["publishTime"]
    assert counts["duplicate_rows"] == 1
    assert counts["out_of_window_rows"] == 1


def test_quality_report_identifies_missing_data():
    actuals, actual_counts = clean_actuals([{"fuelType": "WIND", "startTime": "2026-01-01T00:00:00Z", "generation": 1}])
    forecasts, forecast_counts = clean_forecasts([{"startTime": "2026-01-01T00:00:00Z", "publishTime": "2025-12-31T08:30:00Z", "generation": 2}])
    report = build_quality_report(actuals, forecasts, actual_counts, forecast_counts)
    assert report["actuals"]["missing_half_hours"] == 1487
    assert report["forecasts"]["covered_target_hours"] == 1
    assert report["forecasts"]["target_hours_without_any_forecast"] == 743


def test_actual_fetch_chunks_by_delivery_date_and_requests_wind():
    urls = []

    def request(url):
        urls.append(url)
        return []

    assert fetch_actuals(request, pause_seconds=0) == []
    assert len(urls) == 31
    params = parse_qs(urlparse(urls[0]).query)
    assert params == {"settlementDateFrom": ["2026-01-01"], "settlementDateTo": ["2026-01-01"], "fuelType": ["WIND"]}


def test_forecast_fetch_chunks_by_publication_date():
    urls = []

    def request(url):
        urls.append(url)
        return []

    assert fetch_forecasts(request, pause_seconds=0) == []
    assert len(urls) == 61
    params = parse_qs(urlparse(urls[0]).query)
    assert params == {
        "publishDateTimeFrom": ["2025-12-01T00:00:00Z"],
        "publishDateTimeTo": ["2025-12-02T00:00:00Z"],
    }


def test_request_retries_transient_network_failure(monkeypatch):
    attempts = 0

    class Response(BytesIO):
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            self.close()

    def flaky_urlopen(_request, timeout):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise URLError("temporary failure")
        return Response(b"[]")

    monkeypatch.setattr(ingestion, "urlopen", flaky_urlopen)
    monkeypatch.setattr(ingestion.time, "sleep", lambda _delay: None)
    assert ingestion.fetch_json("https://example.test", retries=2) == []
    assert attempts == 2
