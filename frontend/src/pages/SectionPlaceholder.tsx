import { BarChart3, BookOpen } from 'lucide-react'

const copy = {
  accuracy: {
    title: 'Forecast accuracy',
    description: 'A quantitative view of day-ahead forecast error across the January delivery window.',
    icon: BarChart3,
  },
  method: {
    title: 'Method & sources',
    description: 'Definitions, source coverage, and the assumptions behind the wind forecast analysis.',
    icon: BookOpen,
  },
}

export function SectionPlaceholder({ section }: { section: keyof typeof copy }) {
  const { title, description, icon: Icon } = copy[section]
  return (
    <section className="section-placeholder">
      <span className="section-placeholder__icon"><Icon aria-hidden="true" className="h-5 w-5" /></span>
      <p className="eyebrow">JANUARY 2026 <span className="eyebrow-separator">/</span> UK WIND</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  )
}
