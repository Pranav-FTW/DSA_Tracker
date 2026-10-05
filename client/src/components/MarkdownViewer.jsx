import { useMemo } from 'react';
import { renderMarkdown } from '../utils/markdown';

export default function MarkdownViewer({ content, className = '', onEditClick }) {
  const html = useMemo(() => renderMarkdown(content || ''), [content]);

  const handleClick = (e) => {
    const btn = e.target.closest('.md-copy-btn');
    if (!btn) return;
    e.stopPropagation();

    const rawCode = btn.getAttribute('data-code');
    if (!rawCode) return;

    const code = decodeURIComponent(rawCode);
    navigator.clipboard.writeText(code).then(() => {
      const span = btn.querySelector('span');
      const originalText = span ? span.textContent : 'Copy';
      btn.classList.add('copied');
      if (span) span.textContent = 'Copied!';

      setTimeout(() => {
        btn.classList.remove('copied');
        if (span) span.textContent = originalText;
      }, 1800);
    });
  };

  if (!content || !content.trim()) {
    return (
      <div className="md-empty">
        <div className="md-empty-icon">📝</div>
        <p className="muted">No notes recorded yet for this question.</p>
        {onEditClick && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onEditClick}>
            Write note or paste ChatGPT answer
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`md-rendered-wrap ${className}`}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
