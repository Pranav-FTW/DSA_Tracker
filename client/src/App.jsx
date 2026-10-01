import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Tracker from './pages/Tracker';
import Friends from './pages/Friends';
import FriendProfile from './pages/FriendProfile';

function Private({ children }) {
  const { user, booting } = useAuth();
  if (booting) return <div className="boot">Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function Public({ children }) {
  const { user, booting } = useAuth();
  if (booting) return <div className="boot">Loading…</div>;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Public><AuthPage mode="login" /></Public>} />
      <Route path="/register" element={<Public><AuthPage mode="register" /></Public>} />
      <Route element={<Private><Layout /></Private>}>
        <Route index element={<Dashboard />} />
        <Route path="tracker" element={<Tracker />} />
        <Route path="friends" element={<Friends />} />
        <Route path="friends/:username" element={<FriendProfile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
