export function KpiRow({ items, label = 'Key metrics' }) {
  return (
    <dl aria-label={label} className="kpi-row">
      {items.map(({ label: itemLabel, value, unit = '' }) => (
        <div className="kpi-stat" key={itemLabel}>
          <dt>{itemLabel}</dt>
          <dd>
            <span className="kpi-stat__value">{value}</span>
            {unit && <span className="kpi-stat__unit">{unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}
