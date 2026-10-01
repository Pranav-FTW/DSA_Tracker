import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useToast } from '../context/ToastContext';
import { Bar } from '../components/Progress';
import { IconSearch, IconUserPlus, IconCheck, IconX } from '../components/Icons';
import { pct, timeAgo } from '../utils/stats';

export default function Friends() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const load = useCallback(
    () =>
      api
        .get('/friends')
        .then((r) => setData(r.data))
        .catch((e) => setError(errorMessage(e))),
    []
  );
  useEffect(() => {
    load();
  }, [load]);

  const runSearch = useCallback(async (term) => {
    setSearching(true);
    try {
      setResults((await api.get('/friends/search', { params: { q: term } })).data.users);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced username search
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => runSearch(term), 300);
    return () => clearTimeout(t);
  }, [q, runSearch]);

  const act = async (fn, okMsg) => {
    try {
      const res = await fn();
      toast.success(okMsg || res?.data?.message || 'Done');
      await load();
      if (q.trim().length >= 2) runSearch(q.trim());
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const sendRequest = (username) => act(() => api.post('/friends/request', { username }));
  const accept = (id) => act(() => api.post(`/friends/${id}/accept`), 'Friend added');
  const remove = (id, msg) => act(() => api.delete(`/friends/${id}`), msg);

  if (error) return <div className="form-error">{error}</div>;
  if (!data) return <div className="boot">Loading friends…</div>;

  // Leaderboard = me + friends, ranked by solved count
  const board = [{ ...data.me, isMe: true }, ...data.friends].sort((a, b) => b.completed - a.completed || a.username.localeCompare(b.username));

  return (
    <div className="page">
      <header className="page-head">
        <h1>Friends</h1>
        <p className="muted">Add friends by username to follow their progress. They can see what you've solved, never your notes.</p>
      </header>

      <section className="card">
        <h3>Find a friend</h3>
        <div className="search search-wide">
          <IconSearch />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by username" aria-label="Search users" />
        </div>
        {q.trim().length >= 2 && (
          <ul className="people">
            {searching && !results && <li className="muted small">Searching…</li>}
            {results && results.length === 0 && <li className="muted small">No user found starting with "{q.trim()}".</li>}
            {results?.map((u) => (
              <li key={u.id}>
                <div className="avatar sm">{u.username[0].toUpperCase()}</div>
                <span className="grow">@{u.username}</span>
                {u.relation === 'none' && (
                  <button className="btn btn-primary btn-sm" onClick={() => sendRequest(u.username)}>
                    <IconUserPlus /> Add friend
                  </button>
                )}
                {u.relation === 'sent' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => remove(u.friendshipId, 'Request cancelled')}>Requested · Cancel</button>
                )}
                {u.relation === 'received' && (
                  <button className="btn btn-primary btn-sm" onClick={() => accept(u.friendshipId)}>Accept request</button>
                )}
                {u.relation === 'friends' && <span className="tag-friend"><IconCheck width={14} height={14} /> Friends</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {(data.incoming.length > 0 || data.outgoing.length > 0) && (
        <section className="card">
          <h3>Requests</h3>
          <ul className="people">
            {data.incoming.map((r) => (
              <li key={r.friendshipId}>
                <div className="avatar sm">{r.username[0].toUpperCase()}</div>
                <span className="grow">@{r.username} <span className="muted small">wants to be friends</span></span>
                <button className="btn btn-primary btn-sm" onClick={() => accept(r.friendshipId)}>Accept</button>
                <button className="btn btn-ghost btn-sm" onClick={() => remove(r.friendshipId, 'Request declined')}>Decline</button>
              </li>
            ))}
            {data.outgoing.map((r) => (
              <li key={r.friendshipId}>
                <div className="avatar sm">{r.username[0].toUpperCase()}</div>
                <span className="grow">@{r.username} <span className="muted small">request sent</span></span>
                <button className="btn btn-ghost btn-sm" onClick={() => remove(r.friendshipId, 'Request cancelled')} aria-label={`Cancel request to ${r.username}`}>
                  <IconX width={14} height={14} /> Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h3>Leaderboard</h3>
        {data.friends.length === 0 ? (
          <p className="muted empty">No friends yet. Search for a username above to add your first one.</p>
        ) : (
          <ul className="board">
            {board.map((p, i) => {
              const inner = (
                <>
                  <span className="rank">{i + 1}</span>
                  <div className="avatar sm">{p.username[0].toUpperCase()}</div>
                  <div className="grow">
                    <div className="row between">
                      <span className="q-title">@{p.username}{p.isMe && <span className="you">You</span>}</span>
                      <span className="small">
                        <strong>{p.completed}</strong> <span className="muted">/ {p.total} · {pct(p.completed, p.total)}%</span>
                      </span>
                    </div>
                    <Bar done={p.completed} total={p.total} slim tone={p.isMe ? 'neetcode' : 'done'} />
                    <div className="muted small">{p.lastSolvedAt ? `Last solved ${timeAgo(p.lastSolvedAt)}` : 'Nothing solved yet'}</div>
                  </div>
                </>
              );
              return (
                <li key={p.username} className={p.isMe ? 'is-me' : ''}>
                  {p.isMe ? <div className="board-row">{inner}</div> : <Link to={`/friends/${p.username}`} className="board-row">{inner}</Link>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
