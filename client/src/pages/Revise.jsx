import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTracker } from '../context/TrackerContext';
import NoteModal from '../components/NoteModal';
import { IconNote } from '../components/Icons';
import { REVIEW_DAYS, dueLabel, isDue, reviewLabel } from '../utils/revise';

const LINKS = [
  ['leetcode', 'LeetCode'],
  ['neetcode', 'NeetCode'],
  ['striver', 'Striver'],
  ['youtube', 'Video'],
];

export default function Revise() {
  const { questions, loading, error, reviewQuestion, toggleRevisit, saveNote, setImageCount } = useTracker();
  const [busyId, setBusyId] = useState(null);
  const [noteFor, setNoteFor] = useState(null);

  const flagged = useMemo(
    () => questions.filter((q) => q.revisit && q.nextReviewAt).sort((a, b) => new Date(a.nextReviewAt) - new Date(b.nextReviewAt)),
    [questions]
  );
  const due = flagged.filter(isDue);
  const upcoming = flagged.filter((q) => !isDue(q));

  const review = async (q, result) => {
    setBusyId(q._id);
    await reviewQuestion(q, result);
    setBusyId(null);
  };

  if (loading) return <div className="boot">Loading…</div>;
  if (error) return <div className="form-error">{error}</div>;

  return (
    <div className="page">
      <header className="page-head">
        <h1>Revise today</h1>
        <p className="muted">
          Solved questions you flagged come back after {REVIEW_DAYS.join(', ')} days, so the solution sticks. Flag questions from the{' '}
          <Link to="/tracker" className="link">Tracker</Link>.
        </p>
      </header>

      <section className="card">
        <h2 className="rev-h">To revise now <span className="muted">· {due.length}</span></h2>
        {due.length === 0 ? (
          <p className="muted empty">
            {flagged.length === 0
              ? 'Nothing flagged yet. Open the Tracker and tap "Revise" on a solved question.'
              : 'All caught up for today. Come back tomorrow!'}
          </p>
        ) : (
          <ul className="rev-list">
            {due.map((q) => (
              <li key={q._id} className="rev-row">
                <div className="rev-main">
                  <div className="q-title">{q.title}</div>
                  <div className="muted small">
                    {q.pattern} · {reviewLabel(q)} · <span className={dueLabel(q).startsWith('Overdue') ? 'rev-overdue' : ''}>{dueLabel(q)}</span>
                  </div>
                  <div className="rev-links">
                    {LINKS.filter(([k]) => q[k]).map(([k, label]) => (
                      <a key={k} href={q[k]} target="_blank" rel="noreferrer noopener" className="chip">{label}</a>
                    ))}
                    <button className="chip" onClick={() => setNoteFor(q)}>
                      <IconNote width={13} height={13} /> My notes{q.imageCount > 0 ? ` · ${q.imageCount} 📷` : ''}
                    </button>
                  </div>
                </div>
                <div className="rev-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => review(q, 'remembered')} disabled={busyId === q._id}>
                    Remembered
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => review(q, 'forgot')} disabled={busyId === q._id} title="Start again, due in 3 days">
                    Forgot it
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="card">
          <h2 className="rev-h">Coming up <span className="muted">· {upcoming.length}</span></h2>
          <ul className="rev-list">
            {upcoming.map((q) => (
              <li key={q._id} className="rev-row">
                <div className="rev-main">
                  <div className="q-title">{q.title}</div>
                  <div className="muted small">{q.pattern} · {reviewLabel(q)} · {dueLabel(q)}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleRevisit(q)}>Remove</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {noteFor && (
        <NoteModal
          question={questions.find((q) => q._id === noteFor._id) || noteFor}
          onSave={saveNote}
          onImageCount={setImageCount}
          onClose={() => setNoteFor(null)}
        />
      )}
    </div>
  );
}
