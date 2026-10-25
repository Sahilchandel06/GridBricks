from datetime import UTC, date, datetime, time
from zoneinfo import ZoneInfo

import pytest

from backend.analytics.analytics import (
    add_uncertainty_band,
    aggregate_actuals_hourly,
    build_accuracy_report,
    error_histogram,
    local_cutoff_utc,
    select_decision_rows,
    summarize_errors,
)


def test_default_cutoff_is_0900_london_on_previous_day():
    assert local_cutoff_utc(date(2026, 1, 15)) == datetime(2026, 1, 14, 9, tzinfo=ZoneInfo("Europe/London")).astimezone(UTC)


def test_cutoff_handles_summer_offset_and_ambiguous_fall_time():
    assert local_cutoff_utc(date(2026, 7, 2), time(9)) == datetime(2026, 7, 1, 8, tzinfo=UTC)
    # The repeated 01:30 chooses the later, GMT occurrence.
    assert local_cutoff_utc(date(2026, 10, 26), time(1, 30)) == datetime(2026, 10, 25, 1, 30, tzinfo=UTC)


def test_nonexistent_cutoff_time_is_rejected():
    with pytest.raises(ValueError, match="does not exist"):
        local_cutoff_utc(date(2026, 3, 30), time(1, 30))


def test_selects_latest_publication_at_or_before_cutoff_and_keeps_missing():
    actuals = [
        {"startTime": "2026-01-01T00:00:00Z", "generation": 100},
        {"startTime": "2026-01-01T00:30:00Z", "generation": 120},
    ]
    forecasts = [
        {"startTime": "2026-01-01T00:00:00Z", "publishTime": "2025-12-31T08:00:00Z", "generation": 90},
        {"startTime": "2026-01-01T00:00:00Z", "publishTime": "2025-12-31T09:00:00Z", "generation": 115},
        {"startTime": "2026-01-01T00:00:00Z", "publishTime": "2025-12-31T09:01:00Z", "generation": 999},
    ]
    rows = select_decision_rows(actuals, forecasts)
    first, second = rows[:2]
    assert first["forecast"] == 115
    assert first["publishTime"] == "2025-12-31T09:00:00Z"
    assert first["actual"] == 110
    assert first["horizonHours"] == 15
    assert second["forecast"] is None
    assert second["actual"] is None


def test_actual_hour_alignment_requires_both_half_hours():
    rows = [
        {"startTime": "2026-01-01T00:00:00Z", "generation": 100},
        {"startTime": "2026-01-01T00:30:00Z", "generation": 120},
        {"startTime": "2026-01-01T01:00:00Z", "generation": 80},
    ]
    hourly, report = aggregate_actuals_hourly(rows)
    assert hourly == {datetime(2026, 1, 1, tzinfo=UTC): 110}
    assert report["incomplete_hours"] == 1


def test_metrics_guard_mape_and_compute_quantiles():
    rows = [
        {"forecast": 110, "actual": 100},
        {"forecast": 40, "actual": 50},
        {"forecast": 20, "actual": 0},
    ]
    result = summarize_errors(rows, mape_min_actual_mw=50)
    assert result["mae"] == pytest.approx(40 / 3)
    assert result["rmse"] == pytest.approx(200**0.5)
    assert result["bias"] == pytest.approx(20 / 3)
    assert result["mapeIncluded"] == 1
    assert result["mapeExcludedNearZero"] == 2
    assert result["p50AbsoluteError"] == 10
    assert result["p90AbsoluteError"] == 18
    assert result["recommendedBufferMw"] == result["p90AbsoluteError"]


def test_all_missing_rows_return_null_metrics_and_band():
    rows = [{"forecast": None, "actual": 50}]
    result = summarize_errors(rows)
    assert result["expected"] == 1
    assert result["missing"] == 1
    assert result["mae"] is None
    assert add_uncertainty_band(rows, None, None)[0]["bandLow"] is None
    assert error_histogram(rows) == []


def test_report_includes_all_breakdowns_bands_and_only_january_targets():
    actuals = []
    forecasts = []
    for hour in range(24):
        start = f"2026-01-01T{hour:02d}:00:00Z"
        actuals.extend([
            {"startTime": start, "generation": 1000 + hour * 10},
            {"startTime": f"2026-01-01T{hour:02d}:30:00Z", "generation": 1020 + hour * 10},
        ])
        forecasts.append({"startTime": start, "publishTime": "2025-12-31T08:30:00Z", "generation": 1100 + hour * 10})
    report = build_accuracy_report(actuals, forecasts)
    assert report["summary"]["expected"] == 744
    assert report["summary"]["matched"] == 24
    assert report["summary"]["missing"] == 720
    assert len(report["byHour"]) == 24
    assert [row["windLevel"] for row in report["byWindLevel"]] == ["low", "mid", "high"]
    assert report["windLevelThresholdsMw"]["lowUpperMw"] is not None
    assert report["decisionRows"][0]["bandLow"] is not None
    assert report["decisionRows"][-1]["deliveryDate"] == "2026-01-31"
