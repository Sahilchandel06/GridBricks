import { useState } from 'react'

const width = 960
const height = 320
const margin = { top: 16, right: 16, bottom: 40, left: 72 }
const innerWidth = width - margin.left - margin.right
const innerHeight = height - margin.top - margin.bottom
const timeFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/London',
})
const numberFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })

function x(index, total) {
  return margin.left + (total < 2 ? 0 : (index / (total - 1)) * innerWidth)
}

function seriesPath(points, value, y) {
  let open = false
  return points.map((point, index) => {
    const current = value(point)
    if (current == null) {
      open = false
      return ''
    }
    const command = open ? 'L' : 'M'
    open = true
    return `${command}${x(index, points.length).toFixed(1)},${y(current).toFixed(1)}`
  }).filter(Boolean).join(' ')
}

function displayMw(value) {
  return value == null ? 'Not available' : `${numberFormat.format(value)} MW`
}

export function DecisionChart({ points }) {
  const [activeIndex, setActiveIndex] = useState(null)
  const valid = points.flatMap((point) => [point.forecast, point.actual, point.bandLow, point.bandHigh]
    .filter((value) => value != null))
  const maxValue = Math.max(5000, Math.ceil(Math.max(...valid, 0) / 5000) * 5000)
  const tickStep = maxValue / 4
  const y = (value) => margin.top + innerHeight - (value / maxValue) * innerHeight
  const bandSegments = []

  for (const point of points) {
    if (point.bandLow == null || point.bandHigh == null) bandSegments.push([])
    else if (bandSegments.length === 0) bandSegments.push([point])
    else bandSegments[bandSegments.length - 1].push(point)
  }

  const forecastPath = seriesPath(points, (point) => point.forecast, y)
  const actualPath = seriesPath(points, (point) => point.actual, y)
  const labelIndexes = [0, 6, 12, 18, points.length - 1]
    .filter((index, position, values) => index >= 0 && index < points.length && values.indexOf(index) === position)
  const activePoint = activeIndex == null ? null : points[activeIndex]

  function selectFromPointer(event) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const chartX = ((event.clientX - bounds.left) / bounds.width) * width
    const position = Math.max(0, Math.min(1, (chartX - margin.left) / innerWidth))
    setActiveIndex(Math.round(position * Math.max(points.length - 1, 0)))
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      const step = event.key === 'ArrowRight' ? 1 : -1
      const next = activeIndex == null ? 0 : activeIndex + step
      setActiveIndex(Math.max(0, Math.min(points.length - 1, next)))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(points.length - 1)
    } else if (event.key === 'Escape') {
      setActiveIndex(null)
    }
  }

  return (
    <div
      aria-label="Hourly wind generation chart. Use left and right arrow keys to inspect each delivery hour."
      className="decision-chart"
      onKeyDown={handleKeyDown}
      onPointerLeave={() => setActiveIndex(null)}
      onPointerMove={selectFromPointer}
      role="group"
      tabIndex={0}
    >
      {activePoint && (
        <div aria-live="polite" className="decision-chart-tooltip">
          <strong className="timestamp">{timeFormat.format(new Date(activePoint.startTime))} Europe/London</strong>
          <span><span>Forecast</span>{displayMw(activePoint.forecast)}</span>
          <span><span>Actual</span>{displayMw(activePoint.actual)}</span>
          <span><span>Error</span>{displayMw(activePoint.forecast == null || activePoint.actual == null ? null : activePoint.forecast - activePoint.actual)}</span>
          <span><span>Band</span>{activePoint.bandLow == null || activePoint.bandHigh == null
            ? 'Not available'
            : `${numberFormat.format(activePoint.bandLow)}–${numberFormat.format(activePoint.bandHigh)} MW`}</span>
        </div>
      )}
      {!forecastPath && <p className="chart-empty">No forecast was issued before this decision cutoff.</p>}
      <svg aria-hidden="true" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
        {[0, 1, 2, 3, 4].map((tick) => {
          const value = tick * tickStep
          const yPosition = y(value)
          return (
            <g key={tick}>
              <line className="chart-gridline" x1={margin.left} x2={width - margin.right} y1={yPosition} y2={yPosition} />
              <text className="chart-axis-label" dominantBaseline="middle" textAnchor="end" x={margin.left - 8} y={yPosition}>{numberFormat.format(value)}</text>
            </g>
          )
        })}
        {bandSegments.filter((segment) => segment.length > 1).map((segment) => {
          const coords = [
            ...segment.map((point) => `${x(points.indexOf(point), points.length).toFixed(1)},${y(point.bandHigh).toFixed(1)}`),
            ...[...segment].reverse().map((point) => `${x(points.indexOf(point), points.length).toFixed(1)},${y(point.bandLow).toFixed(1)}`),
          ].join(' ')
          return <polygon className="chart-error-band" key={segment[0].startTime} points={coords} />
        })}
        {forecastPath && <path className="chart-line chart-line--forecast" d={forecastPath} />}
        {actualPath && <path className="chart-line chart-line--actual" d={actualPath} />}
        {activeIndex != null && (
          <line className="chart-active-rule" x1={x(activeIndex, points.length)} x2={x(activeIndex, points.length)} y1={margin.top} y2={margin.top + innerHeight} />
        )}
        {labelIndexes.map((index) => {
          const point = points[index]
          return (
            <text
              className="chart-axis-label chart-axis-label--time"
              key={point.startTime}
              textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
              x={x(index, points.length)}
              y={height - 8}
            >
              {timeFormat.format(new Date(point.startTime))}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
