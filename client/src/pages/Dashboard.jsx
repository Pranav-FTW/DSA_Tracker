import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTracker } from '../context/TrackerContext';
import { ProgressRing, Bar, CheckBox, SourceBadge } from '../components/Progress';
import { pct, timeAgo } from '../utils/stats';

export default function Dashboard() {
  const { user } = useAuth();
  const { questions, stats, loading, error, toggleDone } = useTracker();

  const upNext = useMemo(() => questions.filter((q) => !q.done).slice(0, 5), [questions]);
  const recent = useMemo(
    () => questions.filter((q) => q.done && q.completedAt).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)).slice(0, 5),
    [questions]
  );

  if (loading) return <div className="boot">Loading your progress…</div>;
  if (error) return <div className="form-error">{error}</div>;

  const remaining = stats.total - stats.completed;
  const finished = remaining === 0;

  return (
    <div className="page">
      <header className="page-head">
        <h1>Hi, {user.username}</h1>
        <p className="muted">
          {finished
            ? 'Every problem is done. Nicely finished.'
            : stats.completed === 0
            ? 'Nothing solved yet. Start with the first problem below.'
            : `${remaining} problems left across ${stats.byPattern.filter((p) => p.done < p.total).length} patterns.`}
        </p>
      </header>

      <div className="grid-top">
        <section className="card ring-card">
          <ProgressRing done={stats.completed} total={stats.total} />
          <div className="ring-meta">
            <h3>Overall progress</h3>
            <dl className="mini-stats">
              <div><dt>Solved</dt><dd className="t-done">{stats.completed}</dd></div>
              <div><dt>Remaining</dt><dd>{remaining}</dd></div>
              <div><dt>Total</dt><dd>{stats.total}</dd></div>
            </dl>
          </div>
        </section>

        <section className="card">
          <h3>By source list</h3>
          <div className="source-list">
            {[
              ['NeetCode 150', stats.lists.neetcode, 'neetcode'],
              ['Striver Master DSA', stats.lists.striver, 'striver'],
              ['Shared by both', stats.bySource.Both, 'both'],
            ].map(([label, s, tone]) => (
              <div key={label} className="source-row">
                <div className="row between">
                  <span>{label}</span>
                  <span className="muted small">{s.done} / {s.total} · {pct(s.done, s.total)}%</span>
                </div>
                <Bar done={s.done} total={s.total} tone={tone} />
              </div>
            ))}
          </div>
          <p className="muted small note-line">NeetCode and Striver totals include the shared questions, so they overlap.</p>
        </section>
      </div>

      <div className="grid-two">
        <section className="card">
          <div className="row between">
            <h3>Up next</h3>
            <Link to="/tracker" className="link small">Open tracker</Link>
          </div>
          {upNext.length === 0 ? (
            <p className="muted empty">You've solved everything on the list.</p>
          ) : (
            <ul className="mini-list">
              {upNext.map((q) => (
                <li key={q._id}>
                  <CheckBox checked={q.done} onChange={() => toggleDone(q)} label={`Mark ${q.title} as solved`} />
                  <div className="grow">
                    <div className="q-title">{q.title}</div>
                    <div className="muted small">{q.pattern}</div>
                  </div>
                  <SourceBadge source={q.source} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h3>Recently solved</h3>
          {recent.length === 0 ? (
            <p className="muted empty">Problems you solve will show up here.</p>
          ) : (
            <ul className="mini-list">
              {recent.map((q) => (
                <li key={q._id}>
                  <CheckBox checked onChange={() => toggleDone(q)} label={`Mark ${q.title} as not solved`} />
                  <div className="grow">
                    <div className="q-title">{q.title}</div>
                    <div className="muted small">{q.pattern}</div>
                  </div>
                  <span className="muted small nowrap">{timeAgo(q.completedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <h3>Progress by pattern</h3>
        <div className="pattern-grid">
          {stats.byPattern.map((p) => (
            <Link key={p.pattern} to={`/tracker?pattern=${encodeURIComponent(p.pattern)}`} className="pattern-row">
              <div className="row between">
                <span className="pattern-name">{p.pattern}</span>
                <span className={`small ${p.done === p.total ? 't-done' : 'muted'}`}>{p.done}/{p.total}</span>
              </div>
              <Bar done={p.done} total={p.total} slim />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
