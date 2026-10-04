import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { useTracker } from '../context/TrackerContext';
import { isDue } from '../utils/revise';
import { pct } from '../utils/stats';
import { Bar } from './Progress';
import ThemeToggle from './ThemeToggle';
import { IconHome, IconList, IconUsers, IconActivity, IconRepeat, IconLogout, IconCheck } from './Icons';

const today = () => new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

export default function Layout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const { questions, stats } = useTracker();
  const dueCount = questions.filter(isDue).length; // questions to revise today
  const [pending, setPending] = useState(0);
  const [unread, setUnread] = useState(0); // unread cheers & nudges

  useEffect(() => {
    api
      .get('/friends')
      .then((r) => setPending(r.data.incoming.length))
      .catch(() => {});
  }, [pathname]);

  // Unread cheers/nudges badge: refresh on navigation, every 60s, and when the Activity page marks them read.
  useEffect(() => {
    const load = () =>
      api
        .get('/cheers/unread-count')
        .then((r) => setUnread(r.data.unread))
        .catch(() => {});
    load();
    const t = setInterval(load, 60000);
    window.addEventListener('notifications:changed', load);
    return () => {
      clearInterval(t);
      window.removeEventListener('notifications:changed', load);
    };
  }, [pathname]);

  const links = [
    { to: '/', label: 'Dashboard', icon: <IconHome />, end: true },
    { to: '/tracker', label: 'Tracker', icon: <IconList /> },
    { to: '/revise', label: 'Revise', icon: <IconRepeat />, badge: dueCount },
    { to: '/friends', label: 'Friends', icon: <IconUsers />, badge: pending },
    { to: '/activity', label: 'Activity', icon: <IconActivity />, badge: unread },
  ];

  const brand = (
    <div className="brand">
      <span className="brand-mark"><IconCheck width={16} height={16} strokeWidth={3} /></span>
      <span>DSA Tracker</span>
    </div>
  );

  return (
    <div className="shell">
      <aside className="sidebar">
        {brand}
        <nav aria-label="Main">
          <span className="nav-label">Menu</span>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {l.icon}
              <span>{l.label}</span>
              {l.badge > 0 && <span className="nav-badge">{l.badge}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="side-progress">
          <div className="row between">
            <span className="small muted">Overall progress</span>
            <strong>{pct(stats.completed, stats.total)}%</strong>
          </div>
          <Bar done={stats.completed} total={stats.total} slim />
          <span className="small muted">{stats.completed} of {stats.total} solved</span>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-brand">{brand}</div>
            <span className="topbar-date muted small">{today()}</span>
          </div>
          <div className="topbar-right">
            <ThemeToggle />
            <div className="user-chip">
              <div className="avatar sm">{user.username[0].toUpperCase()}</div>
              <span className="user-name">@{user.username}</span>
              <button className="icon-btn" onClick={logout} aria-label="Log out" title="Log out">
                <IconLogout />
              </button>
            </div>
          </div>
        </header>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
