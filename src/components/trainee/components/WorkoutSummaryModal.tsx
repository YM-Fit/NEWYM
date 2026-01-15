import toast from 'react-hot-toast';
import type { WorkoutExercise } from '../types/selfWorkoutTypes';

interface WorkoutSummaryModalProps {
  isOpen: boolean;
  exercises: WorkoutExercise[];
  elapsedTime: number;
  formatTime: (seconds: number) => string;
  calculateTotalVolume: () => number;
  getExerciseSummary: (exercise: WorkoutExercise) => {
    totalSets: number;
    maxWeight: number;
    totalVolume: number;
  };
  onClose: () => void;
  onSave: () => void;
}

export default function WorkoutSummaryModal({
  isOpen,
  exercises,
  elapsedTime,
  formatTime,
  calculateTotalVolume,
  getExerciseSummary,
  onClose,
  onSave,
}: WorkoutSummaryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
            סיכום אימון
          </h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">סה"כ נפח</span>
            <span className="font-bold text-emerald-400">
              {calculateTotalVolume().toLocaleString()} ק"ג
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">משך האימון (משוער)</span>
            <span className="font-bold text-[var(--color-text-primary)]">
              {formatTime(elapsedTime)}
            </span>
          </div>
          <div className="border-t border-[var(--color-border)] pt-3 space-y-2 max-h-40 overflow-y-auto">
            {exercises.map((ex) => {
              const summary = getExerciseSummary(ex);
              return (
                <div
                  key={ex.tempId}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-[var(--color-text-secondary)] truncate mr-2">
                    {ex.exercise.name}
                  </span>
                  <span className="text-[var(--color-text-muted)] text-xs">
                    {summary.totalSets} סטים • מקס {summary.maxWeight} ק"ג
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onClose();
            toast.success('האימון נשמר בהצלחה!');
            onSave();
          }}
          className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-all"
        >
          סיום וחזרה למסך אימונים
        </button>
      </div>
    </div>
  );
}
