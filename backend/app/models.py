"""Typed API response and error models."""

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


class ApiError(BaseModel):
    code: str
    message: str
    details: list[dict[str, Any]] | None = None


class ErrorEnvelope(BaseModel):
    error: ApiError


class DataQualitySummary(BaseModel):
    actual_rows: int = Field(alias="actualRows")
    expected_half_hours: int = Field(alias="expectedHalfHours")
    missing_half_hours: int = Field(alias="missingHalfHours")
    forecast_rows: int = Field(alias="forecastRows")
    covered_target_hours: int = Field(alias="coveredTargetHours")
    uncovered_target_hours: int = Field(alias="uncoveredTargetHours")


class MetaResponse(BaseModel):
    product: str
    api_version: str = Field(alias="apiVersion")
    delivery_window: dict[str, str] = Field(alias="deliveryWindow")
    default_cutoff: str = Field(alias="defaultCutoff")
    timezone: str
    data_source: str = Field(alias="dataSource")
    units: str
    resolutions: dict[str, int]
    data_quality: DataQualitySummary = Field(alias="dataQuality")


class DecisionPoint(BaseModel):
    delivery_date: date = Field(alias="deliveryDate")
    start_time: datetime = Field(alias="startTime")
    decision_cutoff: datetime = Field(alias="decisionCutoff")
    publish_time: datetime | None = Field(alias="publishTime")
    forecast: float | None
    actual: float | None
    horizon_hours: float | None = Field(alias="horizonHours")
    band_low: float | None = Field(alias="bandLow")
    band_high: float | None = Field(alias="bandHigh")


class DecisionKpis(BaseModel):
    forecast_peak_mw: float | None = Field(alias="forecastPeakMw")
    mean_forecast_mw: float | None = Field(alias="meanForecastMw")
    expected_error_p10_mw: float | None = Field(alias="expectedErrorP10Mw")
    expected_error_p90_mw: float | None = Field(alias="expectedErrorP90Mw")
    recommended_buffer_mw: float | None = Field(alias="recommendedBufferMw")


class DecisionResponse(BaseModel):
    delivery_date: date = Field(alias="deliveryDate")
    cutoff_local: str = Field(alias="cutoffLocal")
    timezone: str
    expected_hours: int = Field(alias="expectedHours")
    matched_hours: int = Field(alias="matchedHours")
    publish_times_used: list[datetime] = Field(alias="publishTimesUsed")
    kpis: DecisionKpis
    points: list[DecisionPoint]


class AccuracySummary(BaseModel):
    expected: int
    matched: int
    missing: int
    mae: float | None
    rmse: float | None
    bias: float | None
    mape_percent: float | None = Field(alias="mapePercent")
    mape_included: int = Field(alias="mapeIncluded")
    mape_excluded_near_zero: int = Field(alias="mapeExcludedNearZero")
    mape_threshold_mw: float | None = Field(default=None, alias="mapeThresholdMw")
    normalized_mae: float | None = Field(alias="normalizedMae")
    mean_actual: float | None = Field(alias="meanActual")
    p50_absolute_error: float | None = Field(alias="p50AbsoluteError")
    p90_absolute_error: float | None = Field(alias="p90AbsoluteError")
    error_p10: float | None = Field(alias="errorP10")
    error_p90: float | None = Field(alias="errorP90")
    recommended_buffer_mw: float | None = Field(alias="recommendedBufferMw")


class AccuracySummaryResponse(BaseModel):
    cutoff_local: str = Field(alias="cutoffLocal")
    timezone: str
    metrics: AccuracySummary


class HorizonBreakdown(AccuracySummary):
    horizon: str


class HourBreakdown(AccuracySummary):
    hour: str


class WindLevelBreakdown(AccuracySummary):
    wind_level: str = Field(alias="windLevel")


class BreakdownResponse(BaseModel):
    cutoff_local: str = Field(alias="cutoffLocal")
    timezone: str
    groups: list[HorizonBreakdown | HourBreakdown | WindLevelBreakdown]
    thresholds_mw: dict[str, float | None] | None = Field(default=None, alias="thresholdsMw")


class DistributionBin(BaseModel):
    from_mw: float = Field(alias="fromMw")
    to_mw: float = Field(alias="toMw")
    count: int


class DistributionResponse(BaseModel):
    cutoff_local: str = Field(alias="cutoffLocal")
    timezone: str
    matched: int
    bins: list[DistributionBin]
