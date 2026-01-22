import { Trash2, Info } from 'lucide-react';
import type { WorkoutExercise, SetData } from '../types/selfWorkoutTypes';
import WorkoutSetCard from './WorkoutSetCard';

interface WorkoutExerciseCardProps {
  workoutExercise: WorkoutExercise;
  exerciseIndex: number;
  isMinimized: boolean;
  collapsedSets: string[];
  summary: {
    totalSets: number;
    maxWeight: number;
    totalVolume: number;
  };
  exerciseVolume: number;
  onToggleMinimize: () => void;
  onRemove: () => void;
  onShowInstructions: () => void;
  onAddSet: () => void;
  onToggleCollapseSet: (setId: string) => void;
  onUpdateSet: (setIndex: number, field: keyof SetData, value: any) => void;
  onDuplicateSet: (setIndex: number) => void;
  onRemoveSet: (setIndex: number) => void;
  onOpenNumericPad: (setIndex: number, field: 'weight' | 'reps' | 'rpe', label: string) => void;
  onOpenSupersetNumericPad: (setIndex: number, field: 'superset_weight' | 'superset_reps' | 'superset_rpe', label: string) => void;
  onOpenDropsetNumericPad: (setIndex: number, field: 'dropset_weight' | 'dropset_reps', label: string) => void;
  onSetEquipmentSelector: (state: { exerciseIndex: number; setIndex: number }) => void;
  onSetSupersetSelector: (state: { exerciseIndex: number; setIndex: number }) => void;
  onSetSupersetEquipmentSelector: (state: { exerciseIndex: number; setIndex: number }) => void;
  onCompleteSet: (setIndex: number) => void;
}

export default function WorkoutExerciseCard({
  workoutExercise,
  exerciseIndex,
  isMinimized,
  collapsedSets,
  summary,
  exerciseVolume,
  onToggleMinimize,
  onRemove,
  onShowInstructions,
  onAddSet,
  onToggleCollapseSet,
  onUpdateSet,
  onDuplicateSet,
  onRemoveSet,
  onOpenNumericPad,
  onOpenSupersetNumericPad,
  onOpenDropsetNumericPad,
  onSetEquipmentSelector,
  onSetSupersetSelector,
  onSetSupersetEquipmentSelector,
  onCompleteSet,
}: WorkoutExerciseCardProps) {
  return (
    <div
      className={`bg-[var(--color-bg-surface)] rounded-xl md:rounded-2xl shadow-md md:shadow-lg mb-3 md:mb-4 transition-all border ${
        isMinimized ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-[var(--color-border)]'
      }`}
      style={{
        height: isMinimized ? '64px' : 'auto',
        overflow: isMinimized ? 'hidden' : 'visible',
      }}
    >
      {isMinimized ? (
        <div
          className="h-full flex items-center justify-between px-3 md:px-4 cursor-pointer hover:bg-emerald-500/10 transition-all"
          onClick={onToggleMinimize}
        >
          <div className="flex items-center space-x-2 rtl:space-x-reverse flex-1 min-w-0">
            <div className="w-8 h-8 md:w-9 md:h-9 bg-emerald-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
              <span className="text-foreground text-sm md:text-base font-bold">✓</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm md:text-base font-bold text-[var(--color-text-primary)] truncate">{workoutExercise.exercise.name}</h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                {summary.totalSets} סטים | {summary.maxWeight} ק״ג | {summary.totalVolume.toLocaleString()} ק״ג
              </p>
            </div>
          </div>
          <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30 flex-shrink-0 mr-2">ערוך</span>
        </div>
      ) : (
        <div className="p-3 md:p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base md:text-lg font-bold text-[var(--color-text-primary)]">{workoutExercise.exercise.name}</h3>
              {workoutExercise.sets.length > 0 && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1 bg-[var(--color-bg-elevated)] px-2 py-0.5 rounded-md inline-block border border-[var(--color-border)]">
                  נפח: {exerciseVolume.toLocaleString()} ק"ג
                </p>
              )}
            </div>
            <div className="flex items-center space-x-1.5 rtl:space-x-reverse flex-shrink-0 ml-2">
              <button
                type="button"
                onClick={onShowInstructions}
                className="p-1.5 md:p-2 hover:bg-cyan-500/10 text-cyan-400 rounded-lg transition-all"
                aria-label="איך לבצע"
                title="איך לבצע"
              >
                <Info className="h-4 w-4 md:h-5 md:w-5" />
              </button>
              <button
                type="button"
                onClick={onToggleMinimize}
                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all text-xs font-semibold border border-emerald-500/30"
              >
                מינימום
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="p-1.5 md:p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-all"
                aria-label="מחק תרגיל"
              >
                <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {workoutExercise.sets.map((set, setIndex) => {
              const isCollapsed = collapsedSets.includes(set.id);
              return (
                <WorkoutSetCard
                  key={set.id}
                  set={set}
                  exerciseIndex={exerciseIndex}
                  setIndex={setIndex}
                  totalSets={workoutExercise.sets.length}
                  isCollapsed={isCollapsed}
                  onToggleCollapse={() => onToggleCollapseSet(set.id)}
                  onDuplicate={() => onDuplicateSet(setIndex)}
                  onRemove={() => onRemoveSet(setIndex)}
                  onUpdateSet={(field, value) => onUpdateSet(setIndex, field, value)}
                  onOpenNumericPad={(field, label) => onOpenNumericPad(setIndex, field, label)}
                  onOpenSupersetNumericPad={(field, label) => onOpenSupersetNumericPad(setIndex, field, label)}
                  onOpenDropsetNumericPad={(field, label) => onOpenDropsetNumericPad(setIndex, field, label)}
                  onSetEquipmentSelector={(state) => onSetEquipmentSelector({ exerciseIndex, setIndex: state.setIndex })}
                  onSetSupersetSelector={(state) => onSetSupersetSelector({ exerciseIndex, setIndex: state.setIndex })}
                  onSetSupersetEquipmentSelector={(state) => onSetSupersetEquipmentSelector({ exerciseIndex, setIndex: state.setIndex })}
                  onCompleteSet={() => onCompleteSet(setIndex)}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={onAddSet}
            className="w-full mt-4 py-4 border-2 border-dashed border-[var(--color-border)] rounded-xl hover:border-emerald-500/50 hover:bg-emerald-500/5 text-[var(--color-text-muted)] hover:text-emerald-400 font-bold text-base transition-all"
          >
            + הוסף סט
          </button>
        </div>
      )}
    </div>
  );
}
