import { Bar } from './Progress';
import { isMultiSource, pct } from '../utils/stats';

// "By source list" for mixed sheets, "By difficulty" for single-list sheets. `questions` need { difficulty, done }.
export default function BreakdownCard({ stats, questions }) {
  let title;
  let rows;
  let note = null;
  if (isMultiSource(stats)) {
    title = 'By source list';
    rows = [
      ['NeetCode 150', stats.lists.neetcode, 'neetcode'],
      ['Striver Master DSA', stats.lists.striver, 'striver'],
      ['Shared by both', stats.bySource.Both, 'both'],
    ];
    note = 'NeetCode and Striver totals include the shared questions, so they overlap.';
  } else {
    title = 'By difficulty';
    const d = { Easy: { total: 0, done: 0 }, Medium: { total: 0, done: 0 }, Hard: { total: 0, done: 0 } };
    questions.forEach((q) => {
      if (!d[q.difficulty]) return;
      d[q.difficulty].total++;
      if (q.done) d[q.difficulty].done++;
    });
    rows = [['Easy', d.Easy, 'done'], ['Medium', d.Medium, 'neetcode'], ['Hard', d.Hard, 'hard']];
  }
  return (
    <section className="card">
      <h3>{title}</h3>
      <div className="source-list">
        {rows.map(([label, s, tone]) => (
          <div key={label} className="source-row">
            <div className="row between">
              <span>{label}</span>
              <span className="muted small">{s.done} / {s.total} · {pct(s.done, s.total)}%</span>
            </div>
            <Bar done={s.done} total={s.total} tone={tone} />
          </div>
        ))}
      </div>
      {note && <p className="muted small note-line">{note}</p>}
    </section>
  );
}
