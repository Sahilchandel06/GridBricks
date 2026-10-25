export function Skeleton({ className = '', label = 'Loading' }) {
    return <span aria-label={label} className={`skeleton ${className}`} role="status"/>;
}
