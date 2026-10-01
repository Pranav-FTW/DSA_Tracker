import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { IconHome, IconList, IconUsers, IconLogout, IconCheck } from './Icons';

export default function Layout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    api
      .get('/friends')
      .then((r) => setPending(r.data.incoming.length))
      .catch(() => {});
  }, [pathname]);

  const links = [
    { to: '/', label: 'Dashboard', icon: <IconHome />, end: true },
    { to: '/tracker', label: 'Tracker', icon: <IconList /> },
    { to: '/friends', label: 'Friends', icon: <IconUsers />, badge: pending },
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
