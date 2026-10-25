/** @typedef {{ error: { code: string, message: string, details?: Array<{ field?: string, message: string }> } }} ApiErrorPayload */
/** @typedef {{ product: string, apiVersion: string, deliveryWindow: { from: string, toExclusive: string }, defaultCutoff: string, timezone: string, dataSource: string, units: string, resolutions: { actualMinutes: number, forecastMinutes: number }, dataQuality: { actualRows: number, expectedHalfHours: number, missingHalfHours: number, forecastRows: number, coveredTargetHours: number, uncoveredTargetHours: number } }} MetaResponse */
/** @typedef {{ deliveryDate: string, startTime: string, decisionCutoff: string, publishTime: string | null, forecast: number | null, actual: number | null, horizonHours: number | null, bandLow: number | null, bandHigh: number | null }} DecisionPoint */
/** @typedef {{ deliveryDate: string, cutoffLocal: string, timezone: string, expectedHours: number, matchedHours: number, publishTimesUsed: string[], kpis: { forecastPeakMw: number | null, meanForecastMw: number | null, expectedErrorP10Mw: number | null, expectedErrorP90Mw: number | null, recommendedBufferMw: number | null }, points: DecisionPoint[] }} DecisionResponse */
/** @typedef {{ expected: number, matched: number, missing: number, mae: number | null, rmse: number | null, bias: number | null, mapePercent: number | null, mapeIncluded: number, mapeExcludedNearZero: number, mapeThresholdMw?: number, normalizedMae: number | null, meanActual: number | null, p50AbsoluteError: number | null, p90AbsoluteError: number | null, errorP10: number | null, errorP90: number | null, recommendedBufferMw: number | null }} AccuracyMetrics */
/** @typedef {{ cutoffLocal: string, timezone: string, metrics: AccuracyMetrics }} AccuracySummaryResponse */
/** @typedef {AccuracyMetrics & { horizon: string }} HorizonBreakdown */
/** @typedef {AccuracyMetrics & { hour: string }} HourBreakdown */
/** @typedef {AccuracyMetrics & { windLevel: 'low' | 'mid' | 'high' }} WindLevelBreakdown */
/** @template TGroup @typedef {{ cutoffLocal: string, timezone: string, groups: TGroup[], thresholdsMw?: { lowUpperMw: number | null, midUpperMw: number | null } }} BreakdownResponse */
/** @typedef {{ cutoffLocal: string, timezone: string, matched: number, bins: Array<{ fromMw: number, toMw: number, count: number }> }} ErrorDistributionResponse */

const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
export class ApiClientError extends Error {
    status;
    code;
    constructor(message, status, code = 'api_error') {
        super(message);
        this.name = 'ApiClientError';
        this.status = status;
        this.code = code;
    }
}
/** @template T @param {string} path @param {AbortSignal} [signal] @returns {Promise<T>} */
async function request(path, signal) {
    const response = await fetch(`${apiBase}${path}`, {
        headers: { Accept: 'application/json' },
        signal,
    });
    if (!response.ok) {
        let message = `Request failed (${response.status})`;
        let code = 'api_error';
        try {
            /** @type {ApiErrorPayload} */
            const payload = await response.json();
            message = payload.error.message || message;
            code = payload.error.code || code;
        }
        catch {
            // Keep the status-based message when the server did not return JSON.
        }
        throw new ApiClientError(message, response.status, code);
    }
    return (await response.json());
}
function withCutoff(path, cutoff = '09:00') {
    return `${path}?${new URLSearchParams({ cutoff })}`;
}
export const api = {
    /** @param {AbortSignal} [signal] @returns {Promise<MetaResponse>} */
    getMeta: (signal) => request('/api/meta', signal),
    /** @param {string} date @param {string} [cutoff] @param {AbortSignal} [signal] @returns {Promise<DecisionResponse>} */
    getDecision: (date, cutoff = '09:00', signal) => {
        const query = new URLSearchParams({ date, cutoff });
        return request(`/api/decision?${query}`, signal);
    },
    /** @param {string} [cutoff] @param {AbortSignal} [signal] @returns {Promise<AccuracySummaryResponse>} */
    getAccuracySummary: (cutoff = '09:00', signal) => request(withCutoff('/api/accuracy/summary', cutoff), signal),
    /** @param {string} [cutoff] @param {AbortSignal} [signal] @returns {Promise<BreakdownResponse<HorizonBreakdown>>} */
    getAccuracyByHorizon: (cutoff = '09:00', signal) => request(withCutoff('/api/accuracy/by-horizon', cutoff), signal),
    /** @param {string} [cutoff] @param {AbortSignal} [signal] @returns {Promise<BreakdownResponse<HourBreakdown>>} */
    getAccuracyByHour: (cutoff = '09:00', signal) => request(withCutoff('/api/accuracy/by-hour', cutoff), signal),
    /** @param {string} [cutoff] @param {AbortSignal} [signal] @returns {Promise<BreakdownResponse<WindLevelBreakdown>>} */
    getAccuracyByWindLevel: (cutoff = '09:00', signal) => request(withCutoff('/api/accuracy/by-wind-level', cutoff), signal),
    /** @param {string} [cutoff] @param {AbortSignal} [signal] @returns {Promise<ErrorDistributionResponse>} */
    getAccuracyDistribution: (cutoff = '09:00', signal) => request(withCutoff('/api/accuracy/distribution', cutoff), signal),
};
