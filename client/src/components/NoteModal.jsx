import { useCallback, useEffect, useRef, useState } from 'react';
import api, { errorMessage } from '../api';
import { useToast } from '../context/ToastContext';
import { compressImage, uploadToCloudinary } from '../utils/image';
import {
  htmlToMarkdown,
  isRichHtml,
  looksLikeMarkdown,
  DSA_TEMPLATES,
} from '../utils/markdown';
import MarkdownViewer from './MarkdownViewer';
import {
  IconX,
  IconImage,
  IconTrash,
  IconEye,
  IconEdit,
  IconColumns,
  IconMaximize,
  IconMinimize,
  IconBold,
  IconItalic,
  IconHeading,
  IconCode,
  IconList,
  IconListOrdered,
  IconQuote,
  IconLink,
  IconTable,
  IconSparkles,
} from './Icons';

const MAX_PHOTOS = 2;
const MAX_NOTE_LENGTH = 10000;

export default function NoteModal({ question, onSave, onClose, onImageCount }) {
  const toast = useToast();
  const [text, setText] = useState(question.note || '');
  // Default to 'preview' if note exists so user sees formatted output immediately; otherwise 'write'
  const [mode, setMode] = useState(question.note?.trim() ? 'preview' : 'write');
  const [isExpanded, setIsExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState(null); // null = loading
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState(null); // image shown full-size
  const [showTemplates, setShowTemplates] = useState(false);

  const ref = useRef(null);
  const fileRef = useRef(null);
  const viewingRef = useRef(null);
  viewingRef.current = viewing;

  useEffect(() => {
    if (mode === 'write' || mode === 'split') {
      ref.current?.focus();
    }
  }, [mode]);

  useEffect(() => {
    // Escape closes the full-size photo first, then the modal.
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (viewingRef.current) setViewing(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    api
      .get(`/note-images/${question._id}`)
      .then((r) => alive && setImages(r.data.images))
      .catch(() => alive && setImages([]));
    return () => {
      alive = false;
    };
  }, [question._id]);

  const save = async () => {
    if (text.length > MAX_NOTE_LENGTH) {
      toast.error(`Note exceeds maximum limit of ${MAX_NOTE_LENGTH} characters.`);
      return;
    }
    setSaving(true);
    const ok = await onSave(question, text);
    setSaving(false);
    if (ok) onClose();
  };

  const insertSnippet = (before, after = '', defaultText = '') => {
    const textarea = ref.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    const selected = currentVal.substring(start, end) || defaultText;

    const replacement = before + selected + after;
    const nextVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);

    if (nextVal.length > MAX_NOTE_LENGTH) {
      toast.error(`Cannot insert: exceeds ${MAX_NOTE_LENGTH} characters.`);
      return;
    }

    setText(nextVal);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selected.length;
      textarea.setSelectionRange(
        selected ? start + before.length : newCursorPos,
        newCursorPos
      );
    }, 0);
  };

  const insertTemplate = (templateStr) => {
    const textarea = ref.current;
    setShowTemplates(false);
    if (!textarea) {
      setText((prev) => (prev ? prev + '\n\n' + templateStr : templateStr));
      return;
    }

    const start = textarea.selectionStart;
    const currentVal = textarea.value;
    const prefix = currentVal && !currentVal.endsWith('\n\n') ? '\n\n' : '';
    const nextVal = currentVal.substring(0, start) + prefix + templateStr + currentVal.substring(start);

    setText(nextVal);
    toast.success('Template inserted');
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length + templateStr.length, start + prefix.length + templateStr.length);
    }, 0);
  };

  const handlePaste = (e) => {
    const html = e.clipboardData?.getData('text/html');
    const plain = e.clipboardData?.getData('text/plain');

    // If plain text already looks like raw markdown or is plain code, let standard paste happen
    if (plain && looksLikeMarkdown(plain)) {
      return;
    }

    // If rich HTML is present (e.g. copied from ChatGPT selection, LeetCode, Notion, blog), convert it
    if (html && isRichHtml(html)) {
      const converted = htmlToMarkdown(html);
      if (converted && converted.trim()) {
        e.preventDefault();
        insertSnippet(converted, '', '');
        toast.success('Cleaned & converted ChatGPT / HTML to Markdown');
      }
    }
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      save();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      insertSnippet('**', '**', 'bold text');
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      insertSnippet('*', '*', 'italic text');
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = ref.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      if (e.shiftKey) {
        // Unindent
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        if (val.substring(lineStart, lineStart + 2) === '  ') {
          const nextVal = val.substring(0, lineStart) + val.substring(lineStart + 2);
          setText(nextVal);
          setTimeout(() => {
            textarea.setSelectionRange(Math.max(lineStart, start - 2), Math.max(lineStart, end - 2));
          }, 0);
        }
      } else {
        // Indent 2 spaces
        const nextVal = val.substring(0, start) + '  ' + val.substring(end);
        setText(nextVal);
        setTimeout(() => {
          textarea.setSelectionRange(start + 2, start + 2);
        }, 0);
      }
    }
  };

  const addPhoto = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      e.target.value = ''; // lets the same file be picked again
      if (!file) return;
      setUploading(true);
      try {
        const blob = await compressImage(file);
        const permit = (await api.post(`/note-images/${question._id}/sign`)).data;
        const uploaded = await uploadToCloudinary(blob, permit);
        const { data } = await api.post(`/note-images/${question._id}`, uploaded);
        setImages((prev) => [...(prev || []), data.image]);
        onImageCount?.(question._id, data.count);
        toast.success('Photo added');
      } catch (err) {
        toast.error(err?.response ? errorMessage(err) : err.message || 'Could not upload photo.');
      } finally {
        setUploading(false);
      }
    },
    [question._id, onImageCount, toast]
  );

  const removePhoto = async (img) => {
    if (!window.confirm('Delete this photo?')) return;
    try {
      const { data } = await api.delete(`/note-images/${img.id}`);
      setImages((prev) => prev.filter((i) => i.id !== img.id));
      onImageCount?.(question._id, data.count);
      toast.success('Photo deleted');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const full = images && images.length >= MAX_PHOTOS;
  const isNearLimit = text.length > MAX_NOTE_LENGTH * 0.9;
  const isOverLimit = text.length > MAX_NOTE_LENGTH;

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`modal note-modal ${isExpanded ? 'is-expanded' : ''} ${mode === 'split' ? 'is-split' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Notes for ${question.title}`}
      >
        {/* Header */}
        <div className="modal-head note-modal-head">
          <div className="note-modal-info">
            <div className="row gap-sm items-center">
              <h3>{question.title}</h3>
              <span className="badge-md-indicator" title="Markdown and ChatGPT formatting supported">
                MD
              </span>
            </div>
            <p className="muted small">{question.pattern}</p>
          </div>

          <div className="row items-center gap-sm">
            {/* View Mode Switcher */}
            <div className="note-mode-toggle" role="tablist" aria-label="Editor View">
              <button
                type="button"
                className={`note-tab-btn ${mode === 'write' ? 'active' : ''}`}
                onClick={() => setMode('write')}
                title="Write / Edit Markdown note"
              >
                <IconEdit width={14} height={14} />
                <span>Write</span>
              </button>
              <button
                type="button"
                className={`note-tab-btn ${mode === 'preview' ? 'active' : ''}`}
                onClick={() => setMode('preview')}
                title="Preview formatted Markdown"
              >
                <IconEye width={14} height={14} />
                <span>Preview</span>
              </button>
              <button
                type="button"
                className={`note-tab-btn split-tab-btn ${mode === 'split' ? 'active' : ''}`}
                onClick={() => setMode('split')}
                title="Side-by-side Editor & Preview"
              >
                <IconColumns width={14} height={14} />
                <span>Split</span>
              </button>
            </div>

            {/* Expand / Maximize modal button */}
            <button
              type="button"
              className="icon-btn note-expand-btn"
              onClick={() => setIsExpanded((prev) => !prev)}
              aria-label={isExpanded ? 'Collapse modal' : 'Expand modal'}
              title={isExpanded ? 'Standard width' : 'Expand width for comfortable reading/editing'}
            >
              {isExpanded ? <IconMinimize width={16} height={16} /> : <IconMaximize width={16} height={16} />}
            </button>

            <button className="icon-btn" onClick={onClose} aria-label="Close modal" title="Close">
              <IconX />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className={`note-body-layout note-layout-${mode}`}>
          {/* Write / Edit Column */}
          {(mode === 'write' || mode === 'split') && (
            <div className="note-editor-col">
              {/* Markdown Toolbar */}
              <div className="note-toolbar" role="toolbar" aria-label="Markdown formatting tools">
                <div className="note-toolbar-group">
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => insertSnippet('**', '**', 'bold text')}
                    title="Bold (Ctrl+B)"
                    aria-label="Bold"
                  >
                    <IconBold width={14} height={14} />
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => insertSnippet('*', '*', 'italic text')}
                    title="Italic (Ctrl+I)"
                    aria-label="Italic"
                  >
                    <IconItalic width={14} height={14} />
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => insertSnippet('### ', '', 'Heading')}
                    title="Heading 3"
                    aria-label="Heading"
                  >
                    <IconHeading width={14} height={14} />
                  </button>
                </div>

                <div className="note-toolbar-divider" />

                <div className="note-toolbar-group">
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => insertSnippet('`', '`', 'code')}
                    title="Inline Code"
                    aria-label="Inline Code"
                  >
                    <span className="txt-ico">&lt;/&gt;</span>
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => insertSnippet('```python\n', '\n```', '# code here')}
                    title="Code block with syntax highlighting"
                    aria-label="Code Block"
                  >
                    <IconCode width={14} height={14} />
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => insertSnippet('- ', '', 'list item')}
                    title="Bullet List"
                    aria-label="Bullet List"
                  >
                    <IconList width={14} height={14} />
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => insertSnippet('1. ', '', 'first step')}
                    title="Numbered List"
                    aria-label="Numbered List"
                  >
                    <IconListOrdered width={14} height={14} />
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => insertSnippet('> ', '', 'key intuition or quote')}
                    title="Blockquote"
                    aria-label="Blockquote"
                  >
                    <IconQuote width={14} height={14} />
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => insertSnippet('[', '](https://...)', 'Link title')}
                    title="Insert Link"
                    aria-label="Link"
                  >
                    <IconLink width={14} height={14} />
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() =>
                      insertSnippet(
                        '| Column 1 | Column 2 |\n| :--- | :--- |\n| Row 1 | Value 1 |\n| Row 2 | Value 2 |\n'
                      )
                    }
                    title="Insert Markdown Table"
                    aria-label="Table"
                  >
                    <IconTable width={14} height={14} />
                  </button>
                </div>

                <div className="note-toolbar-divider" />

                <div className="note-toolbar-group templates-group">
                  <button
                    type="button"
                    className={`toolbar-btn toolbar-btn-template ${showTemplates ? 'active' : ''}`}
                    onClick={() => setShowTemplates((prev) => !prev)}
                    title="Insert DSA template"
                  >
                    <IconSparkles width={14} height={14} />
                    <span>Templates</span>
                  </button>

                  {showTemplates && (
                    <div className="templates-dropdown">
                      <div className="templates-header">Select a Template</div>
                      {DSA_TEMPLATES.map((tmpl) => (
                        <button
                          key={tmpl.id}
                          type="button"
                          className="template-item"
                          onClick={() => insertTemplate(tmpl.template)}
                        >
                          <strong>{tmpl.label}</strong>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Textarea */}
              <div className="note-textarea-wrap">
                <textarea
                  ref={ref}
                  value={text}
                  maxLength={MAX_NOTE_LENGTH}
                  placeholder={`Write your approach, time/space complexity, or paste directly from ChatGPT or Markdown notes...\n\nTips:\n• Paste rich ChatGPT output or code blocks directly\n• Press Tab to indent code, Ctrl+B for bold\n• Ctrl+Enter to save`}
                  onChange={(e) => setText(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={handleKeyDown}
                  className="note-textarea"
                />
              </div>
            </div>
          )}

          {/* Preview Column */}
          {(mode === 'preview' || mode === 'split') && (
            <div className="note-preview-col">
              <div className="note-preview-header">
                <span className="small muted">
                  <strong>Formatted Preview</strong>
                  {mode === 'preview' && (
                    <button
                      type="button"
                      className="btn-edit-inline"
                      onClick={() => setMode('write')}
                      title="Switch to editor"
                    >
                      <IconEdit width={13} height={13} /> Edit
                    </button>
                  )}
                </span>
                <span className="preview-tip small muted">Syntax highlighted & formatted</span>
              </div>
              <div className="note-preview-content">
                <MarkdownViewer content={text} onEditClick={() => setMode('write')} />
              </div>
            </div>
          )}
        </div>

        {/* Photos Section */}
        <div className="photos">
          <div className="row between">
            <span className="small">
              <strong>Handwritten notes</strong>{' '}
              <span className="muted">
                · {images ? images.length : 0}/{MAX_PHOTOS} photos
              </span>
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || full || images === null}
            >
              <IconImage /> {uploading ? 'Uploading…' : 'Add photo'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={addPhoto} />
          </div>
          {images && images.length > 0 && (
            <ul className="photo-grid">
              {images.map((img) => (
                <li key={img.id}>
                  <button
                    type="button"
                    className="photo-thumb"
                    onClick={() => setViewing(img)}
                    aria-label="View photo full size"
                  >
                    <img src={img.thumb} alt="Handwritten note" />
                  </button>
                  <button
                    type="button"
                    className="photo-del"
                    onClick={() => removePhoto(img)}
                    aria-label="Delete photo"
                    title="Delete photo"
                  >
                    <IconTrash width={14} height={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="modal-foot note-modal-foot">
          <div className="row items-center gap-sm">
            <span
              className={`small ${isOverLimit ? 'limit-exceeded' : isNearLimit ? 'limit-warning' : 'muted'}`}
            >
              {text.length.toLocaleString()}/{MAX_NOTE_LENGTH.toLocaleString()} chars
            </span>
            <span className="muted small note-foot-hint">· Markdown supported · only you see notes</span>
          </div>

          <div className="row gap">
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={saving || isOverLimit}
              title="Save note (Ctrl + Enter)"
            >
              {saving ? 'Saving…' : 'Save note'}
            </button>
          </div>
        </div>
      </div>

      {viewing && (
        <div
          className="lightbox"
          onMouseDown={(e) => {
            e.stopPropagation();
            setViewing(null);
          }}
        >
          <img src={viewing.url} alt="Handwritten note, full size" />
          <button className="icon-btn lightbox-x" onClick={() => setViewing(null)} aria-label="Close photo">
            <IconX />
          </button>
        </div>
      )}
    </div>
  );
}
