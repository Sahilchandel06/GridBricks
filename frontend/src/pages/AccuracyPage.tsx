import { AlertTriangle, ArrowDown, ArrowUp, Info } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'
import type { HourBreakdown, HorizonBreakdown, WindLevelBreakdown } from '../api/types'
import { Card } from '../components/ui/Card'
import { KpiCard } from '../components/ui/KpiCard'
import { Select } from '../components/ui/Select'
import { Tooltip } from '../components/ui/Tooltip'
import { ErrorHistogram, MetricBarChart } from './AccuracyCharts'

const cutoffOptions = [
  { value: '08:00', label: '08:00' },
  { value: '09:00', label: '09:00' },
  { value: '10:00', label: '10:00' },
]
const numberFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })
const decimalFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 })

function formatMw(value: number | null, decimals = false) {
  return value == null ? '—' : (decimals ? decimalFormat : numberFormat).format(value)
}

function formatPercent(value: number | null) {
  return value == null ? '—' : `${decimalFormat.format(value)}%`
}

function SignValue({ value }: { value: number | null }) {
  if (value == null) return <>—</>
  const positive = value > 0
  const Icon = positive ? ArrowUp : ArrowDown
  return <span className={`sign-value${positive ? ' sign-value--positive' : value < 0 ? ' sign-value--negative' : ''}`}><Icon aria-hidden="true" className="h-3.5 w-3.5" />{formatMw(Math.abs(value))} MW</span>
}

function MetricsTable({ metrics }: { metrics: Array<HorizonBreakdown | HourBreakdown | WindLevelBreakdown> }) {
  return (
    <div className="metrics-table-wrap">
      <table className="metrics-table">
        <thead><tr><th>GROUP</th><th>HOURS</th><th>MAE</th><th>RMSE</th><th>BIAS</th><th>P90 ABS. ERROR</th><th>MAPE</th></tr></thead>
        <tbody>{metrics.map((metric) => {
          const label = 'horizon' in metric ? metric.horizon : 'windLevel' in metric ? `${metric.windLevel[0].toUpperCase()}${metric.windLevel.slice(1)} wind` : metric.hour
          return <tr key={label}><th scope="row">{label}</th><td>{metric.matched} / {metric.expected}</td><td>{formatMw(metric.mae)}</td><td>{formatMw(metric.rmse)}</td><td><SignValue value={metric.bias} /></td><td>{formatMw(metric.p90AbsoluteError)}</td><td>{formatPercent(metric.mapePercent)}</td></tr>
        })}</tbody>
      </table>
    </div>
  )
}

export function AccuracyPage() {
  const [cutoff, setCutoff] = useState('09:00')
  const summary = useQuery({ queryKey: ['accuracy-summary', cutoff], queryFn: ({ signal }) => api.getAccuracySummary(cutoff, signal) })
  const horizon = useQuery({ queryKey: ['accuracy-horizon', cutoff], queryFn: ({ signal }) => api.getAccuracyByHorizon(cutoff, signal) })
  const byHour = useQuery({ queryKey: ['accuracy-hour', cutoff], queryFn: ({ signal }) => api.getAccuracyByHour(cutoff, signal) })
  const windLevel = useQuery({ queryKey: ['accuracy-wind-level', cutoff], queryFn: ({ signal }) => api.getAccuracyByWindLevel(cutoff, signal) })
  const distribution = useQuery({ queryKey: ['accuracy-distribution', cutoff], queryFn: ({ signal }) => api.getAccuracyDistribution(cutoff, signal) })
  const metrics = summary.data?.metrics
  const errors = [summary, horizon, byHour, windLevel, distribution].filter((query) => query.isError)
  const loading = [summary, horizon, byHour, windLevel, distribution].some((query) => query.isPending)
  const windGroups = windLevel.data?.groups as WindLevelBreakdown[] | undefined
  const horizonGroups = horizon.data?.groups as HorizonBreakdown[] | undefined
  const hourGroups = byHour.data?.groups as HourBreakdown[] | undefined

  return (
    <div className="workspace-page accuracy-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow page-heading__eyebrow"><span className="eyebrow-marker" />FORECAST PERFORMANCE <span className="eyebrow-separator">/</span> JANUARY 2026</p>
          <h1>Forecast accuracy</h1>
          <p className="page-heading__description">Measure the wind forecast error at the time the day-ahead decision was made.</p>
        </div>
        <div className="page-controls page-controls--single">
          <Select id="accuracy-cutoff" label="D-1 CUTOFF · LONDON" onChange={setCutoff} options={cutoffOptions} value={cutoff} />
        </div>
      </div>

      {errors.length > 0 && <div className="inline-alert" role="alert"><AlertTriangle aria-hidden="true" className="h-4 w-4" /><span>Some accuracy data could not be loaded. Check the API connection and retry.</span><button className="text-button" onClick={() => void Promise.all([summary.refetch(), horizon.refetch(), byHour.refetch(), windLevel.refetch(), distribution.refetch()])} type="button">Retry</button></div>}

      {loading ? (
        <div aria-label="Loading January forecast accuracy" className="accuracy-loading"><div /><div /><div /></div>
      ) : metrics && (
        <>
          <div className="kpi-grid accuracy-summary-grid">
            <KpiCard caption="Mean absolute forecast error" label="MAE" loading={false} unit="MW" value={formatMw(metrics.mae)} />
            <KpiCard caption="Penalizes larger misses more" label="RMSE" loading={false} unit="MW" value={formatMw(metrics.rmse)} />
            <KpiCard caption="Forecast − actual · positive is over-forecast" label="MEAN BIAS" loading={false} unit="MW" value={`${metrics.bias != null && metrics.bias > 0 ? '+' : ''}${formatMw(metrics.bias)}`} />
            <KpiCard caption="90th percentile absolute error" label="P90 BUFFER REFERENCE" loading={false} unit="MW" value={formatMw(metrics.recommendedBufferMw)} />
            <KpiCard caption="Mean absolute percentage error" label="MAPE" loading={false} unit="" value={formatPercent(metrics.mapePercent)} />
          </div>

          <div className="accuracy-meta-strip">
            <span><strong>{metrics.matched} / {metrics.expected}</strong> matched hours</span>
            <span><strong>{formatPercent(metrics.normalizedMae == null ? null : metrics.normalizedMae * 100)}</strong> normalized MAE</span>
            <span><strong>{formatMw(metrics.p50AbsoluteError)} MW</strong> median absolute error</span>
            <span><strong>{formatMw(metrics.meanActual)} MW</strong> mean actual output</span>
          </div>

          <div className="accuracy-chart-grid">
            <Card className="histogram-card" eyebrow="ERROR DISTRIBUTION" title="Forecast error across delivery hours" action={<span className="sample-count">{distribution.data?.matched ?? 0} HOURS</span>}>
              {distribution.data && <ErrorHistogram bins={distribution.data.bins} />}
              <p className="chart-caption accuracy-chart-caption"><span>Under-forecast <b>←</b> forecast − actual <b>→</b> over-forecast</span><span>Bin width in MW</span></p>
            </Card>
            <Card className="hour-chart-card" eyebrow="ERROR BY DELIVERY HOUR" title="When does error increase?">
              {hourGroups && <MetricBarChart groups={hourGroups.map((group) => ({ label: group.hour, value: group.mae, sample: group.matched }))} unit="MW MAE" />}
            </Card>
          </div>

          <div className="accuracy-breakdown-grid">
            <Card className="breakdown-card" eyebrow="FORECAST LEAD TIME" title="Accuracy by horizon">
              {horizonGroups && <MetricsTable metrics={horizonGroups} />}
            </Card>
            <Card className="breakdown-card" eyebrow="ACTUAL WIND OUTPUT" title="Accuracy by wind level" action={<Tooltip content="Low, mid, and high groups are terciles of the matched January actual generation distribution."><button aria-label="How wind groups are defined" className="help-button" type="button"><Info aria-hidden="true" className="h-4 w-4" /></button></Tooltip>}>
              {windGroups && <MetricsTable metrics={windGroups} />}
            </Card>
          </div>

          <Card className="accuracy-hour-table" eyebrow="HOUR DETAIL" title="Accuracy for each delivery hour">
            {hourGroups && <MetricsTable metrics={hourGroups} />}
          </Card>

          <div className="accuracy-method-note"><Info aria-hidden="true" className="h-4 w-4" /><p><strong>Reading these metrics.</strong> Error is forecast minus actual generation, so a positive bias means the forecast was higher than output. MAPE excludes actual output at or below {formatMw(metrics.mapeThresholdMw ?? 100)} MW. The P90 buffer is a historical error reference, not a procurement recommendation; demand and market costs are outside this dataset.</p></div>
          <div className="workspace-footer"><span>Decision-time forecast archive</span><span>D-1 {cutoff} Europe/London <span className="footer-dot">·</span> {metrics.matched} matched of {metrics.expected} hours <span className="footer-dot">·</span> All values MW</span></div>
        </>
      )}
    </div>
  )
}
