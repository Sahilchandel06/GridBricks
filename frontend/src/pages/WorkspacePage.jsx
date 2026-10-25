import { AlertTriangle, Info } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'
import { Insight } from '../components/ui/Insight'
import { KpiRow } from '../components/ui/KpiRow'
import { DatePicker } from '../components/ui/DatePicker'
import { Section } from '../components/ui/Section'
import { Select } from '../components/ui/Select'
import { Toolbar } from '../components/ui/Toolbar'
import { Tooltip } from '../components/ui/Tooltip'
import { DecisionChart } from './DecisionChart'

const cutoffOptions = [
  { value: '08:00', label: '08:00' },
  { value: '09:00', label: '09:00' },
  { value: '10:00', label: '10:00' },
]
const numberFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Europe/London',
})
const timestampFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/London',
  timeZoneName: 'short',
})

function formatMw(value) {
  return value == null ? '—' : numberFormat.format(value)
}

export function WorkspacePage() {
  const [deliveryDate, setDeliveryDate] = useState('2026-01-15')
  const [cutoff, setCutoff] = useState('09:00')
  const decision = useQuery({
    queryKey: ['decision', deliveryDate, cutoff],
    queryFn: ({ signal }) => api.getDecision(deliveryDate, cutoff, signal),
    enabled: Boolean(deliveryDate),
  })
  const data = decision.data
  const latestPublish = data?.publishTimesUsed.reduce(
    (latest, value) => latest == null || value > latest ? value : latest,
    null,
  ) ?? null
  const coverage = data ? `${data.matchedHours} / ${data.expectedHours}` : '—'
  const formattedDate = deliveryDate
    ? dateFormat.format(new Date(`${deliveryDate}T12:00:00Z`))
    : 'Select a delivery day'
  const latestIssue = latestPublish
    ? timestampFormat.format(new Date(latestPublish))
    : 'No eligible forecast issue'

  return (
    <div className="workspace-page decision-page">
      <div className="page-heading">
        <div className="page-heading__copy">
          <p className="eyebrow">Decision · National wind</p>
          <h1>Wind generation</h1>
          <p className="page-heading__description">Forecast information available before the delivery day.</p>
        </div>
        <Toolbar className="page-heading__toolbar" label="Decision view controls">
          <DatePicker
            id="delivery-date"
            label="Delivery day"
            max="2026-01-31"
            min="2026-01-01"
            onChange={setDeliveryDate}
            value={deliveryDate}
          />
          <Select
            id="decision-cutoff"
            label="D-1 cutoff · London"
            onChange={setCutoff}
            options={cutoffOptions}
            value={cutoff}
          />
        </Toolbar>
      </div>

      {decision.isError && (
        <div className="inline-alert" role="alert">
          <AlertTriangle aria-hidden="true" size={16} />
          <span>{decision.error.message || 'The decision data could not be loaded.'}</span>
          <button className="text-button" onClick={() => void decision.refetch()} type="button">Retry</button>
        </div>
      )}

      {decision.isPending ? (
        <div aria-label="Loading delivery-day wind forecast" className="decision-loading">
          <div className="skeleton decision-loading__chart" />
          <div className="skeleton decision-loading__row" />
        </div>
      ) : data ? (
        <>
          <KpiRow items={[
            { label: 'Forecast peak', value: formatMw(data.kpis.forecastPeakMw), unit: 'MW' },
            { label: 'Average forecast', value: formatMw(data.kpis.meanForecastMw), unit: 'MW' },
            { label: 'P90 error reference', value: formatMw(data.kpis.recommendedBufferMw), unit: 'MW' },
            { label: 'Hourly coverage', value: coverage, unit: 'hours' },
          ]} />

          <Section
            action={(
              <div aria-label="Chart legend" className="chart-legend">
                <span><i className="chart-legend__swatch chart-legend__swatch--forecast" />Forecast</span>
                <span><i className="chart-legend__swatch chart-legend__swatch--actual" />Actual</span>
                <span><i className="chart-legend__band" />P10–P90 range</span>
              </div>
            )}
            className="decision-chart-section"
            eyebrow="Hourly generation · MW"
            title={formattedDate}
          >
            <DecisionChart points={data.points} />
            <Insight>
              Latest issue used: {latestIssue}. {data.matchedHours} of {data.expectedHours} delivery hours matched.
              {' '}P90 absolute-error reference: {formatMw(data.kpis.recommendedBufferMw)} MW.
            </Insight>
          </Section>

          <div className="decision-detail-grid">
            <Section eyebrow="Decision-time selection" title="Publication details">
              <dl className="detail-list">
                <div><dt>Latest issue used</dt><dd className="timestamp">{latestIssue}</dd></div>
                <div><dt>Decision cutoff</dt><dd>{data.cutoffLocal} Europe/London, previous day</dd></div>
                <div><dt>Publications used</dt><dd>{data.publishTimesUsed.length}</dd></div>
                <div><dt>Matched delivery hours</dt><dd>{data.matchedHours} of {data.expectedHours}</dd></div>
              </dl>
              <p className="detail-note">
                <Info aria-hidden="true" size={16} />
                <span>Only forecasts published by the selected cutoff are included.</span>
                <Tooltip content="The buffer is the historical 90th percentile of absolute forecast error. It is a planning reference, not a market-cost optimum.">
                  <button aria-label="How to read the P90 error reference" className="help-button" type="button"><Info aria-hidden="true" size={16} /></button>
                </Tooltip>
              </p>
            </Section>

            <Section eyebrow="Elexon archive" title="Data coverage">
              <dl className="detail-list">
                <div><dt>Hourly match</dt><dd>{data.matchedHours === data.expectedHours ? 'Complete' : 'Partial'}</dd></div>
                <div><dt>Expected delivery hours</dt><dd>{data.expectedHours} hours</dd></div>
                <div><dt>FUELHH actuals</dt><dd>30-minute readings averaged to hourly MW</dd></div>
                <div><dt>WINDFOR forecast</dt><dd>Hourly MW at publication time</dd></div>
              </dl>
            </Section>
          </div>
        </>
      ) : null}
    </div>
  )
}
