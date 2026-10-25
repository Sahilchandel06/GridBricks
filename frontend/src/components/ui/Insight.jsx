export function Insight({ children }) {
  return (
    <p className="insight">
      <span aria-hidden="true" className="insight__mark" />
      <span>{children}</span>
    </p>
  )
}
