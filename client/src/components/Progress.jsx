import { pct } from '../utils/stats';

export function ProgressRing({ done, total, size = 168, stroke = 14 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = total ? done / total : 0;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`${pct(done, total)} percent complete`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--done)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset .5s ease' }}
        />
      </svg>
      <div className="ring-label">
        <strong>{pct(done, total)}%</strong>
        <span>
          {done} / {total}
        </span>
      </div>
    </div>
  );
}

export function Bar({ done, total, tone = 'done', slim = false }) {
  return (
    <div className={`bar ${slim ? 'bar-slim' : ''}`} role="progressbar" aria-valuenow={done} aria-valuemax={total}>
      <div className={`bar-fill tone-${tone}`} style={{ width: `${pct(done, total)}%` }} />
    </div>
  );
}

export function SourceBadge({ source }) {
  const label = source === 'Both' ? 'Both lists' : source === 'NeetCode' ? 'NeetCode' : 'Striver';
  return <span className={`badge badge-${source.toLowerCase()}`}>{label}</span>;
}

export function CheckBox({ checked, onChange, label, readOnly = false }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={`check ${checked ? 'is-on' : ''}`}
      onClick={readOnly ? undefined : onChange}
      disabled={readOnly}
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </button>
  );
}
