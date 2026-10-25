import { Activity, Check, Database, Info, Wind } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../api/client'
import { Card } from '../components/ui/Card'
import { DatePicker } from '../components/ui/DatePicker'
import { KpiCard } from '../components/ui/KpiCard'
import { Select } from '../components/ui/Select'
import { Tooltip } from '../components/ui/Tooltip'

const cutoffOptions = [
  { value: '08:00', label: '08:00' },
  { value: '09:00', label: '09:00' },
  { value: '10:00', label: '10:00' },
]

const numberFormat = new Intl.NumberFormat('en-GB')

export function WorkspacePage() {
  const [deliveryDate, setDeliveryDate] = useState('2026-01-15')
  const [cutoff, setCutoff] = useState('09:00')
  const meta = useQuery({ queryKey: ['meta'], queryFn: ({ signal }) => api.getMeta(signal) })
  const quality = meta.data?.dataQuality

  return (
    <div className="workspace-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow page-heading__eyebrow"><span className="eyebrow-marker" />DECISION WORKSPACE <span className="eyebrow-separator">/</span> NATIONAL WIND</p>
          <h1>Wind generation</h1>
          <p className="page-heading__description">Decision-time forecast and actual generation for the GB system.</p>
        </div>
        <div className="page-controls">
          <DatePicker
            id="delivery-date"
            label="DELIVERY DAY"
            max="2026-01-31"
            min="2026-01-01"
            onChange={setDeliveryDate}
            value={deliveryDate}
          />
          <Select
            id="decision-cutoff"
            label="D-1 CUTOFF · LONDON"
            onChange={setCutoff}
            options={cutoffOptions}
            value={cutoff}
          />
        </div>
      </div>

      {meta.isError && (
        <div className="inline-alert" role="alert">
          <Info aria-hidden="true" className="h-4 w-4" />
          <span>Data service is unavailable. Start the FastAPI app to load the January archive.</span>
          <button className="text-button" onClick={() => void meta.refetch()} type="button">Retry</button>
        </div>
      )}

      <div className="kpi-grid">
        <KpiCard
          caption="FUELHH · WIND · 30 minute resolution"
          label="ACTUAL HALF-HOURS"
          loading={meta.isPending}
          unit="rows"
          value={quality ? numberFormat.format(quality.actualRows) : '—'}
        />
        <KpiCard
          caption="All 744 January target hours covered"
          label="FORECAST COVERAGE"
          loading={meta.isPending}
          unit="hours"
          value={quality ? `${numberFormat.format(quality.coveredTargetHours)} / 744` : '—'}
        />
        <KpiCard
          caption="Forecast issues by target hour"
          label="FORECAST VERSIONS"
          loading={meta.isPending}
          unit="issues"
          value={quality ? numberFormat.format(quality.forecastRows) : '—'}
        />
        <KpiCard
          caption={quality?.missingHalfHours === 0 ? 'Complete for all January delivery periods' : 'Intervals without an actual reading'}
          label="ACTUAL DATA GAPS"
          loading={meta.isPending}
          unit="periods"
          value={quality ? numberFormat.format(quality.missingHalfHours) : '—'}
        />
      </div>

      <div className="foundation-grid">
        <Card className="source-card" eyebrow="DATA SOURCES" title="A single national view">
          <p className="card-copy">Both series come from Elexon BMRS. Forecasts are selected by publication time, while actuals preserve their reported settlement periods.</p>
          <div className="source-list">
            <div className="source-row">
              <span className="source-row__icon source-row__icon--actual"><Activity aria-hidden="true" className="h-4 w-4" /></span>
              <div className="source-row__copy">
                <span className="source-row__title">FUELHH <span>·</span> actual wind</span>
                <span className="source-row__detail">30 minute average · MW</span>
              </div>
              <span className="source-row__status"><Check aria-hidden="true" className="h-3.5 w-3.5" />{meta.isSuccess ? 'READY' : 'LOADING'}</span>
            </div>
            <div className="source-row">
              <span className="source-row__icon source-row__icon--forecast"><Wind aria-hidden="true" className="h-4 w-4" /></span>
              <div className="source-row__copy">
                <span className="source-row__title">WINDFOR <span>·</span> wind forecast</span>
                <span className="source-row__detail">Hourly target time · MW</span>
              </div>
              <span className="source-row__status"><Check aria-hidden="true" className="h-3.5 w-3.5" />{meta.isSuccess ? 'READY' : 'LOADING'}</span>
            </div>
          </div>
          <div className="source-card__footnote">
            <Database aria-hidden="true" className="h-3.5 w-3.5" />
            <span>Processed archive · UTC stored · London displayed</span>
            <Tooltip content="The chart will align hourly forecasts with paired half-hour actuals using their mean MW value.">
              <button aria-label="About source resolution" className="help-button" type="button"><Info aria-hidden="true" className="h-3.5 w-3.5" /></button>
            </Tooltip>
          </div>
        </Card>

        <Card className="period-card" eyebrow="SELECTED DELIVERY DAY" title="January 2026">
          <div className="period-card__date">
            <span className="period-card__day">{deliveryDate.slice(-2)}</span>
            <span className="period-card__month">JAN</span>
            <span className="period-card__year">2026</span>
          </div>
          <div className="period-card__rule" />
          <div className="period-card__cutoff">
            <span className="period-card__cutoff-label">DECISION CUTOFF</span>
            <span className="period-card__cutoff-value">{cutoff}<span> London · D-1</span></span>
          </div>
          <p className="period-card__note">Forecast availability is evaluated against this cutoff for every target hour.</p>
        </Card>
      </div>

      <div className="workspace-footer">
        <span><span aria-hidden="true" className="footer-check"><Check /></span>Source coverage checked</span>
        <span>National level <span className="footer-dot">·</span> January 2026 only <span className="footer-dot">·</span> All values MW</span>
      </div>
    </div>
  )
}
