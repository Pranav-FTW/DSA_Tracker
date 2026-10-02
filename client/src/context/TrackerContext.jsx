import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import api, { errorMessage } from '../api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { computeStats } from '../utils/stats';
import { REVIEW_DAYS } from '../utils/revise';

const DAY = 24 * 60 * 60 * 1000;
const revisionFields = (d) => ({ revisit: d.revisit, revisitStep: d.revisitStep, nextReviewAt: d.nextReviewAt });

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
      // Un-solving a question also takes it out of the revision list (the server does the same).
      const clear = next ? {} : { revisit: false, revisitStep: 0, nextReviewAt: null };
      patch(q._id, { done: next, completedAt: next ? new Date().toISOString() : null, ...clear });
      try {
        await api.patch(`/tracker/${q._id}`, { done: next });
      } catch (e) {
        patch(q._id, { done: q.done, completedAt: q.completedAt, ...revisionFields(q) });
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

  // Add / remove a solved question from the revision list.
  const toggleRevisit = useCallback(
    async (q) => {
      const next = !q.revisit;
      const prev = revisionFields(q);
      patch(q._id, next ? { revisit: true, revisitStep: 0, nextReviewAt: new Date(Date.now() + REVIEW_DAYS[0] * DAY).toISOString() } : { revisit: false, revisitStep: 0, nextReviewAt: null });
      try {
        const { data } = await api.patch(`/tracker/${q._id}`, { revisit: next });
        patch(q._id, revisionFields(data));
        toast.success(next ? `Added to revision. First review in ${REVIEW_DAYS[0]} days` : 'Removed from revision');
      } catch (e) {
        patch(q._id, prev);
        toast.error(errorMessage(e, 'Could not update revision.'));
      }
    },
    [patch, toast]
  );

  // Finish a review: result is 'remembered' or 'forgot'. Waits for the server because it decides the next date.
  const reviewQuestion = useCallback(
    async (q, result) => {
      try {
        const { data } = await api.post(`/tracker/${q._id}/review`, { result });
        patch(q._id, revisionFields(data));
        if (data.completed) toast.success('Fully revised. Great work!');
        else if (result === 'forgot') toast.success(`No problem. Back in ${REVIEW_DAYS[0]} days`);
        else toast.success(`Nice! Next review in ${REVIEW_DAYS[data.revisitStep]} days`);
        return true;
      } catch (e) {
        toast.error(errorMessage(e, 'Could not save your review.'));
        return false;
      }
    },
    [patch, toast]
  );

  const stats = useMemo(() => computeStats(questions), [questions]);

  return (
    <TrackerContext.Provider value={{ questions, stats, loading, error, toggleDone, saveNote, setImageCount, toggleRevisit, reviewQuestion }}>{children}</TrackerContext.Provider>
  );
}
