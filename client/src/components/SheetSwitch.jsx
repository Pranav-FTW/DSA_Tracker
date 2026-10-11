import { useTracker } from '../context/TrackerContext';

// Lets the user pick which sheet they are following. Progress is kept separately for each sheet.
export default function SheetSwitcher() {
  const { sheets, sheetId, setSheet, sheetProgress } = useTracker();
  if (sheets.length < 2) return null;
  return (
    <div className="sheet-switch" role="tablist" aria-label="Choose a sheet">
      {sheets.map((s) => {
        const p = sheetProgress[s.id] || { done: 0, total: s.total };
        const active = s.id === sheetId;
        return (
          <button key={s.id} role="tab" aria-selected={active} className={`sheet-tab ${active ? 'active' : ''}`} onClick={() => setSheet(s.id)} title={s.description}>
            <span className="sheet-name">{s.short}</span>
            <span className="sheet-count">{p.done}/{p.total}</span>
          </button>
        );
      })}
    </div>
  );
}
