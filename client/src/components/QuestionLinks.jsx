import { IconCode, IconPlay } from './Icons';

// Compact icon buttons for a question's external links (replaces the text chips).
const META = {
  leetcode: { label: 'LeetCode', tip: 'Open on LeetCode', cls: 'lc' },
  neetcode: { label: 'NeetCode', tip: 'Open on NeetCode', cls: 'nc' },
  striver: { label: 'Striver', tip: 'Open Striver sheet', cls: 'sv' },
  youtube: { label: 'Video', tip: 'Watch video explanation', cls: 'yt' },
};
const ORDER = ['leetcode', 'neetcode', 'striver', 'youtube'];

function Glyph({ type }) {
  if (type === 'leetcode') return <IconCode width={16} height={16} />;
  if (type === 'youtube') return <IconPlay width={14} height={14} />;
  return <span className="mono">{type === 'neetcode' ? 'N' : 'S'}</span>;
}

export default function QuestionLinks({ q }) {
  return ORDER.filter((k) => q[k]).map((k) => (
    <a key={k} href={q[k]} target="_blank" rel="noreferrer noopener" className={`link-ico ${META[k].cls}`} title={META[k].tip} aria-label={META[k].tip}>
      <Glyph type={k} />
    </a>
  ));
}
