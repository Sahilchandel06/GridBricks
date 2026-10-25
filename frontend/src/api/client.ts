import type {
  AccuracySummaryResponse,
  ApiErrorPayload,
  BreakdownResponse,
  DecisionResponse,
  ErrorDistributionResponse,
  HourBreakdown,
  HorizonBreakdown,
  MetaResponse,
  WindLevelBreakdown,
} from './types'

const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

export class ApiClientError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, status: number, code = 'api_error') {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    let code = 'api_error'
    try {
      const payload = (await response.json()) as ApiErrorPayload
      message = payload.error.message || message
      code = payload.error.code || code
    } catch {
      // Keep the status-based message when the server did not return JSON.
    }
    throw new ApiClientError(message, response.status, code)
  }

  return (await response.json()) as T
}

function withCutoff(path: string, cutoff = '09:00'): string {
  return `${path}?${new URLSearchParams({ cutoff })}`
}

export const api = {
  getMeta: (signal?: AbortSignal) => request<MetaResponse>('/api/meta', signal),
  getDecision: (date: string, cutoff = '09:00', signal?: AbortSignal) => {
    const query = new URLSearchParams({ date, cutoff })
    return request<DecisionResponse>(`/api/decision?${query}`, signal)
  },
  getAccuracySummary: (cutoff = '09:00', signal?: AbortSignal) =>
    request<AccuracySummaryResponse>(withCutoff('/api/accuracy/summary', cutoff), signal),
  getAccuracyByHorizon: (cutoff = '09:00', signal?: AbortSignal) =>
    request<BreakdownResponse<HorizonBreakdown>>(withCutoff('/api/accuracy/by-horizon', cutoff), signal),
  getAccuracyByHour: (cutoff = '09:00', signal?: AbortSignal) =>
    request<BreakdownResponse<HourBreakdown>>(withCutoff('/api/accuracy/by-hour', cutoff), signal),
  getAccuracyByWindLevel: (cutoff = '09:00', signal?: AbortSignal) =>
    request<BreakdownResponse<WindLevelBreakdown>>(withCutoff('/api/accuracy/by-wind-level', cutoff), signal),
  getAccuracyDistribution: (cutoff = '09:00', signal?: AbortSignal) =>
    request<ErrorDistributionResponse>(withCutoff('/api/accuracy/distribution', cutoff), signal),
}
