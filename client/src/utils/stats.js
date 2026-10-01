// Computes dashboard numbers from the question list. Used by both Dashboard and Tracker,
// so ticking a question updates every screen instantly.
export function computeStats(questions) {
  const src = { NeetCode: { total: 0, done: 0 }, Striver: { total: 0, done: 0 }, Both: { total: 0, done: 0 } };
  const patterns = new Map();
  let completed = 0;

  for (const q of questions) {
    src[q.source].total++;
    if (q.done) {
      completed++;
      src[q.source].done++;
    }
    if (!patterns.has(q.pattern)) patterns.set(q.pattern, { pattern: q.pattern, total: 0, done: 0 });
    const p = patterns.get(q.pattern);
    p.total++;
    if (q.done) p.done++;
  }

  return {
    total: questions.length,
    completed,
    bySource: src,
    lists: {
      neetcode: { total: src.NeetCode.total + src.Both.total, done: src.NeetCode.done + src.Both.done },
      striver: { total: src.Striver.total + src.Both.total, done: src.Striver.done + src.Both.done },
    },
    byPattern: [...patterns.values()],
  };
}

export const pct = (done, total) => (total ? Math.round((done / total) * 100) : 0);

export function timeAgo(date) {
  if (!date) return 'never';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d > 1 ? 's' : ''} ago`;
  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
