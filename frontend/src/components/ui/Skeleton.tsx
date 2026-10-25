interface SkeletonProps {
  className?: string
  label?: string
}

export function Skeleton({ className = '', label = 'Loading' }: SkeletonProps) {
  return <span aria-label={label} className={`skeleton ${className}`} role="status" />
}
