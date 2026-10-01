import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import api, { errorMessage } from '../api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { computeStats } from '../utils/stats';

const TrackerContext = createContext(null);
export const useTracker = () => useContext(TrackerContext);

export function TrackerProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      setQuestions([]);
      return;
    }
    setLoading(true);
    api
      .get('/tracker')
      .then((r) => {
        setQuestions(r.data.questions);
        setError('');
      })
      .catch((e) => setError(errorMessage(e, 'Could not load your tracker.')))
      .finally(() => setLoading(false));
  }, [user]);

  const patch = useCallback((id, changes) => setQuestions((qs) => qs.map((q) => (q._id === id ? { ...q, ...changes } : q))), []);

  // Optimistic: the tick shows everywhere immediately, and rolls back if the server rejects it.
  const toggleDone = useCallback(
    async (q) => {
      const next = !q.done;
      patch(q._id, { done: next, completedAt: next ? new Date().toISOString() : null });
      try {
        await api.patch(`/tracker/${q._id}`, { done: next });
      } catch (e) {
        patch(q._id, { done: q.done, completedAt: q.completedAt });
        toast.error(errorMessage(e, 'Could not save. Check your connection.'));
      }
    },
    [patch, toast]
  );

  const saveNote = useCallback(
    async (q, note) => {
      const trimmed = note.trim();
      const prev = q.note;
      patch(q._id, { note: trimmed });
      try {
        await api.patch(`/tracker/${q._id}`, { note: trimmed });
        toast.success(trimmed ? 'Note saved' : 'Note cleared');
        return true;
      } catch (e) {
        patch(q._id, { note: prev });
        toast.error(errorMessage(e, 'Could not save note.'));
        return false;
      }
    },
    [patch, toast]
  );

  // Called by the note modal after a photo is added or deleted, so the tracker icon updates instantly.
  const setImageCount = useCallback((id, n) => patch(id, { imageCount: n }), [patch]);  

  const stats = useMemo(() => computeStats(questions), [questions]);

  return (
    <TrackerContext.Provider value={{ questions, stats, loading, error, toggleDone, saveNote, setImageCount }}>{children}</TrackerContext.Provider>
  );
}
