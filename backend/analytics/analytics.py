"""Decision-time forecast selection and forecast accuracy analytics."""

from __future__ import annotations

import json
import math
from collections import defaultdict
from collections.abc import Iterable
from datetime import UTC, date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from backend.ingest.ingest import iso_utc, parse_utc

LONDON = ZoneInfo("Europe/London")
DEFAULT_CUTOFF = time(9, 0)
DELIVERY_START = date(2026, 1, 1)
DELIVERY_END = date(2026, 2, 1)
MAPE_MIN_ACTUAL_MW = 100.0
HORIZON_BUCKETS = (
    (0.0, 6.0, "0–6h"),
    (6.0, 12.0, "6–12h"),
    (12.0, 24.0, "12–24h"),
    (24.0, 48.0, "24–48h"),
    (48.0, math.inf, "48h+"),
)


def _valid_local_instants(local_naive: datetime, zone: ZoneInfo) -> list[datetime]:
    """Return the valid UTC instant(s) for a local wall time."""
    instants: dict[datetime, datetime] = {}
    for fold in (0, 1):
        local = local_naive.replace(tzinfo=zone, fold=fold)
        utc_value = local.astimezone(UTC)
        round_trip = utc_value.astimezone(zone)
        if round_trip.replace(tzinfo=None) == local_naive:
            instants[utc_value] = utc_value
    return sorted(instants.values())


def local_cutoff_utc(
    delivery_day: date,
    cutoff: time = DEFAULT_CUTOFF,
    zone: ZoneInfo = LONDON,
) -> datetime:
    """Get the D-1 local cutoff as UTC; ambiguous times use their later occurrence."""
    if cutoff.tzinfo is not None:
        raise ValueError("cutoff must be a local wall-clock time without timezone")
    decision_day = delivery_day - timedelta(days=1)
    local_naive = datetime.combine(decision_day, cutoff)
    candidates = _valid_local_instants(local_naive, zone)
    if not candidates:
        raise ValueError(f"cutoff {local_naive.isoformat()} does not exist in {zone.key}")
    return candidates[-1]


def _local_day_bounds_utc(day: date, zone: ZoneInfo) -> tuple[datetime, datetime]:
    start_local = datetime.combine(day, time.min)
    next_local = datetime.combine(day + timedelta(days=1), time.min)
    starts = _valid_local_instants(start_local, zone)
    ends = _valid_local_instants(next_local, zone)
    if not starts or not ends:
        raise ValueError(f"could not resolve local day boundaries for {day}")
    return starts[0], ends[0]


def _january_days() -> Iterable[date]:
    day = DELIVERY_START
    while day < DELIVERY_END:
        yield day
        day += timedelta(days=1)


def aggregate_actuals_hourly(
    actual_rows: Iterable[dict],
) -> tuple[dict[datetime, float], dict[str, int]]:
    """Average each complete pair of FUELHH half-hour MW values into one UTC hour."""
    grouped: dict[datetime, dict[int, float]] = defaultdict(dict)
    invalid = 0
    out_of_window = 0
    for row in actual_rows:
        try:
            start = parse_utc(row["startTime"])
            if not datetime(2026, 1, 1, tzinfo=UTC) <= start < datetime(2026, 2, 1, tzinfo=UTC):
                out_of_window += 1
                continue
            generation = float(row["generation"])
            if not math.isfinite(generation):
                raise ValueError("generation is not finite")
            if start.minute not in (0, 30) or start.second or start.microsecond:
                raise ValueError("FUELHH startTime is not aligned to a half-hour")
            hour = start.replace(minute=0)
            grouped[hour][start.minute] = generation
        except (KeyError, TypeError, ValueError):
            invalid += 1

    hourly: dict[datetime, float] = {}
    incomplete_hours = 0
    for hour, half_hours in grouped.items():
        if set(half_hours) == {0, 30}:
            hourly[hour] = (half_hours[0] + half_hours[30]) / 2
        else:
            incomplete_hours += 1
    return hourly, {
        "input_rows": sum(len(values) for values in grouped.values()) + invalid + out_of_window,
        "invalid_rows": invalid,
        "out_of_window_rows": out_of_window,
        "incomplete_hours": incomplete_hours,
        "hourly_actuals": len(hourly),
    }


def _forecast_index(forecast_rows: Iterable[dict]) -> dict[datetime, list[dict]]:
    index: dict[datetime, list[dict]] = defaultdict(list)
    for row in forecast_rows:
        try:
            start = parse_utc(row["startTime"])
            published = parse_utc(row["publishTime"])
            generation = float(row["generation"])
            if math.isfinite(generation):
                index[start].append({
                    "publishTime": published,
                    "generation": generation,
                })
        except (KeyError, TypeError, ValueError):
            continue
    for versions in index.values():
        versions.sort(key=lambda item: item["publishTime"])
    return index


def select_decision_rows(
    actual_rows: Iterable[dict],
    forecast_rows: Iterable[dict],
    cutoff: time = DEFAULT_CUTOFF,
    zone: ZoneInfo = LONDON,
) -> list[dict]:
    """Select the latest eligible forecast per January delivery hour, retaining gaps."""
    actual_by_hour, _ = aggregate_actuals_hourly(actual_rows)
    forecasts_by_hour = _forecast_index(forecast_rows)
    selected: list[dict] = []
    for day in _january_days():
        decision_cutoff = local_cutoff_utc(day, cutoff, zone)
        start_utc, end_utc = _local_day_bounds_utc(day, zone)
        target = start_utc
        while target < end_utc:
            eligible = [
                version for version in forecasts_by_hour.get(target, ())
                if version["publishTime"] <= decision_cutoff
            ]
            chosen = eligible[-1] if eligible else None
            selected.append({
                "deliveryDate": day.isoformat(),
                "startTime": iso_utc(target),
                "decisionCutoff": iso_utc(decision_cutoff),
                "publishTime": iso_utc(chosen["publishTime"]) if chosen else None,
                "forecast": chosen["generation"] if chosen else None,
                "actual": actual_by_hour.get(target),
                "horizonHours": (
                    (target - chosen["publishTime"]).total_seconds() / 3600
                    if chosen else None
                ),
            })
            target += timedelta(hours=1)
    return selected


def quantile(values: Iterable[float], probability: float) -> float | None:
    """Linear-interpolated empirical quantile, matching the common type-7 definition."""
    if not 0 <= probability <= 1:
        raise ValueError("probability must be between 0 and 1")
    ordered = sorted(float(value) for value in values)
    if not ordered:
        return None
    position = (len(ordered) - 1) * probability
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    fraction = position - lower
    return ordered[lower] * (1 - fraction) + ordered[upper] * fraction


def _complete_rows(rows: Iterable[dict]) -> list[dict]:
    return [row for row in rows if row.get("forecast") is not None and row.get("actual") is not None]


def summarize_errors(
    rows: Iterable[dict],
    mape_min_actual_mw: float = MAPE_MIN_ACTUAL_MW,
) -> dict:
    """Calculate error metrics over rows with both actual and forecast values."""
    all_rows = list(rows)
    complete = _complete_rows(all_rows)
    if not complete:
        return {
            "expected": len(all_rows), "matched": 0, "missing": len(all_rows),
            "mae": None, "rmse": None, "bias": None, "mapePercent": None,
            "mapeIncluded": 0, "mapeExcludedNearZero": 0,
            "normalizedMae": None, "meanActual": None,
            "p50AbsoluteError": None, "p90AbsoluteError": None,
            "errorP10": None, "errorP90": None,
            "recommendedBufferMw": None,
        }
    errors = [float(row["forecast"]) - float(row["actual"]) for row in complete]
    absolute_errors = [abs(error) for error in errors]
    actuals = [float(row["actual"]) for row in complete]
    mae = sum(absolute_errors) / len(absolute_errors)
    mean_actual = sum(actuals) / len(actuals)
    mape_pairs = [
        (absolute, actual) for absolute, actual in zip(absolute_errors, actuals)
        if abs(actual) > mape_min_actual_mw
    ]
    return {
        "expected": len(all_rows),
        "matched": len(complete),
        "missing": len(all_rows) - len(complete),
        "mae": mae,
        "rmse": math.sqrt(sum(error * error for error in errors) / len(errors)),
        "bias": sum(errors) / len(errors),
        "mapePercent": (
            sum(absolute / abs(actual) for absolute, actual in mape_pairs)
            / len(mape_pairs) * 100
            if mape_pairs else None
        ),
        "mapeIncluded": len(mape_pairs),
        "mapeExcludedNearZero": len(complete) - len(mape_pairs),
        "mapeThresholdMw": mape_min_actual_mw,
        "normalizedMae": mae / mean_actual if mean_actual > 0 else None,
        "meanActual": mean_actual,
        "p50AbsoluteError": quantile(absolute_errors, 0.5),
        "p90AbsoluteError": quantile(absolute_errors, 0.9),
        "errorP10": quantile(errors, 0.1),
        "errorP90": quantile(errors, 0.9),
        "recommendedBufferMw": quantile(absolute_errors, 0.9),
    }


def add_uncertainty_band(rows: Iterable[dict], error_p10: float | None, error_p90: float | None) -> list[dict]:
    """Add an empirical 80% interval for actual generation around each forecast."""
    result = []
    for row in rows:
        enriched = dict(row)
        if row.get("forecast") is not None and error_p10 is not None and error_p90 is not None:
            # Error = forecast - actual, therefore actual = forecast - error.
            enriched["bandLow"] = row["forecast"] - error_p90
            enriched["bandHigh"] = row["forecast"] - error_p10
        else:
            enriched["bandLow"] = None
            enriched["bandHigh"] = None
        result.append(enriched)
    return result


def _group_summaries(rows: list[dict], key_fn, label_name: str) -> list[dict]:
    groups: dict[str, list[dict]] = defaultdict(list)
    for row in _complete_rows(rows):
        label = key_fn(row)
        if label is not None:
            groups[str(label)].append(row)
    ordered_labels = {
        "0–6h": 0, "6–12h": 1, "12–24h": 2, "24–48h": 3, "48h+": 4,
        "low": 0, "mid": 1, "high": 2,
    }
    return [
        {label_name: label, **summarize_errors(group)}
        for label, group in sorted(groups.items(), key=lambda item: (ordered_labels.get(item[0], 99), item[0]))
    ]


def _horizon_label(value: float | None) -> str | None:
    if value is None or value < 0:
        return None
    for lower, upper, label in HORIZON_BUCKETS:
        if lower <= value < upper:
            return label
    return "48h+"


def _hour_label(row: dict, zone: ZoneInfo) -> str:
    return parse_utc(row["startTime"]).astimezone(zone).strftime("%H:00")


def _wind_level_groups(rows: list[dict]) -> tuple[list[dict], dict]:
    complete = _complete_rows(rows)
    actuals = [float(row["actual"]) for row in complete]
    lower = quantile(actuals, 1 / 3)
    upper = quantile(actuals, 2 / 3)
    if lower is None or upper is None:
        return [], {"lowUpperMw": lower, "midUpperMw": upper}

    def bucket(row: dict) -> str:
        actual = float(row["actual"])
        if actual <= lower:
            return "low"
        if actual <= upper:
            return "mid"
        return "high"

    groups = _group_summaries(complete, bucket, "windLevel")
    return groups, {"lowUpperMw": lower, "midUpperMw": upper}


def error_histogram(rows: Iterable[dict], bins: int = 20) -> list[dict]:
    complete = _complete_rows(rows)
    errors = [float(row["forecast"]) - float(row["actual"]) for row in complete]
    if not errors:
        return []
    minimum, maximum = min(errors), max(errors)
    if minimum == maximum:
        return [{"fromMw": minimum, "toMw": maximum, "count": len(errors)}]
    width = (maximum - minimum) / bins
    counts = [0] * bins
    for error in errors:
        index = min(int((error - minimum) / width), bins - 1)
        counts[index] += 1
    return [
        {
            "fromMw": minimum + index * width,
            "toMw": minimum + (index + 1) * width,
            "count": count,
        }
        for index, count in enumerate(counts)
    ]


def build_accuracy_report(
    actual_rows: Iterable[dict],
    forecast_rows: Iterable[dict],
    cutoff: time = DEFAULT_CUTOFF,
    zone: ZoneInfo = LONDON,
) -> dict:
    decisions = select_decision_rows(actual_rows, forecast_rows, cutoff, zone)
    summary = summarize_errors(decisions)
    enriched_decisions = add_uncertainty_band(decisions, summary["errorP10"], summary["errorP90"])
    complete = _complete_rows(decisions)
    wind_groups, wind_thresholds = _wind_level_groups(complete)
    return {
        "timezone": zone.key,
        "cutoffLocal": cutoff.strftime("%H:%M"),
        "deliveryWindow": {"from": DELIVERY_START.isoformat(), "toExclusive": DELIVERY_END.isoformat()},
        "alignment": {
            "forecastResolutionMinutes": 60,
            "actualResolutionMinutes": 30,
            "method": "For each UTC forecast hour, arithmetic-mean its two FUELHH half-hour average-MW values; hours missing either value are excluded from matched metrics.",
        },
        "errorDefinition": "forecast - actual (MW); positive means overforecast, negative means underforecast.",
        "method": {
            "forecastSelection": "For each delivery hour, select the forecast with the latest publishTime at or before the local D-1 cutoff.",
            "mapeGuard": f"Exclude actual generation with absolute value at or below {MAPE_MIN_ACTUAL_MW:g} MW.",
            "windLevelBuckets": "Terciles of matched actual generation across the January decision sample.",
            "uncertaintyBand": "Empirical central 80% interval for actual generation: forecast minus P90(error) to forecast minus P10(error).",
            "recommendedBuffer": "P90 of absolute forecast error across matched January decision hours.",
            "quantiles": "Linear interpolation between sorted observed values (type 7).",
        },
        "limitations": [
            "WINDFOR is hourly; actuals are aligned by averaging pairs of half-hourly FUELHH values.",
            "Uncertainty and buffer estimates use one January 2026 sample and may not generalize to other seasons or market conditions.",
            "Missing actual or cutoff-eligible forecast values are retained as gaps and excluded from metrics; no imputation is performed.",
            "The recommended buffer is a historical absolute-error quantile and does not model demand, prices, or the costs of over- and under-procurement.",
        ],
        "summary": summary,
        "byHorizon": _group_summaries(decisions, lambda row: _horizon_label(row.get("horizonHours")), "horizon"),
        "byHour": _group_summaries(decisions, lambda row: _hour_label(row, zone), "hour"),
        "byWindLevel": wind_groups,
        "windLevelThresholdsMw": wind_thresholds,
        "errorDistribution": error_histogram(decisions),
        "decisionRows": enriched_decisions,
    }


def load_source_data(data_dir: Path) -> tuple[list[dict], list[dict]]:
    actuals = json.loads((data_dir / "actuals.json").read_text(encoding="utf-8"))
    forecasts = json.loads((data_dir / "forecasts.json").read_text(encoding="utf-8"))
    if not isinstance(actuals, list) or not isinstance(forecasts, list):
        raise TypeError("source data files must contain JSON arrays")
    return actuals, forecasts


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    actuals, forecasts = load_source_data(root / "data")
    report = build_accuracy_report(actuals, forecasts)
    output = root / "data" / "analytics.json"
    output.write_text(json.dumps(report, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    summary = report["summary"]
    print(json.dumps({
        "cutoff": f"D-1 {report['cutoffLocal']} {report['timezone']}",
        "expected_hours": summary["expected"],
        "matched_hours": summary["matched"],
        "missing_hours": summary["missing"],
        "mae_mw": summary["mae"],
        "rmse_mw": summary["rmse"],
        "bias_mw": summary["bias"],
        "p90_absolute_error_mw": summary["p90AbsoluteError"],
        "output": str(output),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
