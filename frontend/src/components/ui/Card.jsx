export function Card({ title, eyebrow, action, children, className = '' }) {
    return (<section className={`surface-card ${className}`}>
      {(title || eyebrow || action) && (<div className="surface-card__header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2 className="surface-card__title">{title}</h2>}
          </div>
          {action}
        </div>)}
      <div className="surface-card__body">{children}</div>
    </section>);
}
