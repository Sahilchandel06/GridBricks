const numberFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
function signed(value) {
    if (value === 0)
        return '0';
    return `${value > 0 ? '+' : '−'}${numberFormat.format(Math.abs(value))}`;
}
export function ErrorHistogram({ bins }) {
    const width = 720;
    const height = 240;
    const margin = { top: 16, right: 14, bottom: 37, left: 43 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const min = bins[0]?.fromMw ?? -1;
    const max = bins.at(-1)?.toMw ?? 1;
    const maxCount = Math.max(...bins.map((bin) => bin.count), 1);
    const scaleX = (value) => margin.left + ((value - min) / (max - min)) * innerWidth;
    const scaleY = (value) => margin.top + innerHeight - (value / maxCount) * innerHeight;
    const zeroX = scaleX(0);
    const xTicks = [min, 0, max];
    return (<div aria-label="Histogram of forecast minus actual errors in megawatts" className="accuracy-chart" role="img">
      <svg aria-hidden="true" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
        {[0, .5, 1].map((fraction) => {
            const count = Math.round(maxCount * fraction);
            const y = scaleY(count);
            return <g key={fraction}><line className="chart-gridline" x1={margin.left} x2={width - margin.right} y1={y} y2={y}/><text className="chart-axis-label" dominantBaseline="middle" textAnchor="end" x={margin.left - 8} y={y}>{numberFormat.format(count)}</text></g>;
        })}
        {bins.map((bin) => {
            const left = scaleX(bin.fromMw) + 1;
            const right = scaleX(bin.toMw) - 1;
            const barY = scaleY(bin.count);
            return <rect className={`histogram-bar${bin.fromMw < 0 && bin.toMw > 0 ? ' histogram-bar--zero' : bin.toMw <= 0 ? ' histogram-bar--negative' : ''}`} key={`${bin.fromMw}-${bin.toMw}`} height={margin.top + innerHeight - barY} width={Math.max(right - left, 1)} x={left} y={barY}><title>{`${signed(bin.fromMw)} to ${signed(bin.toMw)} MW: ${bin.count} hours`}</title></rect>;
        })}
        <line className="histogram-zero-line" x1={zeroX} x2={zeroX} y1={margin.top} y2={margin.top + innerHeight}/>
        {xTicks.map((tick) => <text className="chart-axis-label" dominantBaseline="hanging" key={tick} textAnchor={tick === min ? 'start' : tick === max ? 'end' : 'middle'} x={scaleX(tick)} y={height - 24}>{signed(tick)}</text>)}
        <text className="chart-axis-label" textAnchor="middle" x={width / 2} y={height - 6}>FORECAST − ACTUAL (MW)</text>
      </svg>
    </div>);
}
export function MetricBarChart({ groups, unit }) {
    const width = 960;
    const height = 250;
    const margin = { top: 15, right: 14, bottom: 36, left: 48 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const max = Math.max(...groups.map((group) => group.value ?? 0), 1);
    const barWidth = Math.max(2, (innerWidth / Math.max(groups.length, 1)) * .66);
    const scaleY = (value) => margin.top + innerHeight - (value / max) * innerHeight;
    const ticks = [0, .5, 1];
    return (<div aria-label={`Mean absolute error by delivery hour in ${unit}`} className="accuracy-chart accuracy-chart--hour" role="img">
      <svg aria-hidden="true" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
        {ticks.map((fraction) => {
            const yValue = max * fraction;
            const y = scaleY(yValue);
            return <g key={fraction}><line className="chart-gridline" x1={margin.left} x2={width - margin.right} y1={y} y2={y}/><text className="chart-axis-label" dominantBaseline="middle" textAnchor="end" x={margin.left - 8} y={y}>{numberFormat.format(yValue)}</text></g>;
        })}
        {groups.map((group, index) => {
            const slotWidth = innerWidth / Math.max(groups.length, 1);
            const x = margin.left + index * slotWidth + (slotWidth - barWidth) / 2;
            const y = group.value == null ? scaleY(0) : scaleY(group.value);
            return <rect className="metric-bar" height={margin.top + innerHeight - y} key={group.label} width={barWidth} x={x} y={y}><title>{`${group.label}: ${group.value == null ? 'no data' : `${numberFormat.format(group.value)} MW MAE`} · ${group.sample} hours`}</title></rect>;
        })}
        {groups.map((group, index) => index % 3 === 0 || index === groups.length - 1 ? (<text className="chart-axis-label chart-axis-label--time" dominantBaseline="hanging" key={group.label} textAnchor="middle" x={margin.left + index * (innerWidth / Math.max(groups.length, 1)) + (innerWidth / Math.max(groups.length, 1)) / 2} y={height - 24}>{group.label.slice(0, 2)}</text>) : null)}
        <text className="chart-axis-label" textAnchor="middle" x={width / 2} y={height - 6}>DELIVERY HOUR · {unit.toUpperCase()}</text>
      </svg>
    </div>);
}
