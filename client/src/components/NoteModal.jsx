import { useEffect, useRef, useState } from 'react';
import { IconX } from './Icons';

export default function NoteModal({ question, onSave, onClose }) {
  const [text, setText] = useState(question.note || '');
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    setSaving(true);
    const ok = await onSave(question, text);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={`Notes for ${question.title}`}>
        <div className="modal-head">
          <div>
            <h3>{question.title}</h3>
            <p className="muted small">{question.pattern}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <IconX />
          </button>
        </div>
        <textarea
          ref={ref}
          value={text}
          maxLength={2000}
          placeholder="Approach, time/space complexity, mistakes to avoid…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && save()}
        />
        <div className="modal-foot">
          <span className="muted small">{text.length}/2000 · only you can see your notes</span>
          <div className="row gap">
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
