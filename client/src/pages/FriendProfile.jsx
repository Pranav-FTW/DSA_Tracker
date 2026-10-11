import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useToast } from '../context/ToastContext';
import { ProgressRing, Bar, CheckBox } from '../components/Progress';
import BreakdownCard from '../components/BreakdownCard';
import QuestionBadge from '../components/QuestionBadge';
import { useTracker } from '../context/TrackerContext';
import { IconChevron } from '../components/Icons';
import CheerButtons from '../components/CheerButtons';
import { isMultiSource, timeAgo } from '../utils/stats';

export default function FriendProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { sheet, sheetId } = useTracker();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(() => new Set());

  useEffect(() => {
    setData(null);
    setError('');
    api
      .get(`/friends/${username}/progress`, { params: { sheet: sheetId } })
      .then((r) => setData(r.data))
      .catch((e) => setError(errorMessage(e, 'Could not load progress.')));
  }, [username, sheetId]);

  const byPattern = useMemo(() => {
    const m = new Map();
    data?.questions.forEach((q) => m.set(q.pattern, [...(m.get(q.pattern) || []), q]));
    return m;
  }, [data]);

  const lastSolved = useMemo(
    () => data?.questions.filter((q) => q.completedAt).map((q) => new Date(q.completedAt)).sort((a, b) => b - a)[0],
    [data]
  );

  const removeFriend = async () => {
    if (!window.confirm(`Remove @${username} from your friends?`)) return;
    try {
      await api.delete(`/friends/${data.user.friendshipId}`);
      toast.success('Friend removed');
      navigate('/friends');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const toggle = (name) =>
    setOpen((prev) => {
      const n = new Set(prev);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });

  if (error)
    return (
      <div className="page">
        <div className="form-error">{error}</div>
        <p><Link to="/friends" className="link">Back to friends</Link></p>
      </div>
    );
  if (!data) return <div className="boot">Loading @{username}…</div>;

  const { stats } = data;

  return (
    <div className="page">
      <Link to="/friends" className="link small">← All friends</Link>
      <header className="page-head row between wrap">
        <div className="row gap">
          <div className="avatar lg">{username[0].toUpperCase()}</div>
          <div>
            <h1>@{username}</h1>
            <p className="muted">{lastSolved ? `Last solved ${timeAgo(lastSolved)}` : 'Nothing solved yet'}</p>
          </div>
        </div>
        <div className="row gap wrap">
          <CheerButtons username={username} />
          <button className="btn btn-danger btn-sm" onClick={removeFriend}>Remove friend</button>
        </div>
      </header>

      <div className="grid-top">
        <section className="card ring-card">
          <ProgressRing done={stats.completed} total={stats.total} />
          <div className="ring-meta">
            <h3>Overall progress</h3>
            <dl className="mini-stats">
              <div><dt>Solved</dt><dd className="t-done">{stats.completed}</dd></div>
              <div><dt>Remaining</dt><dd>{stats.total - stats.completed}</dd></div>
              <div><dt>Total</dt><dd>{stats.total}</dd></div>
            </dl>
          </div>
        </section>
        <BreakdownCard stats={stats} questions={data.questions} />
      </div>

      <section className="card">
        <h3>Patterns{sheet ? ` · ${sheet.short}` : ''}</h3>
        <div className="friend-patterns">
          {stats.byPattern.map((p) => {
            const isOpen = open.has(p.pattern);
            return (
              <div key={p.pattern} className="fp">
                <button className="fp-head" onClick={() => toggle(p.pattern)} aria-expanded={isOpen}>
                  <IconChevron className={`chev ${isOpen ? 'open' : ''}`} />
                  <span className="pattern-name grow">{p.pattern}</span>
                  <span className={`small ${p.done === p.total ? 't-done' : 'muted'}`}>{p.done}/{p.total}</span>
                  <span className="group-bar"><Bar done={p.done} total={p.total} slim /></span>
                </button>
                {isOpen && (
                  <ul className="mini-list">
                    {byPattern.get(p.pattern).map((q) => (
                      <li key={q._id} className={q.done ? '' : 'dim'}>
                        <CheckBox checked={q.done} readOnly label={`${q.title}: ${q.done ? 'solved' : 'not solved'}`} />
                        <div className="grow q-title">{q.title}</div>
                        <QuestionBadge q={q} multi={isMultiSource(stats)} />
                        {q.done && <span className="muted small nowrap">{timeAgo(q.completedAt)}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
