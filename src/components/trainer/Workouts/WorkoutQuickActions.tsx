import { memo } from 'react';
import { Plus, BookMarked, CheckCircle2, History } from 'lucide-react';

interface WorkoutQuickActionsProps {
  exercisesCount: number;
  saving: boolean;
  isTablet?: boolean;
  onAddExercise: () => void;
  onSave: () => void;
  onShowHistory?: () => void;
  onLoadTemplate?: () => void;
  onAddSet?: () => void;
  onOpenWeightPad?: () => void;
  onOpenRepsPad?: () => void;
  onOpenRpePad?: () => void;
}

export const WorkoutQuickActions = memo(({
  exercisesCount,
  saving,
  isTablet,
  onAddExercise,
  onSave,
  onShowHistory,
  onLoadTemplate,
  onAddSet,
  onOpenWeightPad,
  onOpenRepsPad,
  onOpenRpePad,
}: WorkoutQuickActionsProps) => {
  if (!isTablet) {
    return null; // Only show on tablet
  }

  return (
    <>
      {/* Left side - Main actions */}
      <div className="fixed bottom-6 left-6 z-40 flex flex-col gap-3 animate-fade-in">
        {/* Finish workout */}
        <button
          type="button"
          onClick={onSave}
          className="w-14 h-14 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center btn-press-feedback disabled:opacity-60"
          title="סיים אימון"
          disabled={saving || exercisesCount === 0}
        >
          <CheckCircle2 className="h-6 w-6" />
        </button>

        {/* Workout history */}
        {onShowHistory && (
          <button
            type="button"
            onClick={onShowHistory}
            className="w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center btn-press-feedback"
            title="היסטוריית אימונים לתרגילים"
          >
            <History className="h-6 w-6" />
          </button>
        )}
        
        {/* Add exercise */}
        <button
          type="button"
          onClick={onAddExercise}
          className="w-14 h-14 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center btn-press-feedback"
          title="הוסף תרגיל (קיצור: Ctrl+N)"
        >
          <BookMarked className="h-6 w-6" />
        </button>
      </div>

      {/* Right side - Quick shortcuts for weight, reps, RPE, add set */}
      {exercisesCount > 0 && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 animate-fade-in">
          {/* Quick Add Set */}
          <button
            type="button"
            onClick={() => {
              // This will be handled by parent component
              if (onAddSet) {
                onAddSet();
              }
            }}
            className="w-16 h-16 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center btn-press-feedback"
            title="הוסף סט (+)"
          >
            <Plus className="h-6 w-6" />
          </button>

          {/* Quick Weight */}
          <button
            type="button"
            onClick={() => {
              if (onOpenWeightPad) {
                onOpenWeightPad();
              }
            }}
            className="w-16 h-16 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center btn-press-feedback"
            title="משקל (W)"
          >
            <span className="text-xs font-bold leading-tight text-center">משקל</span>
          </button>

          {/* Quick Reps */}
          <button
            type="button"
            onClick={() => {
              if (onOpenRepsPad) {
                onOpenRepsPad();
              }
            }}
            className="w-16 h-16 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center btn-press-feedback"
            title="חזרות (R)"
          >
            <span className="text-xs font-bold leading-tight text-center">חזרות</span>
          </button>

          {/* Quick RPE */}
          <button
            type="button"
            onClick={() => {
              if (onOpenRpePad) {
                onOpenRpePad();
              }
            }}
            className="w-16 h-16 bg-slate-500 hover:bg-slate-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center btn-press-feedback"
            title="RPE (E)"
          >
            <span className="text-xs font-bold leading-tight text-center">RPE</span>
          </button>
        </div>
      )}
    </>
  );
});

WorkoutQuickActions.displayName = 'WorkoutQuickActions';
