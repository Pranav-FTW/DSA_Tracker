import { useState } from 'react';
import api, { errorMessage } from '../api';
import { useToast } from '../context/ToastContext';
import { IconHeart, IconZap } from './Icons';

// One-tap "Cheer" and "Keep going" (nudge) buttons for a friend.
//   username   – the friend's username
//   questionId – optional; attaches the cheer to a solved question (used in the activity feed)
//   only       – 'cheer' | 'nudge' to show just one button
export default function CheerButtons({ username, questionId, only }) {
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const [sent, setSent] = useState({});

  const send = async (type) => {
    setBusy(type);
    try {
      const { data } = await api.post(`/cheers/send/${username}`, { type, questionId });
      toast.success(data.message);
      setSent((s) => ({ ...s, [type]: true }));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="cheer-actions">
      {only !== 'nudge' && (
        <button className="btn btn-ghost btn-sm" onClick={() => send('cheer')} disabled={!!busy || sent.cheer} title={`Cheer @${username}`}>
          <IconHeart /> {sent.cheer ? 'Cheered' : 'Cheer'}
        </button>
      )}
      {only !== 'cheer' && (
        <button className="btn btn-ghost btn-sm" onClick={() => send('nudge')} disabled={!!busy || sent.nudge} title={`Nudge @${username} to keep going`}>
          <IconZap /> {sent.nudge ? 'Nudged' : 'Keep going'}
        </button>
      )}
    </div>
  );
}
