import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api';
import CheerButtons from '../components/CheerButtons';
import { IconHeart, IconZap } from '../components/Icons';
import { timeAgo } from '../utils/stats';

function Feed() {
  const [items, setItems] = useState(null);
  const [next, setNext] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    api
      .get('/activity')
      .then((r) => {
        setItems(r.data.items);
        setNext(r.data.next);
        setHasMore(r.data.hasMore);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const r = await api.get('/activity', { params: { before: next } });
      setItems((prev) => [...prev, ...r.data.items]);
      setNext(r.data.next);
      setHasMore(r.data.hasMore);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  };

  if (error) return <div className="form-error">{error}</div>;
  if (!items) return <div className="boot">Loading activity…</div>;
  if (items.length === 0)
    return (
      <p className="muted empty">
        Nothing here yet. When your friends solve questions they'll show up here. <Link to="/friends" className="link">Find friends</Link>
      </p>
    );

  return (
    <>
      <ul className="feed">
        {items.map((it) => (
          <li key={it.id}>
            <div className="avatar sm">{it.username[0].toUpperCase()}</div>
            <div className="grow">
              <div>
                <Link to={`/friends/${it.username}`} className="link"><strong>@{it.username}</strong></Link> solved <strong>{it.title}</strong>
              </div>
              <div className="muted small">{it.pattern} · {timeAgo(it.completedAt)}</div>
            </div>
            <CheerButtons username={it.username} questionId={it.questionId} only="cheer" />
          </li>
        ))}
      </ul>
      {hasMore && (
        <button className="btn btn-ghost btn-sm" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Loading…' : 'Load older activity'}
        </button>
      )}
    </>
  );
}

function Notifications() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/cheers/notifications')
      .then(async (r) => {
        setData(r.data); // keep the "new" highlight for this visit
        if (r.data.unread > 0) {
          await api.post('/cheers/read');
          window.dispatchEvent(new Event('notifications:changed')); // refresh sidebar badge
        }
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <div className="form-error">{error}</div>;
  if (!data) return <div className="boot">Loading notifications…</div>;
  if (data.items.length === 0) return <p className="muted empty">No cheers or nudges yet.</p>;

  return (
    <ul className="feed">
      {data.items.map((n) => (
        <li key={n.id} className={n.read ? '' : 'is-new'}>
          <div className={`notif-icon ${n.type}`}>{n.type === 'cheer' ? <IconHeart /> : <IconZap />}</div>
          <div className="grow">
            <div>
              <Link to={`/friends/${n.from}`} className="link"><strong>@{n.from}</strong></Link>{' '}
              {n.type === 'cheer'
                ? n.questionTitle ? <>cheered you for solving <strong>{n.questionTitle}</strong></> : 'cheered you on'
                : 'nudged you: keep going!'}
            </div>
            <div className="muted small">{timeAgo(n.createdAt)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Activity() {
  const [tab, setTab] = useState('feed');
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(
    () => api.get('/cheers/unread-count').then((r) => setUnread(r.data.unread)).catch(() => {}),
    []
  );
  useEffect(() => {
    refreshUnread();
    window.addEventListener('notifications:changed', refreshUnread);
    return () => window.removeEventListener('notifications:changed', refreshUnread);
  }, [refreshUnread]);

  return (
    <div className="page">
      <header className="page-head">
        <h1>Activity</h1>
        <p className="muted">See what your friends are solving, and cheer them on. Only accepted friends can see your activity.</p>
      </header>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'feed'} className={`tab ${tab === 'feed' ? 'active' : ''}`} onClick={() => setTab('feed')}>
          Friends' activity
        </button>
        <button role="tab" aria-selected={tab === 'notifs'} className={`tab ${tab === 'notifs' ? 'active' : ''}`} onClick={() => setTab('notifs')}>
          Cheers &amp; nudges {unread > 0 && <span className="nav-badge inline">{unread}</span>}
        </button>
      </div>

      <section className="card">{tab === 'feed' ? <Feed /> : <Notifications />}</section>
    </div>
  );
}
