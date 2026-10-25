export function Section({ eyebrow, title, action, children, className = '' }) {
  return (
    <section className={`section ${className}`}>
      {(eyebrow || title || action) && (
        <header className="section__header">
          <div>
            {eyebrow && <p className="section__eyebrow">{eyebrow}</p>}
            {title && <h2 className="section__title">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      <div className="section__body">{children}</div>
    </section>
  )
}
