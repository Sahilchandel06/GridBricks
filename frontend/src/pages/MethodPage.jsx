import { ExternalLink } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { Section } from '../components/ui/Section'
import { Skeleton } from '../components/ui/Skeleton'

const numberFormat = new Intl.NumberFormat('en-GB')
const sources = [
  {
    name: 'FUELHH · actual generation',
    dataset: 'National wind output, fuelType = WIND',
    grain: '30-minute settlement periods',
    href: 'https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream',
    label: 'FUELHH stream documentation',
  },
  {
    name: 'WINDFOR · wind forecast',
    dataset: 'National hourly wind forecast with issue time',
    grain: 'Hourly target time · published forecast versions',
    href: 'https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream',
    label: 'WINDFOR stream documentation',
  },
]
const steps = [
  ['Set a decision time', 'Use a D-1 cutoff in Europe/London. The default is 09:00 on the day before delivery.'],
  ['Select eligible issues', 'For every delivery hour, select the latest WINDFOR publication at or before that cutoff.'],
  ['Align actual output', 'Average the two corresponding FUELHH half-hours to compare against each hourly forecast.'],
  ['Measure forecast error', 'Compute metrics only on matched pairs. Missing source readings stay missing; they are not imputed.'],
]

function SourceLink({ href, children }) {
  return (
    <a className="text-link" href={href} rel="noreferrer" target="_blank">
      {children}
      <ExternalLink aria-hidden="true" size={16} />
    </a>
  )
}

export function MethodPage() {
  const meta = useQuery({ queryKey: ['meta'], queryFn: ({ signal }) => api.getMeta(signal) })
  const quality = meta.data?.dataQuality

  return (
    <div className="workspace-page method-page">
      <div className="page-heading page-heading--simple">
        <div className="page-heading__copy">
          <p className="eyebrow">Analysis notes · Data and definitions</p>
          <h1>Method & sources</h1>
          <p className="page-heading__description">How the January decision-time wind analysis is assembled, and where it has limits.</p>
        </div>
      </div>

      <p className="scope-note">
        January 2026, GB national wind actuals and forecasts from Elexon BMRS. This analysis describes renewable generation available to a day-ahead buyer; it does not calculate total power procurement.
      </p>

      <Section eyebrow="From source to decision" title="Four steps make the comparison">
        <ol className="method-steps">
          {steps.map(([title, description], index) => (
            <li key={title}>
              <span aria-hidden="true" className="method-step__number">0{index + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <div className="method-two-column">
        <Section eyebrow="Primary sources" title="Elexon BMRS datasets">
          <div className="source-list">
            {sources.map((source) => (
              <div className="source-entry" key={source.name}>
                <div>
                  <h3>{source.name}</h3>
                  <p>{source.dataset}</p>
                  <p>{source.grain}</p>
                </div>
                <SourceLink href={source.href}>{source.label}</SourceLink>
              </div>
            ))}
          </div>
        </Section>

        <Section eyebrow="Archive coverage" title="January 2026 source checks">
          {meta.isPending ? (
            <div aria-label="Loading archive coverage" className="method-quality-loading">
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          ) : quality ? (
            <dl className="detail-list">
              <div><dt>FUELHH actual records</dt><dd>{numberFormat.format(quality.actualRows)} half-hours</dd></div>
              <div><dt>Actual gaps</dt><dd>{numberFormat.format(quality.missingHalfHours)} of {numberFormat.format(quality.expectedHalfHours)} periods</dd></div>
              <div><dt>WINDFOR forecast versions</dt><dd>{numberFormat.format(quality.forecastRows)} target-hour issues</dd></div>
              <div><dt>Delivery hours with a forecast</dt><dd>{numberFormat.format(quality.coveredTargetHours)} / 744 hours</dd></div>
              <div><dt>Processed source archive</dt><dd>{quality.missingHalfHours === 0 && quality.uncoveredTargetHours === 0 ? 'Complete' : 'Gaps reported'}</dd></div>
            </dl>
          ) : (
            <p className="plain-note">Archive coverage is unavailable. Check the API connection.</p>
          )}
        </Section>
      </div>

      <Section eyebrow="Metric definitions" title="What each number means">
        <dl className="definitions-grid">
          <div><dt>Mean absolute error</dt><dd>mean(|forecast − actual|). Average miss in MW; direction is discarded.</dd></div>
          <div><dt>RMSE</dt><dd>sqrt(mean(error²)). Gives larger misses more weight than MAE.</dd></div>
          <div><dt>Bias</dt><dd>mean(forecast − actual). Positive means output was over-forecast.</dd></div>
          <div><dt>P90 buffer reference</dt><dd>P90(|forecast − actual|). A historical uncertainty reference, not an optimized reserve quantity.</dd></div>
          <div><dt>MAPE</dt><dd>mean(|error / actual|) × 100. Excludes output at or below 100 MW.</dd></div>
          <div><dt>Normalized MAE</dt><dd>MAE / mean(actual). Expresses MAE relative to observed generation.</dd></div>
        </dl>
      </Section>

      <div className="method-two-column method-limits">
        <Section eyebrow="Interpretation" title="What this analysis can say">
          <ul className="plain-list">
            <li>Forecast accuracy varies with lead time, delivery hour, and actual wind-output level.</li>
            <li>Forecast error is wind generation forecast minus wind generation actual.</li>
            <li>Uncertainty bands describe historical forecast error at the selected cutoff.</li>
          </ul>
        </Section>
        <Section eyebrow="Limits" title="What it cannot say">
          <ul className="plain-list">
            <li>Demand is not included, so residual load and total power purchases cannot be calculated.</li>
            <li>January is one month; these statistics do not establish annual performance.</li>
            <li>The symmetric P90 buffer excludes market prices, asymmetric costs, and risk preference.</li>
          </ul>
        </Section>
      </div>

      <nav aria-label="API references" className="method-api-links">
        <span>API reference</span>
        <SourceLink href="/api/docs">Interactive API documentation</SourceLink>
        <SourceLink href="/api/openapi.json">OpenAPI schema</SourceLink>
        <SourceLink href="https://developer.data.elexon.co.uk/">Elexon developer portal</SourceLink>
      </nav>
    </div>
  )
}
