import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { useTracker } from '../context/TrackerContext';
import { isDue } from '../utils/revise';
import { IconHome, IconList, IconUsers, IconActivity, IconRepeat, IconLogout, IconCheck } from './Icons';

export default function Layout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const { questions } = useTracker();
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

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><IconCheck width={16} height={16} strokeWidth={3} /></span>
          <span>DSA Tracker</span>
        </div>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {l.icon}
              <span>{l.label}</span>
              {l.badge > 0 && <span className="nav-badge">{l.badge}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="me">
          <div className="avatar">{user.username[0].toUpperCase()}</div>
          <div className="me-name">@{user.username}</div>
          <button className="icon-btn" onClick={logout} aria-label="Log out" title="Log out">
            <IconLogout />
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
