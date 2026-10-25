"""FastAPI API over the committed January 2026 Elexon data."""

from __future__ import annotations

import json
import logging
import os
from datetime import date, time
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Any

from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.analytics.analytics import (
    DEFAULT_CUTOFF,
    LONDON,
    build_accuracy_report,
    local_cutoff_utc,
)
from backend.app.models import (
    AccuracySummaryResponse,
    BreakdownResponse,
    DecisionResponse,
    DistributionResponse,
    ErrorEnvelope,
    MetaResponse,
)
from backend.ingest.ingest import DELIVERY_END, DELIVERY_START, parse_utc

logger = logging.getLogger("gridbricks.api")
ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.environ.get("GRIDBRICKS_DATA_DIR", ROOT_DIR / "data"))
CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=600"
API_ERROR_RESPONSES = {
    422: {"model": ErrorEnvelope, "description": "Request validation failed."},
    500: {"model": ErrorEnvelope, "description": "Request could not be completed."},
}

app = FastAPI(
    title="GridBricks Wind Decision API",
    description="Decision-time UK wind forecast and accuracy data for January 2026.",
    version="1.0.0",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

origins = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["Accept", "Content-Type"],
)


@lru_cache(maxsize=1)
def _source_data() -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    actuals = json.loads((DATA_DIR / "actuals.json").read_text(encoding="utf-8"))
    forecasts = json.loads((DATA_DIR / "forecasts.json").read_text(encoding="utf-8"))
    quality = json.loads((DATA_DIR / "data-quality.json").read_text(encoding="utf-8"))
    if not all(isinstance(value, list) for value in (actuals, forecasts)) or not isinstance(quality, dict):
        raise ValueError("committed source files have an unexpected JSON shape")
    return actuals, forecasts, quality


@lru_cache(maxsize=32)
def _report(cutoff: time) -> dict[str, Any]:
    actuals, forecasts, _quality = _source_data()
    return build_accuracy_report(actuals, forecasts, cutoff=cutoff, zone=LONDON)


def _set_cache(response: Response) -> None:
    response.headers["Cache-Control"] = CACHE_CONTROL


def _error_response(status_code: int, code: str, message: str, details: list[dict] | None = None) -> JSONResponse:
    body = ErrorEnvelope(error={"code": code, "message": message, "details": details})
    return JSONResponse(status_code=status_code, content=body.model_dump(by_alias=True, exclude_none=True))


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    details = [
        {"field": ".".join(str(part) for part in error["loc"]), "message": error["msg"]}
        for error in exc.errors()
    ]
    return _error_response(422, "validation_error", "Request parameters are invalid.", details)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict):
        code = str(exc.detail.get("code", "request_error"))
        message = str(exc.detail.get("message", "The request could not be completed."))
        details = exc.detail.get("details")
    else:
        code = "not_found" if exc.status_code == 404 else "request_error"
        message = str(exc.detail)
        details = None
    return _error_response(exc.status_code, code, message, details)


@app.exception_handler(Exception)
async def unexpected_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled API exception", exc_info=exc)
    return _error_response(500, "internal_error", "The request could not be completed.")


def _ensure_january(day: date) -> None:
    if not DELIVERY_START <= day < DELIVERY_END:
        raise HTTPException(422, {
            "code": "date_out_of_range",
            "message": "Only delivery dates in January 2026 are supported.",
        })


def _parse_cutoff(value: time) -> time:
    if value.tzinfo is not None:
        raise HTTPException(422, {
            "code": "invalid_cutoff",
            "message": "Cutoff must be a local Europe/London wall-clock time.",
        })
    return value


@app.get("/api/meta", response_model=MetaResponse, tags=["metadata"], responses=API_ERROR_RESPONSES)
def get_meta(response: Response) -> dict[str, Any]:
    _set_cache(response)
    _actuals, _forecasts, quality = _source_data()
    return {
        "product": "GridBricks UK Wind Decisions",
        "apiVersion": app.version,
        "deliveryWindow": {"from": DELIVERY_START.isoformat(), "toExclusive": DELIVERY_END.isoformat()},
        "defaultCutoff": "09:00 Europe/London on D-1",
        "timezone": LONDON.key,
        "dataSource": "Elexon BMRS FUELHH (WIND) and WINDFOR",
        "units": "MW",
        "resolutions": {"actualMinutes": 30, "forecastMinutes": 60},
        "dataQuality": {
            "actualRows": quality["actuals"]["rows"],
            "expectedHalfHours": quality["actuals"]["expected_half_hours"],
            "missingHalfHours": quality["actuals"]["missing_half_hours"],
            "forecastRows": quality["forecasts"]["rows"],
            "coveredTargetHours": quality["forecasts"]["covered_target_hours"],
            "uncoveredTargetHours": quality["forecasts"]["target_hours_without_any_forecast"],
        },
    }


@app.get("/api/decision", response_model=DecisionResponse, tags=["decision"], responses=API_ERROR_RESPONSES)
def get_decision(
    response: Response,
    delivery_date: Annotated[date, Query(alias="date", description="Delivery day in January 2026 (YYYY-MM-DD).")],
    cutoff: Annotated[time, Query(description="Local D-1 cutoff time in Europe/London, HH:MM.")] = DEFAULT_CUTOFF,
) -> dict[str, Any]:
    _set_cache(response)
    _ensure_january(delivery_date)
    cutoff = _parse_cutoff(cutoff)
    try:
        local_cutoff_utc(delivery_date, cutoff, LONDON)
    except ValueError as exc:
        raise HTTPException(422, {"code": "invalid_cutoff", "message": str(exc)}) from exc
    report = _report(cutoff)
    day = delivery_date.isoformat()
    points = [row for row in report["decisionRows"] if row["deliveryDate"] == day]
    valid_forecasts = [row["forecast"] for row in points if row["forecast"] is not None]
    publish_times = sorted({row["publishTime"] for row in points if row["publishTime"] is not None})
    summary = report["summary"]
    return {
        "deliveryDate": day,
        "cutoffLocal": cutoff.strftime("%H:%M"),
        "timezone": LONDON.key,
        "expectedHours": len(points),
        "matchedHours": sum(row["forecast"] is not None and row["actual"] is not None for row in points),
        "publishTimesUsed": [parse_utc(value) for value in publish_times],
        "kpis": {
            "forecastPeakMw": max(valid_forecasts) if valid_forecasts else None,
            "meanForecastMw": sum(valid_forecasts) / len(valid_forecasts) if valid_forecasts else None,
            "expectedErrorP10Mw": summary["errorP10"],
            "expectedErrorP90Mw": summary["errorP90"],
            "recommendedBufferMw": summary["recommendedBufferMw"],
        },
        "points": points,
    }


def _accuracy_context(cutoff: time) -> tuple[dict[str, Any], dict[str, str]]:
    report = _report(cutoff)
    context = {"cutoffLocal": cutoff.strftime("%H:%M"), "timezone": LONDON.key}
    return report, context


@app.get("/api/accuracy/summary", response_model=AccuracySummaryResponse, tags=["accuracy"], responses=API_ERROR_RESPONSES)
def get_accuracy_summary(
    response: Response,
    cutoff: Annotated[time, Query(description="Local D-1 cutoff time in Europe/London, HH:MM.")] = DEFAULT_CUTOFF,
) -> dict[str, Any]:
    _set_cache(response)
    report, context = _accuracy_context(_parse_cutoff(cutoff))
    return {**context, "metrics": report["summary"]}


@app.get("/api/accuracy/by-horizon", response_model=BreakdownResponse, tags=["accuracy"], responses=API_ERROR_RESPONSES)
def get_accuracy_by_horizon(
    response: Response,
    cutoff: Annotated[time, Query()] = DEFAULT_CUTOFF,
) -> dict[str, Any]:
    _set_cache(response)
    report, context = _accuracy_context(_parse_cutoff(cutoff))
    return {**context, "groups": report["byHorizon"]}


@app.get("/api/accuracy/by-hour", response_model=BreakdownResponse, tags=["accuracy"], responses=API_ERROR_RESPONSES)
def get_accuracy_by_hour(
    response: Response,
    cutoff: Annotated[time, Query()] = DEFAULT_CUTOFF,
) -> dict[str, Any]:
    _set_cache(response)
    report, context = _accuracy_context(_parse_cutoff(cutoff))
    return {**context, "groups": report["byHour"]}


@app.get("/api/accuracy/by-wind-level", response_model=BreakdownResponse, tags=["accuracy"], responses=API_ERROR_RESPONSES)
def get_accuracy_by_wind_level(
    response: Response,
    cutoff: Annotated[time, Query()] = DEFAULT_CUTOFF,
) -> dict[str, Any]:
    _set_cache(response)
    report, context = _accuracy_context(_parse_cutoff(cutoff))
    return {
        **context,
        "groups": report["byWindLevel"],
        "thresholdsMw": report["windLevelThresholdsMw"],
    }


@app.get("/api/accuracy/distribution", response_model=DistributionResponse, tags=["accuracy"], responses=API_ERROR_RESPONSES)
def get_accuracy_distribution(
    response: Response,
    cutoff: Annotated[time, Query()] = DEFAULT_CUTOFF,
) -> dict[str, Any]:
    _set_cache(response)
    report, context = _accuracy_context(_parse_cutoff(cutoff))
    return {
        **context,
        "matched": report["summary"]["matched"],
        "bins": report["errorDistribution"],
    }
