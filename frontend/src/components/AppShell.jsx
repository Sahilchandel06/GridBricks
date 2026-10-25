import { Activity, BarChart3, BookOpen, Moon, Sun, Wind } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useTheme } from '../theme/ThemeContext';
const navigation = [
    { to: '/decision', label: 'Decision', icon: Activity },
    { to: '/accuracy', label: 'Accuracy', icon: BarChart3 },
    { to: '/method', label: 'Method', icon: BookOpen },
];
function ThemeButton() {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const Icon = isDark ? Sun : Moon;
    return (<button aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`} className="icon-button" onClick={toggleTheme} title={`Switch to ${isDark ? 'light' : 'dark'} theme`} type="button">
      <Icon aria-hidden="true" className="h-4 w-4"/>
    </button>);
}
function Brand() {
    return (<div className="brand-lockup">
      <span className="brand-mark"><Wind aria-hidden="true" className="h-4 w-4"/></span>
      <span className="brand-wordmark">Grid<span>Bricks</span></span>
      <span className="brand-divider"/>
      <span className="brand-product">Energy</span>
    </div>);
}
function NavItems({ mobile = false }) {
    return (<nav aria-label="Primary navigation" className={mobile ? 'nav-list nav-list--mobile' : 'nav-list'}>
      {navigation.map(({ to, label, icon: Icon }) => (<NavLink className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`} key={to} to={to}>
          <Icon aria-hidden="true" className="h-4 w-4"/>
          <span>{label}</span>
        </NavLink>))}
    </nav>);
}
function ConnectionMark() {
    const meta = useQuery({ queryKey: ['meta'], queryFn: ({ signal }) => api.getMeta(signal) });
    const state = meta.isSuccess ? 'connected' : meta.isError ? 'offline' : 'checking';
    return (<div className="connection-mark" title={meta.isError ? 'Local API unavailable' : meta.isSuccess ? 'Elexon archive loaded' : 'Checking API'}>
      <span aria-hidden="true" className={`status-dot status-dot--${state}`}/>
      <span>{state === 'connected' ? 'Archive ready' : state === 'offline' ? 'API offline' : 'Checking source'}</span>
    </div>);
}
export function AppShell() {
    return (<div className="app-frame">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar__section-label">WORKSPACE</div>
        <NavItems />
        <div className="sidebar__spacer"/>
        <div className="sidebar__bottom">
          <div className="sidebar__source">
            <div className="sidebar__source-icon"><Wind aria-hidden="true" className="h-4 w-4"/></div>
            <div>
              <p className="sidebar__source-title">National wind</p>
              <p className="sidebar__source-subtitle">Elexon BMRS</p>
            </div>
          </div>
          <ConnectionMark />
          <p className="sidebar__version">GRIDBRICKS <span>·</span> JAN 2026</p>
        </div>
      </aside>

      <div className="app-column">
        <div className="mobile-header">
          <Brand />
          <ThemeButton />
        </div>
        <div className="mobile-nav"><NavItems mobile/></div>
        <header className="topbar">
          <div className="topbar__context">
            <span className="topbar__context-primary">ENERGY MARKETS</span>
            <span className="topbar__slash">/</span>
            <span>UK WIND</span>
          </div>
          <div className="topbar__actions">
            <ConnectionMark />
            <span className="topbar__separator"/>
            <span className="topbar__range">JANUARY 2026</span>
            <ThemeButton />
          </div>
        </header>
        <main className="main-content"><Outlet /></main>
      </div>
    </div>);
}
