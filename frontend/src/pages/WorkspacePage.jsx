import { Activity, AlertTriangle, Check, Clock3, Info, Wind } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client';
import { Card } from '../components/ui/Card';
import { DatePicker } from '../components/ui/DatePicker';
import { KpiCard } from '../components/ui/KpiCard';
import { Select } from '../components/ui/Select';
import { Tooltip } from '../components/ui/Tooltip';
import { DecisionChart } from './DecisionChart';
const cutoffOptions = [
    { value: '08:00', label: '08:00' },
    { value: '09:00', label: '09:00' },
    { value: '10:00', label: '10:00' },
];
const numberFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/London' });
const timestampFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London', timeZoneName: 'short' });
function formatMw(value) {
    return value == null ? '—' : numberFormat.format(value);
}
export function WorkspacePage() {
    const [deliveryDate, setDeliveryDate] = useState('2026-01-15');
    const [cutoff, setCutoff] = useState('09:00');
    const decision = useQuery({
        queryKey: ['decision', deliveryDate, cutoff],
        queryFn: ({ signal }) => api.getDecision(deliveryDate, cutoff, signal),
        enabled: Boolean(deliveryDate),
    });
    const data = decision.data;
    const latestPublish = data?.publishTimesUsed.reduce((latest, value) => latest == null || value > latest ? value : latest, null) ?? null;
    const coverage = data ? `${data.matchedHours} / ${data.expectedHours}` : '—';
    const formattedDate = deliveryDate ? dateFormat.format(new Date(`${deliveryDate}T12:00:00Z`)) : 'Select a delivery day';
    return (<div className="workspace-page decision-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow page-heading__eyebrow"><span className="eyebrow-marker"/>DAY-AHEAD DECISION <span className="eyebrow-separator">/</span> NATIONAL WIND</p>
          <h1>Wind generation</h1>
          <p className="page-heading__description">Forecast information available to the buyer before the delivery day.</p>
        </div>
        <div className="page-controls">
          <DatePicker id="delivery-date" label="DELIVERY DAY" max="2026-01-31" min="2026-01-01" onChange={setDeliveryDate} value={deliveryDate}/>
          <Select id="decision-cutoff" label="D-1 CUTOFF · LONDON" onChange={setCutoff} options={cutoffOptions} value={cutoff}/>
        </div>
      </div>

      {decision.isError && (<div className="inline-alert" role="alert">
          <AlertTriangle aria-hidden="true" className="h-4 w-4"/>
          <span>{decision.error.message || 'The decision data could not be loaded.'}</span>
          <button className="text-button" onClick={() => void decision.refetch()} type="button">Retry</button>
        </div>)}

      {decision.isPending ? (<div aria-label="Loading delivery-day wind forecast" className="decision-loading">
          <div className="decision-loading__chart"/>
          <div className="decision-loading__row"><span /><span /><span /><span /></div>
        </div>) : data ? (<>
          <div className="kpi-grid decision-kpis">
            <KpiCard caption="Selected forecast issue" label="FORECAST PEAK" loading={false} unit="MW" value={formatMw(data.kpis.forecastPeakMw)}/>
            <KpiCard caption="Mean across 24 delivery hours" label="AVERAGE FORECAST" loading={false} unit="MW" value={formatMw(data.kpis.meanForecastMw)}/>
            <KpiCard caption="P90 absolute error · historical" label="RECOMMENDED BUFFER" loading={false} unit="MW" value={formatMw(data.kpis.recommendedBufferMw)}/>
            <KpiCard caption="Forecast and actual both available" label="HOURLY COVERAGE" loading={false} unit="hours" value={coverage}/>
          </div>

          <Card action={<div className="chart-legend"><span><i className="chart-legend__swatch chart-legend__swatch--forecast"/>Forecast</span><span><i className="chart-legend__swatch chart-legend__swatch--actual"/>Actual</span><span><i className="chart-legend__band"/>P10–P90 error band</span></div>} className="decision-chart-card" eyebrow="HOURLY GENERATION" title={`${formattedDate} · MW`}>
            <DecisionChart points={data.points}/>
            <div className="chart-caption">
              <span>Hourly target time · Europe/London</span>
              <span>Band reflects historical forecast error</span>
            </div>
          </Card>

          <div className="decision-detail-grid">
            <Card className="decision-issue-card" eyebrow="FORECAST AVAILABLE AT DECISION TIME" title="Publication details">
              <div className="issue-summary">
                <span className="issue-summary__icon"><Clock3 aria-hidden="true" className="h-4 w-4"/></span>
                <div>
                  <span className="issue-summary__label">LATEST ISSUE USED</span>
                  <strong>{latestPublish ? timestampFormat.format(new Date(latestPublish)) : 'No forecast issue available'}</strong>
                </div>
              </div>
              <div className="detail-list">
                <div><span>Decision cutoff</span><strong>{data.cutoffLocal} Europe/London, previous day</strong></div>
                <div><span>Forecast publications used</span><strong>{data.publishTimesUsed.length}</strong></div>
                <div><span>Matched delivery hours</span><strong>{data.matchedHours} of {data.expectedHours}</strong></div>
              </div>
              <div className="issue-note"><Info aria-hidden="true" className="h-4 w-4"/><span>Only forecast issues published at or before the selected cutoff are included.</span>
                <Tooltip content="The buffer is the historical 90th percentile of absolute forecast error. It is a planning reference, not a market-cost optimum.">
                  <button aria-label="How to read the recommended buffer" className="help-button" type="button"><Info aria-hidden="true" className="h-4 w-4"/></button>
                </Tooltip>
              </div>
            </Card>

            <Card className="decision-source-card" eyebrow="DATA COVERAGE" title="National wind archive">
              <div className="coverage-status"><span className="coverage-status__mark"><Check aria-hidden="true" className="h-4 w-4"/></span><div><strong>{data.matchedHours === data.expectedHours ? 'Complete hourly match' : 'Partial hourly match'}</strong><span>{data.expectedHours} expected delivery hours</span></div></div>
              <div className="source-row source-row--compact">
                <span className="source-row__icon source-row__icon--actual"><Activity aria-hidden="true" className="h-4 w-4"/></span>
                <div className="source-row__copy"><span className="source-row__title">FUELHH · actual wind</span><span className="source-row__detail">30-minute readings averaged to hourly MW</span></div>
              </div>
              <div className="source-row source-row--compact">
                <span className="source-row__icon source-row__icon--forecast"><Wind aria-hidden="true" className="h-4 w-4"/></span>
                <div className="source-row__copy"><span className="source-row__title">WINDFOR · day-ahead forecast</span><span className="source-row__detail">Hourly MW at publication time</span></div>
              </div>
            </Card>
          </div>

          <div className="workspace-footer"><span><span aria-hidden="true" className="footer-check"><Check /></span>Decision-time selection applied</span><span>National level <span className="footer-dot">·</span> January 2026 only <span className="footer-dot">·</span> All values MW</span></div>
        </>) : null}
    </div>);
}
