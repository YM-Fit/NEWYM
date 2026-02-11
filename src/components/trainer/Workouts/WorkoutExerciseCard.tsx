import { memo, useState, useRef, useEffect, useMemo } from 'react';
import { Trash2, Check, Info, TrendingUp, ChevronDown, Plus } from 'lucide-react';
import { WorkoutSetCard } from './WorkoutSetCard';
import ExerciseInstructionsModal from '../../common/ExerciseInstructionsModal';

interface Equipment {
  id: string;
  name: string;
  emoji: string | null;
}

interface SetData {
  id: string;
  set_number: number;
  weight: number;
  reps: number;
  rpe: number | null;
  set_type: 'regular' | 'superset' | 'dropset';
  failure?: boolean;
  superset_exercise_id?: string | null;
  superset_exercise_name?: string | null;
  superset_weight?: number | null;
  superset_reps?: number | null;
  superset_rpe?: number | null;
  superset_equipment_id?: string | null;
  superset_equipment?: Equipment | null;
  superset_dropset_weight?: number | null;
  superset_dropset_reps?: number | null;
  dropset_weight?: number | null;
  dropset_reps?: number | null;
  equipment_id?: string | null;
  equipment?: Equipment | null;
}

interface WorkoutExercise {
  tempId: string;
  exercise: {
    id: string;
    name: string;
    muscle_group_id: string;
    instructions?: string | null;
  };
  sets: SetData[];
}

interface ExerciseSummary {
  totalSets: number;
  maxWeight: number;
  totalVolume: number;
}

interface WorkoutExerciseCardProps {
  workoutExercise: WorkoutExercise;
  exerciseIndex: number;
  isMinimized: boolean;
  collapsedSets: string[];
  summary: ExerciseSummary;
  totalVolume: number;
  onRemove: () => void;
  onToggleMinimize: () => void;
  onComplete: () => void;
  onAddSet: () => void;
  onDuplicateSet: (setIndex: number) => void;
  onRemoveSet: (setIndex: number) => void;
  onToggleCollapseSet: (setId: string) => void;
  onCompleteSet: (setIndex: number) => void;
  onOpenNumericPad: (setIndex: number, field: 'weight' | 'reps' | 'rpe') => void;
  onOpenEquipmentSelector: (setIndex: number) => void;
  onOpenSupersetSelector: (setIndex: number) => void;
  onOpenSupersetNumericPad: (setIndex: number, field: 'superset_weight' | 'superset_reps' | 'superset_rpe') => void;
  onOpenSupersetEquipmentSelector: (setIndex: number) => void;
  onOpenDropsetNumericPad: (setIndex: number, field: 'dropset_weight' | 'dropset_reps') => void;
  onOpenSupersetDropsetNumericPad: (setIndex: number, field: 'superset_dropset_weight' | 'superset_dropset_reps') => void;
  onUpdateSet: (setIndex: number, field: string, value: any) => void;
}

export const WorkoutExerciseCard = memo(({
  workoutExercise,
  exerciseIndex,
  isMinimized,
  collapsedSets,
  summary,
  totalVolume,
  onRemove,
  onToggleMinimize,
  onComplete,
  onAddSet,
  onDuplicateSet,
  onRemoveSet,
  onToggleCollapseSet,
  onCompleteSet,
  onOpenNumericPad,
  onOpenEquipmentSelector,
  onOpenSupersetSelector,
  onOpenSupersetNumericPad,
  onOpenSupersetEquipmentSelector,
  onOpenDropsetNumericPad,
  onOpenSupersetDropsetNumericPad,
  onUpdateSet,
}: WorkoutExerciseCardProps) => {
  const [showInstructions, setShowInstructions] = useState(false);
  const setRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Calculate completed sets (sets with data)
  const completedSets = useMemo(() => {
    return workoutExercise.sets.filter(set => set.weight > 0 && set.reps > 0).length;
  }, [workoutExercise.sets]);
  
  // Calculate average weight and reps
  const avgStats = useMemo(() => {
    const setsWithData = workoutExercise.sets.filter(s => s.weight > 0);
    if (setsWithData.length === 0) return { avgWeight: 0, avgReps: 0 };
    const avgWeight = setsWithData.reduce((sum, s) => sum + s.weight, 0) / setsWithData.length;
    const avgReps = setsWithData.reduce((sum, s) => sum + s.reps, 0) / setsWithData.length;
    return { avgWeight: Math.round(avgWeight * 10) / 10, avgReps: Math.round(avgReps * 10) / 10 };
  }, [workoutExercise.sets]);

  // Find the first non-collapsed set (active set)
  const activeSetId = useMemo(() => {
    const nonCollapsedSet = workoutExercise.sets.find(set => !collapsedSets.includes(set.id));
    return nonCollapsedSet?.id || null;
  }, [workoutExercise.sets, collapsedSets]);

  // Auto-scroll to active set when it changes
  useEffect(() => {
    if (activeSetId) {
      const ref = setRefs.current.get(activeSetId);
      if (ref) {
        setTimeout(() => {
          ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [activeSetId]);

  // Progress percentage
  const progressPercent = workoutExercise.sets.length > 0 
    ? Math.round((completedSets / workoutExercise.sets.length) * 100) 
    : 0;

  if (isMinimized) {
    return (
      <div
        className="premium-card-static mb-4 lg:mb-6 overflow-hidden border-r-4 border-primary-500 set-collapsed-hover"
      >
        <div
          className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 cursor-pointer hover:bg-surface transition-all"
          onClick={onToggleMinimize}
        >
          <div className="flex items-center gap-3 lg:gap-4 flex-1 min-w-0">
            {/* Success indicator with progress */}
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                <Check className="h-6 w-6 lg:h-7 lg:w-7 text-white" />
              </div>
              {/* Progress ring */}
              <svg className="absolute -top-1 -right-1 w-5 h-5 transform -rotate-90">
                <circle
                  className="text-primary-900"
                  strokeWidth="2"
                  stroke="currentColor"
                  fill="transparent"
                  r="8"
                  cx="10"
                  cy="10"
                />
                <circle
                  className="text-primary-400"
                  strokeWidth="2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="8"
                  cx="10"
                  cy="10"
                  strokeDasharray={`${2 * Math.PI * 8}`}
                  strokeDashoffset={`${2 * Math.PI * 8 * (1 - progressPercent / 100)}`}
                />
              </svg>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg lg:text-xl font-bold text-foreground truncate">{workoutExercise.exercise.name}</h3>
              <div className="flex flex-wrap items-center gap-2 lg:gap-3 mt-1">
                <span className="text-sm text-muted flex items-center gap-1">
                  <span className="font-semibold text-foreground">{summary.totalSets}</span> סטים
                </span>
                <span className="text-muted600">•</span>
                <span className="text-sm text-muted flex items-center gap-1">
                  מקס: <span className="font-semibold text-primary-400">{summary.maxWeight}</span> ק״ג
                </span>
                <span className="text-muted600">•</span>
                <div className="flex items-center gap-1 bg-primary-500/10 px-2 py-0.5 rounded-md border border-primary-500/30">
                  <TrendingUp className="h-3.5 w-3.5 text-primary-400" />
                  <span className="text-sm font-semibold text-primary-400">{summary.totalVolume.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowInstructions(true);
              }}
              className="p-2 hover:bg-blue-500/15 text-blue-400 rounded-xl transition-all cursor-pointer"
              aria-label="איך לבצע"
              title="איך לבצע"
            >
              <Info className="h-5 w-5" />
            </button>
            <ChevronDown className="h-5 w-5 text-primary-400" />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }}
              className="p-2 hover:bg-red-500/15 text-red-400 rounded-xl transition-all cursor-pointer"
              aria-label="מחק תרגיל"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        <ExerciseInstructionsModal
          isOpen={showInstructions}
          onClose={() => setShowInstructions(false)}
          exerciseName={workoutExercise.exercise.name}
          instructions={workoutExercise.exercise.instructions}
        />
      </div>
    );
  }

  return (
    <div className="premium-card-static mb-4 lg:mb-6 overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
      <div className="p-5 lg:p-6">
        {/* Header with exercise name and stats */}
        <div className="flex items-start justify-between mb-5 lg:mb-6 gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xl lg:text-2xl font-bold text-foreground">{workoutExercise.exercise.name}</h3>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowInstructions(true);
                }}
                className="p-2 hover:bg-blue-500/15 text-blue-400 rounded-lg transition-all cursor-pointer shadow-sm hover:shadow-md"
                aria-label="איך לבצע"
                title="איך לבצע"
              >
                <Info className="h-5 w-5 lg:h-6 lg:w-6" />
              </button>
            </div>
            
            {/* Stats row */}
            {workoutExercise.sets.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 lg:gap-4">
                {/* Progress indicator */}
                <div className="flex items-center gap-2.5 bg-surface px-4 py-2 rounded-xl border border-border shadow-sm">
                  <div className="relative w-10 h-10 lg:w-12 lg:h-12">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        className="text-muted700"
                        strokeWidth="3"
                        stroke="currentColor"
                        fill="transparent"
                        r="16"
                        cx="50%"
                        cy="50%"
                      />
                      <circle
                        className="text-primary-500 progress-ring"
                        strokeWidth="3"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="16"
                        cx="50%"
                        cy="50%"
                        strokeDasharray={`${2 * Math.PI * 16}`}
                        strokeDashoffset={`${2 * Math.PI * 16 * (1 - progressPercent / 100)}`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs lg:text-sm font-bold text-foreground">
                      {completedSets}/{workoutExercise.sets.length}
                    </span>
                  </div>
                  <span className="text-sm lg:text-base text-muted font-medium">סטים</span>
                </div>
                
                {/* Volume */}
                <div className="flex items-center gap-2 bg-primary-500/15 px-4 py-2 rounded-xl border border-primary-500/40 shadow-sm">
                  <TrendingUp className="h-5 w-5 text-primary-400" />
                  <span className="text-primary-400 font-bold text-base lg:text-lg">{totalVolume.toLocaleString()}</span>
                  <span className="text-primary-400/80 text-xs lg:text-sm">ק״ג</span>
                </div>
                
                {/* Average stats */}
                {avgStats.avgWeight > 0 && (
                  <div className="hidden lg:flex items-center gap-2 text-sm bg-surface/50 px-4 py-2 rounded-xl border border-border">
                    <span className="text-muted">ממוצע:</span>
                    <span className="font-semibold text-foreground">{avgStats.avgWeight} ק״ג</span>
                    <span className="text-muted">×</span>
                    <span className="font-semibold text-foreground">{avgStats.avgReps} חזרות</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onComplete();
              }}
              className="px-5 py-2.5 lg:px-6 lg:py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-all text-sm lg:text-base font-bold cursor-pointer btn-press-feedback shadow-md hover:shadow-lg"
            >
              סיים תרגיל
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }}
              className="p-2.5 lg:p-3.5 hover:bg-red-500/15 text-red-400 rounded-xl transition-all touch-manipulation cursor-pointer shadow-sm hover:shadow-md"
              aria-label="מחק תרגיל"
            >
              <Trash2 className="h-5 w-5 lg:h-6 lg:w-6" />
            </button>
          </div>
        </div>

        {/* Sets list */}
        <div className="space-y-3.5 lg:space-y-4">
          {workoutExercise.sets.map((set, setIndex) => (
            <div 
              key={set.id} 
              ref={(el) => {
                if (el) setRefs.current.set(set.id, el);
                else setRefs.current.delete(set.id);
              }}
            >
              <WorkoutSetCard
                set={set}
                setIndex={setIndex}
                isCollapsed={collapsedSets.includes(set.id)}
                canDelete={workoutExercise.sets.length > 1}
                isActive={set.id === activeSetId}
                onToggleCollapse={() => onToggleCollapseSet(set.id)}
                onCompleteSet={() => onCompleteSet(setIndex)}
                onDuplicate={() => onDuplicateSet(setIndex)}
                onRemove={() => onRemoveSet(setIndex)}
                onOpenNumericPad={(field) => onOpenNumericPad(setIndex, field)}
                onOpenEquipmentSelector={() => onOpenEquipmentSelector(setIndex)}
                onOpenSupersetSelector={() => onOpenSupersetSelector(setIndex)}
                onOpenSupersetNumericPad={(field) => onOpenSupersetNumericPad(setIndex, field)}
                onOpenSupersetEquipmentSelector={() => onOpenSupersetEquipmentSelector(setIndex)}
                onOpenDropsetNumericPad={(field) => onOpenDropsetNumericPad(setIndex, field)}
                onOpenSupersetDropsetNumericPad={(field) => onOpenSupersetDropsetNumericPad(setIndex, field)}
                onUpdateSet={(field, value) => onUpdateSet(setIndex, field, value)}
              />
            </div>
          ))}
        </div>

        {/* Add set button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddSet();
          }}
          className="w-full mt-5 lg:mt-6 py-4 lg:py-5 border-2 border-dashed border-border rounded-xl hover:border-primary-500/50 hover:bg-primary-500/10 text-muted hover:text-primary-400 font-bold text-base lg:text-lg transition-all touch-manipulation cursor-pointer btn-press-feedback flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
        >
          <Plus className="h-5 w-5 lg:h-6 lg:w-6" />
          <span>הוסף סט</span>
        </button>
      </div>

      <ExerciseInstructionsModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        exerciseName={workoutExercise.exercise.name}
        instructions={workoutExercise.exercise.instructions}
      />
    </div>
  );
});

WorkoutExerciseCard.displayName = 'WorkoutExerciseCard';
