import { Activity, BarChart3, BookOpen, Moon, Sun, Wind } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { NavLink, Outlet } from 'react-router-dom'
import { api } from '../api/client'
import { useTheme } from '../theme/ThemeContext'

const navigation = [
  { to: '/decision', label: 'Decision', icon: Activity },
  { to: '/accuracy', label: 'Accuracy', icon: BarChart3 },
  { to: '/method', label: 'Method', icon: BookOpen },
]

function ThemeButton() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const Icon = isDark ? Sun : Moon

  return (
    <button
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      className="icon-button"
      onClick={toggleTheme}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      type="button"
    >
      <Icon aria-hidden="true" size={16} />
    </button>
  )
}

function Brand() {
  return (
    <div className="brand-lockup">
      <Wind aria-hidden="true" className="brand-mark" size={16} />
      <span className="brand-wordmark">GridBricks</span>
      <span className="brand-divider" />
      <span className="brand-product">Energy</span>
    </div>
  )
}

function NavItems({ mobile = false }) {
  return (
    <nav aria-label="Primary navigation" className={mobile ? 'nav-list nav-list--mobile' : 'nav-list'}>
      {navigation.map(({ to, label, icon: Icon }) => (
        <NavLink
          className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}
          key={to}
          to={to}
        >
          <Icon aria-hidden="true" size={16} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function ConnectionMark() {
  const meta = useQuery({ queryKey: ['meta'], queryFn: ({ signal }) => api.getMeta(signal) })
  const state = meta.isSuccess ? 'connected' : meta.isError ? 'offline' : 'checking'
  const label = state === 'connected' ? 'Archive ready' : state === 'offline' ? 'API offline' : 'Checking archive'

  return (
    <span className="connection-mark" title={meta.isError ? 'Local API unavailable' : 'Elexon BMRS archive status'}>
      <span aria-hidden="true" className={`status-mark status-mark--${state}`} />
      {label}
    </span>
  )
}

export function AppShell() {
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Brand />
        <NavItems />
        <div className="sidebar__bottom">
          <span>National wind</span>
          <span>Elexon BMRS · January 2026</span>
        </div>
      </aside>

      <div className="app-column">
        <div className="mobile-header">
          <Brand />
          <div className="mobile-header__actions">
            <span>Jan 2026</span>
            <ThemeButton />
          </div>
        </div>
        <div className="mobile-nav"><NavItems mobile /></div>
        <header className="topbar">
          <p className="topbar__context">UK wind · day-ahead analysis</p>
          <div className="topbar__actions">
            <ConnectionMark />
            <span className="topbar__range">January 2026</span>
            <ThemeButton />
          </div>
        </header>
        <main className="main-content"><Outlet /></main>
      </div>
    </div>
  )
}
