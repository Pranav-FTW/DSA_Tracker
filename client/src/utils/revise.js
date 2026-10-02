// Spaced repetition helpers (the server decides the dates; these only format and filter them).
export const REVIEW_DAYS = [3, 7, 30];
const DAY = 24 * 60 * 60 * 1000;

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

// A question is due if its review date is today or earlier (in the user's own timezone).
export const isDue = (q) => !!q.revisit && !!q.nextReviewAt && startOfDay(q.nextReviewAt) <= startOfDay(new Date());

export function dueLabel(q) {
  if (!q.nextReviewAt) return '';
  const days = Math.round((startOfDay(q.nextReviewAt) - startOfDay(new Date())) / DAY);
  if (days < 0) return `Overdue by ${-days} day${days === -1 ? '' : 's'}`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

// Which review is next: "Review 1 of 3".
export const reviewLabel = (q) => `Review ${Math.min((q.revisitStep || 0) + 1, REVIEW_DAYS.length)} of ${REVIEW_DAYS.length}`;
