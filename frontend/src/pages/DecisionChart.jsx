const width = 960;
const height = 320;
const margin = { top: 18, right: 18, bottom: 39, left: 60 };
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
const numberFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
function x(index, total) {
    return margin.left + (total < 2 ? 0 : (index / (total - 1)) * innerWidth);
}
function seriesPath(points, value, y) {
    let open = false;
    return points.map((point, index) => {
        const current = value(point);
        if (current == null) {
            open = false;
            return '';
        }
        const command = open ? 'L' : 'M';
        open = true;
        return `${command}${x(index, points.length).toFixed(1)},${y(current).toFixed(1)}`;
    }).filter(Boolean).join(' ');
}
export function DecisionChart({ points }) {
    const valid = points.flatMap((point) => [point.forecast, point.actual, point.bandLow, point.bandHigh].filter((value) => value != null));
    const maxValue = Math.max(5000, Math.ceil(Math.max(...valid, 0) / 5000) * 5000);
    const tickStep = maxValue / 4;
    const y = (value) => margin.top + innerHeight - (value / maxValue) * innerHeight;
    const bandSegments = [];
    for (const point of points) {
        if (point.bandLow == null || point.bandHigh == null)
            bandSegments.push([]);
        else if (bandSegments.length === 0)
            bandSegments.push([point]);
        else
            bandSegments[bandSegments.length - 1].push(point);
    }
    const forecastPath = seriesPath(points, (point) => point.forecast, y);
    const actualPath = seriesPath(points, (point) => point.actual, y);
    const labelIndexes = [0, 6, 12, 18, points.length - 1].filter((index, position, values) => index >= 0 && index < points.length && values.indexOf(index) === position);
    const hasForecast = points.some((point) => point.forecast != null);
    return (<div aria-label="Hourly wind generation chart" className={`decision-chart${hasForecast ? '' : ' decision-chart--empty'}`} role="img">
      {!hasForecast && <span className="decision-chart__empty">No forecast was issued before this decision cutoff.</span>}
      <svg aria-hidden="true" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
        {[0, 1, 2, 3, 4].map((tick) => {
            const value = tick * tickStep;
            const yPosition = y(value);
            return <g key={tick}><line className="chart-gridline" x1={margin.left} x2={width - margin.right} y1={yPosition} y2={yPosition}/><text className="chart-axis-label" dominantBaseline="middle" textAnchor="end" x={margin.left - 10} y={yPosition}>{numberFormat.format(value)}</text></g>;
        })}
        {bandSegments.filter((segment) => segment.length > 1).map((segment) => {
            const coords = [
                ...segment.map((point) => `${x(points.indexOf(point), points.length).toFixed(1)},${y(point.bandHigh).toFixed(1)}`),
                ...[...segment].reverse().map((point) => `${x(points.indexOf(point), points.length).toFixed(1)},${y(point.bandLow).toFixed(1)}`),
            ].join(' ');
            return <polygon className="chart-error-band" key={segment[0].startTime} points={coords}/>;
        })}
        {forecastPath && <path className="chart-line chart-line--forecast" d={forecastPath}/>}
        {actualPath && <path className="chart-line chart-line--actual" d={actualPath}/>}
        {labelIndexes.map((index) => {
            const point = points[index];
            const value = point.startTime;
            return <text className="chart-axis-label chart-axis-label--time" key={value} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'} x={x(index, points.length)} y={height - 9}>{timeFormat.format(new Date(value))}</text>;
        })}
        {points.map((point, index) => point.forecast == null && point.actual == null ? null : (<g key={point.startTime}>
            {point.forecast != null && <circle className="chart-point chart-point--forecast" cx={x(index, points.length)} cy={y(point.forecast)} r="3"><title>{`${timeFormat.format(new Date(point.startTime))} forecast: ${numberFormat.format(point.forecast)} MW`}</title></circle>}
            {point.actual != null && <circle className="chart-point chart-point--actual" cx={x(index, points.length)} cy={y(point.actual)} r="3"><title>{`${timeFormat.format(new Date(point.startTime))} actual: ${numberFormat.format(point.actual)} MW`}</title></circle>}
          </g>))}
      </svg>
    </div>);
}
