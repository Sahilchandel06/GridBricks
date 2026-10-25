import { ArrowDownRight, ArrowUpRight, BookOpen, Database, ExternalLink, Info, Layers3, Scale } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'

const numberFormat = new Intl.NumberFormat('en-GB')

const sources = [
  {
    name: 'FUELHH · actual generation',
    dataset: 'National wind output, fuelType = WIND',
    grain: '30-minute settlement periods',
    href: 'https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream',
    label: 'FUELHH stream documentation',
    style: 'method-source__actual',
  },
  {
    name: 'WINDFOR · wind forecast',
    dataset: 'National hourly wind forecast with issue time',
    grain: 'Hourly target time · published forecast versions',
    href: 'https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream',
    label: 'WINDFOR stream documentation',
    style: 'method-source__forecast',
  },
]

function SourceLink({ href, children }: { href: string; children: string }) {
  return <a className="method-link" href={href} rel="noreferrer" target="_blank">{children}<ExternalLink aria-hidden="true" className="h-3.5 w-3.5" /></a>
}

export function MethodPage() {
  const meta = useQuery({ queryKey: ['meta'], queryFn: ({ signal }) => api.getMeta(signal) })
  const quality = meta.data?.dataQuality

  return (
    <div className="workspace-page method-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow page-heading__eyebrow"><span className="eyebrow-marker" />ANALYSIS NOTES <span className="eyebrow-separator">/</span> DATA & DEFINITIONS</p>
          <h1>Method & sources</h1>
          <p className="page-heading__description">How the January decision-time wind analysis is assembled and where its limits are.</p>
        </div>
      </div>

      <div className="method-callout"><BookOpen aria-hidden="true" className="h-4 w-4" /><p><strong>Scope.</strong> January 2026, GB national wind actuals and forecasts from Elexon BMRS. The analysis describes renewable generation available to a day-ahead buyer; it does not calculate total power procurement.</p></div>

      <Card className="method-flow-card" eyebrow="FROM SOURCE TO DECISION" title="Four steps make the comparison">
        <div className="method-flow">
          <article><span className="method-flow__number">01</span><h3>Set a decision time</h3><p>Use a D-1 cutoff in Europe/London. The default is 09:00 on the day before delivery.</p></article>
          <article><span className="method-flow__number">02</span><h3>Select eligible issues</h3><p>For every delivery hour, select the latest WINDFOR publication at or before that cutoff.</p></article>
          <article><span className="method-flow__number">03</span><h3>Align actual output</h3><p>Average the two corresponding FUELHH half-hours to compare against each hourly forecast.</p></article>
          <article><span className="method-flow__number">04</span><h3>Measure forecast error</h3><p>Compute metrics only on matched pairs. Missing source readings stay missing; they are not imputed.</p></article>
        </div>
      </Card>

      <div className="method-two-column">
        <Card eyebrow="PRIMARY SOURCES" title="Elexon BMRS datasets">
          <div className="method-source-list">
            {sources.map((source) => (
              <article className={`method-source ${source.style}`} key={source.name}>
                <span className="method-source__icon"><Database aria-hidden="true" className="h-4 w-4" /></span>
                <div className="method-source__body"><h3>{source.name}</h3><p>{source.dataset}</p><span>{source.grain}</span><SourceLink href={source.href}>{source.label}</SourceLink></div>
              </article>
            ))}
          </div>
        </Card>

        <Card eyebrow="ARCHIVE COVERAGE" title="January 2026 source checks">
          {meta.isPending ? <div className="method-quality-loading"><Skeleton label="Loading archive coverage" /><Skeleton label="Loading forecast coverage" /><Skeleton label="Loading hourly coverage" /></div> : quality ? (
            <div className="method-quality-list">
              <div><span>FUELHH actual records</span><strong>{numberFormat.format(quality.actualRows)} <small>half-hours</small></strong></div>
              <div><span>Actual gaps</span><strong>{numberFormat.format(quality.missingHalfHours)} <small>of {numberFormat.format(quality.expectedHalfHours)} periods</small></strong></div>
              <div><span>WINDFOR forecast versions</span><strong>{numberFormat.format(quality.forecastRows)} <small>target-hour issues</small></strong></div>
              <div><span>Delivery hours with any forecast</span><strong>{numberFormat.format(quality.coveredTargetHours)} / 744</strong></div>
              <div className="method-quality-list__status"><span>Processed source archive</span><strong>{quality.missingHalfHours === 0 && quality.uncoveredTargetHours === 0 ? 'Complete' : 'Gaps reported'}</strong></div>
            </div>
          ) : <p className="method-muted">Archive coverage is unavailable. Check the API connection.</p>}
        </Card>
      </div>

      <Card className="metric-definitions" eyebrow="METRIC DEFINITIONS" title="What each number means">
        <div className="metric-definition-grid">
          <article><Scale aria-hidden="true" className="h-4 w-4" /><h3>Mean absolute error</h3><code>mean(|forecast − actual|)</code><p>Average miss in MW; direction is discarded.</p></article>
          <article><Layers3 aria-hidden="true" className="h-4 w-4" /><h3>RMSE</h3><code>sqrt(mean(error²))</code><p>Gives larger misses more weight than MAE.</p></article>
          <article><ArrowUpRight aria-hidden="true" className="h-4 w-4" /><h3>Bias</h3><code>mean(forecast − actual)</code><p>Positive means output was over-forecast; negative means under-forecast.</p></article>
          <article><ArrowDownRight aria-hidden="true" className="h-4 w-4" /><h3>P90 buffer reference</h3><code>P90(|forecast − actual|)</code><p>A historical uncertainty reference, not an optimized reserve or purchase quantity.</p></article>
          <article><Info aria-hidden="true" className="h-4 w-4" /><h3>MAPE</h3><code>mean(|error / actual|) × 100</code><p>Excludes periods with actual generation at or below 100 MW to avoid unstable percentages near zero.</p></article>
          <article><Layers3 aria-hidden="true" className="h-4 w-4" /><h3>Normalized MAE</h3><code>MAE / mean(actual)</code><p>Expresses MAE relative to mean observed generation for scale context.</p></article>
        </div>
      </Card>

      <div className="method-limits">
        <Card eyebrow="INTERPRETATION" title="What this analysis can say">
          <ul><li>Forecast accuracy varies with lead time, delivery hour, and the actual wind-output band.</li><li>Forecast error is reported as wind generation forecast minus wind generation actual.</li><li>Uncertainty bands describe empirical forecast error across the January sample at the selected cutoff.</li></ul>
        </Card>
        <Card eyebrow="LIMITS" title="What it cannot say">
          <ul><li>Demand is not included, so residual load and total day-ahead purchases cannot be calculated.</li><li>January is one month; these statistics do not establish annual or seasonal performance.</li><li>The symmetric P90 buffer does not include asymmetric imbalance costs, prices, or risk preference.</li></ul>
        </Card>
      </div>

      <div className="method-api-links"><span>API reference</span><SourceLink href="/api/docs">Interactive API documentation</SourceLink><SourceLink href="/api/openapi.json">OpenAPI schema</SourceLink><SourceLink href="https://developer.data.elexon.co.uk/">Elexon developer portal</SourceLink></div>
      <div className="workspace-footer"><span>Source and method documentation</span><span>January 2026 <span className="footer-dot">·</span> Europe/London <span className="footer-dot">·</span> MW</span></div>
    </div>
  )
}
