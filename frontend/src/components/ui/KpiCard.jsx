import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Skeleton } from './Skeleton';
export function KpiCard({ label, value, unit, caption, loading = false, change }) {
    return (<article className="kpi-card">
      <div className="kpi-card__top">
        <h2 className="eyebrow">{label}</h2>
        {change && (<span className={`kpi-card__change kpi-card__change--${change.direction}`}>
            {change.direction === 'up' ? <ArrowUpRight aria-hidden="true"/> : <ArrowDownRight aria-hidden="true"/>}
            {change.value}
          </span>)}
      </div>
      {loading ? (<Skeleton className="kpi-card__skeleton" label={`Loading ${label}`}/>) : (<p className="kpi-card__value">
          <span>{value}</span>
          {unit && <span className="kpi-card__unit">{unit}</span>}
        </p>)}
      {caption && <p className="kpi-card__caption">{caption}</p>}
    </article>);
}
