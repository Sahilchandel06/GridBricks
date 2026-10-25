export interface ApiErrorPayload {
  error: {
    code: string
    message: string
    details?: Array<{ field?: string; message: string }>
  }
}

export interface DataQualitySummary {
  actualRows: number
  expectedHalfHours: number
  missingHalfHours: number
  forecastRows: number
  coveredTargetHours: number
  uncoveredTargetHours: number
}

export interface MetaResponse {
  product: string
  apiVersion: string
  deliveryWindow: { from: string; toExclusive: string }
  defaultCutoff: string
  timezone: string
  dataSource: string
  units: string
  resolutions: { actualMinutes: number; forecastMinutes: number }
  dataQuality: DataQualitySummary
}

export interface DecisionPoint {
  deliveryDate: string
  startTime: string
  decisionCutoff: string
  publishTime: string | null
  forecast: number | null
  actual: number | null
  horizonHours: number | null
  bandLow: number | null
  bandHigh: number | null
}

export interface DecisionResponse {
  deliveryDate: string
  cutoffLocal: string
  timezone: string
  expectedHours: number
  matchedHours: number
  publishTimesUsed: string[]
  kpis: {
    forecastPeakMw: number | null
    meanForecastMw: number | null
    expectedErrorP10Mw: number | null
    expectedErrorP90Mw: number | null
    recommendedBufferMw: number | null
  }
  points: DecisionPoint[]
}

export interface AccuracyMetrics {
  expected: number
  matched: number
  missing: number
  mae: number | null
  rmse: number | null
  bias: number | null
  mapePercent: number | null
  mapeIncluded: number
  mapeExcludedNearZero: number
  mapeThresholdMw?: number
  normalizedMae: number | null
  meanActual: number | null
  p50AbsoluteError: number | null
  p90AbsoluteError: number | null
  errorP10: number | null
  errorP90: number | null
  recommendedBufferMw: number | null
}

export interface AccuracySummaryResponse {
  cutoffLocal: string
  timezone: string
  metrics: AccuracyMetrics
}

export interface HorizonBreakdown extends AccuracyMetrics {
  horizon: string
}

export interface HourBreakdown extends AccuracyMetrics {
  hour: string
}

export interface WindLevelBreakdown extends AccuracyMetrics {
  windLevel: 'low' | 'mid' | 'high'
}

export interface BreakdownResponse<TGroup> {
  cutoffLocal: string
  timezone: string
  groups: TGroup[]
  thresholdsMw?: { lowUpperMw: number | null; midUpperMw: number | null }
}

export interface ErrorDistributionResponse {
  cutoffLocal: string
  timezone: string
  matched: number
  bins: Array<{ fromMw: number; toMw: number; count: number }>
}
