import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTracker } from '../context/TrackerContext';
import NoteModal from '../components/NoteModal';
import { Bar, CheckBox, SourceBadge } from '../components/Progress';
import { IconChevron, IconNote, IconRepeat, IconSearch } from '../components/Icons';
import { dueLabel } from '../utils/revise';

const LINKS = [
  ['leetcode', 'LeetCode'],
  ['neetcode', 'NeetCode'],
  ['striver', 'Striver'],
  ['youtube', 'Video'],
];

export default function Tracker() {
  const { questions, stats, loading, error, toggleDone, saveNote, setImageCount, toggleRevisit } = useTracker();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('all');
  const [status, setStatus] = useState('all');
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [noteFor, setNoteFor] = useState(null);

  const pattern = params.get('pattern') || 'all';
  const setPattern = (v) => (v === 'all' ? setParams({}) : setParams({ pattern: v }));

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return questions.filter((q) => {
      if (pattern !== 'all' && q.pattern !== pattern) return false;
      if (source === 'neetcode' && q.source === 'Striver') return false;
      if (source === 'striver' && q.source === 'NeetCode') return false;
      if (source === 'both' && q.source !== 'Both') return false;
      if (status === 'done' && !q.done) return false;
      if (status === 'todo' && q.done) return false;
      if (status === 'notes' && !q.note && !q.imageCount) return false;
      if (status === 'revising' && !q.revisit) return false;
      if (s && !q.title.toLowerCase().includes(s) && !q.note.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [questions, pattern, source, status, search]);

  const groups = useMemo(() => {
    const m = new Map();
    filtered.forEach((q) => m.set(q.pattern, [...(m.get(q.pattern) || []), q]));
    return [...m.entries()];
  }, [filtered]);

  const patternStats = useMemo(() => new Map(stats.byPattern.map((p) => [p.pattern, p])), [stats]);

  const toggleGroup = (name) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const filtersActive = pattern !== 'all' || source !== 'all' || status !== 'all' || search;
  const reset = () => {
    setSearch('');
    setSource('all');
    setStatus('all');
    setParams({});
  };

  if (loading) return <div className="boot">Loading tracker…</div>;
  if (error) return <div className="form-error">{error}</div>;

  return (
    <div className="page">
      <header className="page-head row between wrap">
        <div>
          <h1>Tracker</h1>
          <p className="muted">
            {stats.completed} of {stats.total} solved · showing {filtered.length}
          </p>
        </div>
        <div className="head-progress">
          <Bar done={stats.completed} total={stats.total} />
        </div>
      </header>

      <div className="toolbar">
        <div className="search">
          <IconSearch />
          <input placeholder="Search problems or your notes" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
        </div>
        <select value={pattern} onChange={(e) => setPattern(e.target.value)} aria-label="Pattern">
          <option value="all">All patterns</option>
          {stats.byPattern.map((p) => (
            <option key={p.pattern} value={p.pattern}>{p.pattern}</option>
          ))}
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Source list">
          <option value="all">All lists</option>
          <option value="neetcode">NeetCode 150</option>
          <option value="striver">Striver</option>
          <option value="both">Shared by both</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="all">Any status</option>
          <option value="todo">Not solved</option>
          <option value="done">Solved</option>
          <option value="notes">Has notes</option>
          <option value="revising">In revision</option>
        </select>
        {filtersActive && <button className="btn btn-ghost" onClick={reset}>Clear filters</button>}
      </div>

      {groups.length === 0 && (
        <div className="card empty-card">
          <p>No problems match these filters.</p>
          <button className="btn btn-ghost" onClick={reset}>Clear filters</button>
        </div>
      )}

      {groups.map(([name, items]) => {
        const ps = patternStats.get(name);
        const open = !collapsed.has(name);
        return (
          <section key={name} className="group">
            <button className="group-head" onClick={() => toggleGroup(name)} aria-expanded={open}>
              <IconChevron className={`chev ${open ? 'open' : ''}`} />
              <span className="group-name">{name}</span>
              <span className="group-count">{ps.done}/{ps.total}</span>
              <span className="group-bar"><Bar done={ps.done} total={ps.total} slim /></span>
            </button>

            {open && (
              <ul className="rows">
                {items.map((q) => (
                  <li key={q._id} className={`qrow ${q.done ? 'is-done' : ''}`}>
                    <CheckBox checked={q.done} onChange={() => toggleDone(q)} label={`Mark ${q.title} as ${q.done ? 'not solved' : 'solved'}`} />
                    <span className="qnum">{q.number}</span>
                    <div className="qmain">
                      <div className="q-title">{q.title}</div>
                      {q.info && <div className="muted small">{q.info}</div>}
                      {q.revisit && <div className="rev-tag"><IconRepeat width={13} height={13} /> {dueLabel(q)}</div>}
                      {(q.note || q.imageCount > 0) && (
                        <button className="note-preview" onClick={() => setNoteFor(q)} title="Edit note">
                          {q.imageCount > 0 && <span>📷 {q.imageCount} photo{q.imageCount > 1 ? 's' : ''}{q.note ? ' · ' : ''}</span>}
                          {q.note}
                        </button>
                      )}
                    </div>
                    <SourceBadge source={q.source} />
                    <div className="qlinks">
                      {q.done && (
                        <button
                          className={`chip revise-chip ${q.revisit ? 'on' : ''}`}
                          onClick={() => toggleRevisit(q)}
                          aria-pressed={q.revisit}
                          title={q.revisit ? 'Remove from revision' : 'Add to revision (reviews after 3, 7 and 30 days)'}
                        >
                          <IconRepeat width={13} height={13} /> {q.revisit ? 'Revising' : 'Revise'}
                        </button>
                      )}
                      {LINKS.filter(([k]) => q[k]).map(([k, label]) => (
                        <a key={k} href={q[k]} target="_blank" rel="noreferrer noopener" className="chip" title={`Open ${label} in a new tab`}>
                          {label}
                        </a>
                      ))}
                    </div>
                    <button className={`icon-btn note-btn ${q.note || q.imageCount > 0 ? 'has-note' : ''}`} onClick={() => setNoteFor(q)} aria-label={q.note || q.imageCount > 0 ? 'Edit note' : 'Add note'} title={q.note || q.imageCount > 0 ? 'Edit note' : 'Add note'}>
                      <IconNote />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

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
