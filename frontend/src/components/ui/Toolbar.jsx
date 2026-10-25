export function Toolbar({ children, className = '', label = 'View controls' }) {
  return (
    <div aria-label={label} className={`toolbar ${className}`} role="group">
      {children}
    </div>
  )
}
