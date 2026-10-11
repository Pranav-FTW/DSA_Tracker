import { SourceBadge } from './Progress';

// Source list for mixed sheets, difficulty for single-list sheets (like A2Z).
export default function QuestionBadge({ q, multi }) {
  if (multi) return <SourceBadge source={q.source} />;
  if (q.difficulty) return <span className={`badge diff diff-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>;
  return null;
}
