import type { HistoryEntry } from '../types/mealPlanTypes';

interface HistoryViewProps {
  history: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
}

export function HistoryView({ history, onRestore }: HistoryViewProps) {
  return (
    <div className="premium-card-static overflow-hidden">
      <div className="p-6 border-b border-[var(--color-border)]">
        <h3 className="font-bold text-[var(--color-text-primary)] text-xl">היסטוריית שינויים</h3>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {history.length === 0 ? (
          <div className="p-12 text-center text-[var(--color-text-muted)]">אין היסטוריה</div>
        ) : (
          history.map((entry) => (
            <div key={entry.id} className="p-5 flex items-center justify-between hover:bg-[var(--color-bg-surface)] transition-all duration-300">
              <div>
                <p className="font-semibold text-[var(--color-text-primary)]">{entry.change_description}</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {new Date(entry.changed_at).toLocaleString('he-IL')}
                </p>
              </div>
              <button
                onClick={() => onRestore(entry)}
                className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-semibold hover:bg-blue-500/30 transition-all duration-300 hover:scale-105"
              >
                שחזר גרסה
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
