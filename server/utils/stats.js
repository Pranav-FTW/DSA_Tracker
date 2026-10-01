// Builds progress statistics from the full question list and a Set of completed question ids.
module.exports = function buildStats(questions, doneIds) {
  const bySource = { NeetCode: { total: 0, done: 0 }, Striver: { total: 0, done: 0 }, Both: { total: 0, done: 0 } };
  const patternMap = new Map();
  let completed = 0;

  for (const q of questions) {
    const isDone = doneIds.has(String(q._id));
    if (isDone) completed++;

    bySource[q.source].total++;
    if (isDone) bySource[q.source].done++;

    if (!patternMap.has(q.pattern)) patternMap.set(q.pattern, { pattern: q.pattern, total: 0, done: 0 });
    const p = patternMap.get(q.pattern);
    p.total++;
    if (isDone) p.done++;
  }

  // Same convention as the Excel sheet: "Both" counts towards NeetCode and Striver totals.
  return {
    total: questions.length,
    completed,
    bySource,
    lists: {
      neetcode: {
        total: bySource.NeetCode.total + bySource.Both.total,
        done: bySource.NeetCode.done + bySource.Both.done,
      },
      striver: {
        total: bySource.Striver.total + bySource.Both.total,
        done: bySource.Striver.done + bySource.Both.done,
      },
    },
    byPattern: [...patternMap.values()],
  };
};
