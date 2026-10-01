import { useCallback, useEffect, useRef, useState } from 'react';
import api, { errorMessage } from '../api';
import { useToast } from '../context/ToastContext';
import { compressImage, uploadToCloudinary } from '../utils/image';
import { IconX, IconImage, IconTrash } from './Icons';

const MAX_PHOTOS = 2;

export default function NoteModal({ question, onSave, onClose, onImageCount }) {
  const toast = useToast();
  const [text, setText] = useState(question.note || '');
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState(null); // null = loading
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState(null); // image shown full-size
  const ref = useRef(null);
  const fileRef = useRef(null);
  const viewingRef = useRef(null);
  viewingRef.current = viewing;

  useEffect(() => {
    ref.current?.focus();
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
    setSaving(true);
    const ok = await onSave(question, text);
    setSaving(false);
    if (ok) onClose();
  };

  const addPhoto = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      e.target.value = ''; // lets the same file be picked again
      if (!file) return;
      setUploading(true);
      try {
        const blob = await compressImage(file);
        const permit = (await api.post(`/note-images/${question._id}/sign`)).data; // 1. ask our server for a signed permit
        const uploaded = await uploadToCloudinary(blob, permit); //                  2. upload straight to Cloudinary
        const { data } = await api.post(`/note-images/${question._id}`, uploaded); // 3. save the result in our database
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

        <div className="photos">
          <div className="row between">
            <span className="small"><strong>Handwritten notes</strong> <span className="muted">· {images ? images.length : 0}/{MAX_PHOTOS} photos</span></span>
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading || full || images === null}>
              <IconImage /> {uploading ? 'Uploading…' : 'Add photo'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={addPhoto} />
          </div>
          {images && images.length > 0 && (
            <ul className="photo-grid">
              {images.map((img) => (
                <li key={img.id}>
                  <button type="button" className="photo-thumb" onClick={() => setViewing(img)} aria-label="View photo full size">
                    <img src={img.thumb} alt="Handwritten note" />
                  </button>
                  <button type="button" className="photo-del" onClick={() => removePhoto(img)} aria-label="Delete photo" title="Delete photo">
                    <IconTrash width={14} height={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="modal-foot">
          <span className="muted small">{text.length}/2000 · only you can see your notes and photos</span>
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

      {viewing && (
        <div className="lightbox" onMouseDown={(e) => { e.stopPropagation(); setViewing(null); }}>
          <img src={viewing.url} alt="Handwritten note, full size" />
          <button className="icon-btn lightbox-x" onClick={() => setViewing(null)} aria-label="Close photo">
            <IconX />
          </button>
        </div>
      )}
    </div>
  );
}
