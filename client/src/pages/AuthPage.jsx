import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api';
import { IconCheck } from '../components/Icons';

export default function AuthPage({ mode }) {
  const { login, register } = useAuth();
  const isLogin = mode === 'login';
  const [form, setForm] = useState({ username: '', email: '', identifier: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isLogin) await login(form.identifier, form.password);
      else await register(form.username, form.email, form.password);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <section className="auth-intro">
        <div className="brand">
          <span className="brand-mark"><IconCheck width={16} height={16} strokeWidth={3} /></span>
          <span>DSA Tracker</span>
        </div>
        <h1>269 problems. 17 patterns. One list to finish.</h1>
        <p>
          NeetCode 150 and Striver's Master DSA combined without duplicates. Tick problems off, keep your own notes,
          and add friends to see how far along they are.
        </p>
        <ul className="auth-points">
          <li>Every problem links to LeetCode, NeetCode, Striver and video solutions</li>
          <li>Notes stay private. Friends only see what you've solved</li>
        </ul>
      </section>

      <form className="auth-card" onSubmit={submit}>
        <h2>{isLogin ? 'Welcome back' : 'Create your account'}</h2>
        <p className="muted">{isLogin ? 'Log in to pick up where you left off.' : 'Free, and it takes a few seconds.'}</p>

        {isLogin ? (
          <label>
            Username or email
            <input value={form.identifier} onChange={set('identifier')} autoComplete="username" required autoFocus />
          </label>
        ) : (
          <>
            <label>
              Username
              <input value={form.username} onChange={set('username')} autoComplete="username" placeholder="e.g. code_ninja" required autoFocus />
              <small>3-20 characters. Friends will find you with this.</small>
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
            </label>
          </>
        )}
        <label>
          Password
          <input type="password" value={form.password} onChange={set('password')} autoComplete={isLogin ? 'current-password' : 'new-password'} minLength={isLogin ? undefined : 6} required />
          {!isLogin && <small>At least 6 characters.</small>}
        </label>

        {error && <div className="form-error" role="alert">{error}</div>}

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}
        </button>
        <p className="auth-switch">
          {isLogin ? (
            <>New here? <Link to="/register">Create an account</Link></>
          ) : (
            <>Already have an account? <Link to="/login">Log in</Link></>
          )}
        </p>
      </form>
    </div>
  );
}
