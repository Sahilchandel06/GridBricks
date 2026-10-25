import { AlertTriangle, Info } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'
import { Insight } from '../components/ui/Insight'
import { KpiRow } from '../components/ui/KpiRow'
import { Section } from '../components/ui/Section'
import { Select } from '../components/ui/Select'
import { Toolbar } from '../components/ui/Toolbar'
import { Tooltip } from '../components/ui/Tooltip'
import { ErrorHistogram, MetricBarChart } from './AccuracyCharts'

const cutoffOptions = [
  { value: '08:00', label: '08:00' },
  { value: '09:00', label: '09:00' },
  { value: '10:00', label: '10:00' },
]
const numberFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })
const decimalFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 })

function formatMw(value) {
  return value == null ? '—' : numberFormat.format(value)
}

function formatPercent(value) {
  return value == null ? '—' : `${decimalFormat.format(value)}%`
}

function SignedValue({ value }) {
  if (value == null) return <>—</>
  return `${value > 0 ? '+' : ''}${formatMw(value)} MW`
}

function MetricsTable({ metrics }) {
  return (
    <div className="metrics-table-wrap">
      <table className="metrics-table">
        <thead>
          <tr>
            <th scope="col">Group</th>
            <th scope="col">Matched hours</th>
            <th scope="col">MAE (MW)</th>
            <th scope="col">RMSE (MW)</th>
            <th scope="col">Mean bias (MW)</th>
            <th scope="col">P90 error (MW)</th>
            <th scope="col">MAPE</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => {
            const label = 'horizon' in metric
              ? metric.horizon
              : 'windLevel' in metric
                ? `${metric.windLevel[0].toUpperCase()}${metric.windLevel.slice(1)} wind`
                : metric.hour

            return (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{metric.matched} / {metric.expected}</td>
                <td>{formatMw(metric.mae)}</td>
                <td>{formatMw(metric.rmse)}</td>
                <td><SignedValue value={metric.bias} /></td>
                <td>{formatMw(metric.p90AbsoluteError)}</td>
                <td>{formatPercent(metric.mapePercent)}</td>
              </tr>
            )
          })}
        </tbody>
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
  const queries = [summary, horizon, byHour, windLevel, distribution]
  const errors = queries.filter((query) => query.isError)
  const loading = queries.some((query) => query.isPending)
  const windGroups = windLevel.data?.groups
  const horizonGroups = horizon.data?.groups
  const hourGroups = byHour.data?.groups
  const measuredHours = hourGroups?.filter((group) => group.mae != null) ?? []
  const largestErrorHour = measuredHours.reduce((largest, group) => group.mae > largest.mae ? group : largest, measuredHours[0])
  const smallestErrorHour = measuredHours.reduce((smallest, group) => group.mae < smallest.mae ? group : smallest, measuredHours[0])

  return (
    <div className="workspace-page accuracy-page">
      <div className="page-heading">
        <div className="page-heading__copy">
          <p className="eyebrow">Forecast performance · January 2026</p>
          <h1>Forecast accuracy</h1>
          <p className="page-heading__description">How closely the day-ahead wind forecast matched measured generation.</p>
        </div>
        <Toolbar className="page-heading__toolbar" label="Accuracy view controls">
          <Select
            id="accuracy-cutoff"
            label="D-1 cutoff · London"
            onChange={setCutoff}
            options={cutoffOptions}
            value={cutoff}
          />
        </Toolbar>
      </div>

      {errors.length > 0 && (
        <div className="inline-alert" role="alert">
          <AlertTriangle aria-hidden="true" size={16} />
          <span>Some accuracy data could not be loaded. Check the API connection and retry.</span>
          <button
            className="text-button"
            onClick={() => void Promise.all(queries.map((query) => query.refetch()))}
            type="button"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div aria-label="Loading January forecast accuracy" className="accuracy-loading">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : metrics && (
        <>
          <KpiRow items={[
            { label: 'Mean absolute error', value: formatMw(metrics.mae), unit: 'MW' },
            { label: 'Root mean square error', value: formatMw(metrics.rmse), unit: 'MW' },
            { label: 'Mean bias', value: <SignedValue value={metrics.bias} /> },
            { label: 'P90 absolute error', value: formatMw(metrics.recommendedBufferMw), unit: 'MW' },
          ]} />

          <div aria-label="Additional accuracy measures" className="accuracy-meta-row">
            <span><strong>MAPE</strong> {formatPercent(metrics.mapePercent)}</span>
            <span><strong>Matched hours</strong> {metrics.matched} / {metrics.expected}</span>
            <span><strong>Normalized MAE</strong> {formatPercent(metrics.normalizedMae == null ? null : metrics.normalizedMae * 100)}</span>
            <span><strong>Median absolute error</strong> {formatMw(metrics.p50AbsoluteError)} MW</span>
          </div>

          <div className="accuracy-chart-grid">
            <Section
              action={<span className="section__meta">{distribution.data?.matched ?? 0} hours</span>}
              className="chart-section"
              eyebrow="Error distribution"
              title="Forecast error across delivery hours"
            >
              {distribution.data && <ErrorHistogram bins={distribution.data.bins} />}
              <Insight>
                Median absolute error was {formatMw(metrics.p50AbsoluteError)} MW across {metrics.matched} matched delivery hours.
              </Insight>
            </Section>
            <Section className="chart-section" eyebrow="Error by delivery hour" title="When does error increase?">
              {hourGroups && <MetricBarChart groups={hourGroups.map((group) => ({ label: group.hour, value: group.mae, sample: group.matched }))} unit="MW MAE" />}
              {largestErrorHour && smallestErrorHour && (
                <Insight>
                  {largestErrorHour.hour} had the largest MAE ({formatMw(largestErrorHour.mae)} MW); {smallestErrorHour.hour} had the smallest ({formatMw(smallestErrorHour.mae)} MW).
                </Insight>
              )}
            </Section>
          </div>

          <Section eyebrow="Forecast lead time" title="Accuracy by horizon">
            {horizonGroups && <MetricsTable metrics={horizonGroups} />}
          </Section>

          <Section
            action={(
              <Tooltip content="Low, mid, and high groups are thirds of matched January actual wind generation.">
                <button aria-label="How wind groups are defined" className="help-button" type="button"><Info aria-hidden="true" size={16} /></button>
              </Tooltip>
            )}
            eyebrow="Actual wind output"
            title="Accuracy by wind level"
          >
            {windGroups && <MetricsTable metrics={windGroups} />}
          </Section>

          <Section eyebrow="Hour detail" title="Accuracy for each delivery hour">
            {hourGroups && <MetricsTable metrics={hourGroups} />}
          </Section>

          <p className="method-note">
            <Info aria-hidden="true" size={16} />
            <span>
              Error is forecast minus actual, so positive bias means over-forecasting. MAPE excludes actual output at or below {formatMw(metrics.mapeThresholdMw ?? 100)} MW. The P90 value is a historical reference; demand and market costs are outside this dataset.
            </span>
          </p>
        </>
      )}
    </div>
  )
}
