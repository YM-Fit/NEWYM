import React, { useState, useMemo } from 'react';
import { Trash2, Info, Plus, Check, TrendingUp, ChevronDown } from 'lucide-react';
import type { PlanExercise } from '../types';
import { WorkoutSetCard } from '../../Workouts/WorkoutSetCard';

interface WorkoutExerciseCardProps {
  exercise: PlanExercise;
  exerciseIndex: number;
  isMinimized: boolean;
  onComplete: (exerciseIndex: number) => void;
  onRemove: (exerciseIndex: number) => void;
  onShowInstructions: (name: string, instructions: string | null | undefined) => void;
  onUpdateExercise: (exerciseIndex: number, field: keyof PlanExercise, value: any) => void;
  onAddSet: (exerciseIndex: number) => void;
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: string, value: any) => void;
  onDuplicateSet: (exerciseIndex: number, setIndex: number) => void;
  onOpenNumericPad: (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps' | 'rpe', label: string) => void;
  onOpenEquipmentSelector: (exerciseIndex: number, setIndex: number) => void;
  onOpenSupersetSelector: (exerciseIndex: number, setIndex: number) => void;
  onOpenSupersetNumericPad: (exerciseIndex: number, setIndex: number, field: 'superset_weight' | 'superset_reps' | 'superset_rpe', label: string) => void;
  onOpenSupersetEquipmentSelector: (exerciseIndex: number, setIndex: number) => void;
  onOpenDropsetNumericPad: (exerciseIndex: number, setIndex: number, field: 'dropset_weight' | 'dropset_reps', label: string) => void;
  onOpenSupersetDropsetNumericPad: (exerciseIndex: number, setIndex: number, field: 'superset_dropset_weight' | 'superset_dropset_reps', label: string) => void;
}

export default function WorkoutExerciseCard({
  exercise,
  exerciseIndex,
  isMinimized,
  onComplete,
  onRemove,
  onShowInstructions,
  onUpdateExercise,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onDuplicateSet,
  onOpenNumericPad,
  onOpenEquipmentSelector,
  onOpenSupersetSelector,
  onOpenSupersetNumericPad,
  onOpenSupersetEquipmentSelector,
  onOpenDropsetNumericPad,
  onOpenSupersetDropsetNumericPad,
}: WorkoutExerciseCardProps) {
  const [collapsedSets, setCollapsedSets] = useState<Set<string>>(new Set());

  // Calculate exercise stats
  const exerciseStats = useMemo(() => {
    const totalSets = exercise.sets.length;
    const completedSets = exercise.sets.filter(s => s.weight > 0 && s.reps > 0).length;
    const maxWeight = Math.max(...exercise.sets.map(s => s.weight), 0);
    const totalVolume = exercise.sets.reduce((sum, set) => {
      let volume = set.weight * set.reps;
      if (set.superset_weight && set.superset_reps) {
        volume += set.superset_weight * set.superset_reps;
      }
      if (set.dropset_weight && set.dropset_reps) {
        volume += set.dropset_weight * set.dropset_reps;
      }
      return sum + volume;
    }, 0);
    
    const setsWithData = exercise.sets.filter(s => s.weight > 0);
    const avgWeight = setsWithData.length > 0
      ? setsWithData.reduce((sum, s) => sum + s.weight, 0) / setsWithData.length
      : 0;
    const avgReps = setsWithData.length > 0
      ? setsWithData.reduce((sum, s) => sum + s.reps, 0) / setsWithData.length
      : 0;

    return {
      totalSets,
      completedSets,
      maxWeight,
      totalVolume,
      avgWeight: Math.round(avgWeight * 10) / 10,
      avgReps: Math.round(avgReps * 10) / 10,
      progressPercent: totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0,
    };
  }, [exercise.sets]);

  const toggleCollapseSet = (setId: string) => {
    setCollapsedSets(prev => {
      const next = new Set(prev);
      if (next.has(setId)) {
        next.delete(setId);
      } else {
        next.add(setId);
      }
      return next;
    });
  };

  const findActiveSetId = () => {
    const nonCollapsedSet = exercise.sets.find(set => !collapsedSets.has(set.id));
    return nonCollapsedSet?.id || null;
  };

  if (isMinimized) {
    return (
      <div
        className="premium-card-static mb-4 lg:mb-6 overflow-hidden border-r-4 border-primary-500 set-collapsed-hover"
      >
        <div
          className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 cursor-pointer hover:bg-surface transition-all"
          onClick={() => onComplete(exerciseIndex)}
        >
          <div className="flex items-center gap-3 lg:gap-4 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                <Check className="h-6 w-6 lg:h-7 lg:w-7 text-white" />
              </div>
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
                  strokeDashoffset={`${2 * Math.PI * 8 * (1 - exerciseStats.progressPercent / 100)}`}
                />
              </svg>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg lg:text-xl font-bold text-foreground truncate">{exercise.exercise.name}</h3>
              <div className="flex flex-wrap items-center gap-2 lg:gap-3 mt-1">
                <span className="text-sm text-muted flex items-center gap-1">
                  <span className="font-semibold text-foreground">{exerciseStats.totalSets}</span> סטים
                </span>
                <span className="text-muted600">•</span>
                <span className="text-sm text-muted flex items-center gap-1">
                  מקס: <span className="font-semibold text-primary-400">{exerciseStats.maxWeight}</span> ק״ג
                </span>
                <span className="text-muted600">•</span>
                <div className="flex items-center gap-1 bg-primary-500/10 px-2 py-0.5 rounded-md border border-primary-500/30">
                  <TrendingUp className="h-3.5 w-3.5 text-primary-400" />
                  <span className="text-sm font-semibold text-primary-400">{exerciseStats.totalVolume.toLocaleString()}</span>
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
                onShowInstructions(exercise.exercise.name, exercise.exercise.instructions);
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
                onRemove(exerciseIndex);
              }}
              className="p-2 hover:bg-red-500/15 text-red-400 rounded-xl transition-all cursor-pointer"
              aria-label="מחק תרגיל"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeSetId = findActiveSetId();

  return (
    <div className="premium-card-static mb-4 lg:mb-6 overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
      <div className="p-5 lg:p-6">
        {/* Header with exercise name and stats */}
        <div className="flex items-start justify-between mb-5 lg:mb-6 gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xl lg:text-2xl font-bold text-foreground">{exercise.exercise.name}</h3>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onShowInstructions(exercise.exercise.name, exercise.exercise.instructions);
                }}
                className="p-2 hover:bg-blue-500/15 text-blue-400 rounded-lg transition-all cursor-pointer shadow-sm hover:shadow-md"
                aria-label="איך לבצע"
                title="איך לבצע"
              >
                <Info className="h-5 w-5 lg:h-6 lg:w-6" />
              </button>
            </div>
            
            {/* Stats row */}
            {exercise.sets.length > 0 && (
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
                        strokeDashoffset={`${2 * Math.PI * 16 * (1 - exerciseStats.progressPercent / 100)}`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs lg:text-sm font-bold text-foreground">
                      {exerciseStats.completedSets}/{exerciseStats.totalSets}
                    </span>
                  </div>
                  <span className="text-sm lg:text-base text-muted font-medium">סטים</span>
                </div>
                
                {/* Volume */}
                <div className="flex items-center gap-2 bg-primary-500/15 px-4 py-2 rounded-xl border border-primary-500/40 shadow-sm">
                  <TrendingUp className="h-5 w-5 text-primary-400" />
                  <span className="text-primary-400 font-bold text-base lg:text-lg">{exerciseStats.totalVolume.toLocaleString()}</span>
                  <span className="text-primary-400/80 text-xs lg:text-sm">ק״ג</span>
                </div>
                
                {/* Average stats */}
                {exerciseStats.avgWeight > 0 && (
                  <div className="hidden lg:flex items-center gap-2 text-sm bg-surface/50 px-4 py-2 rounded-xl border border-border">
                    <span className="text-muted">ממוצע:</span>
                    <span className="font-semibold text-foreground">{exerciseStats.avgWeight} ק״ג</span>
                    <span className="text-muted">×</span>
                    <span className="font-semibold text-foreground">{exerciseStats.avgReps} חזרות</span>
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
                onComplete(exerciseIndex);
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
                onRemove(exerciseIndex);
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
          {exercise.sets.map((set, setIndex) => (
            <WorkoutSetCard
              key={set.id}
              set={set}
              setIndex={setIndex}
              isCollapsed={collapsedSets.has(set.id)}
              canDelete={exercise.sets.length > 1}
              isActive={set.id === activeSetId}
              onToggleCollapse={() => toggleCollapseSet(set.id)}
              onCompleteSet={() => {
                // For plan builder, we don't need to move to next set, just mark as complete
                // But we can still use this for visual feedback
              }}
              onDuplicate={() => onDuplicateSet(exerciseIndex, setIndex)}
              onRemove={() => onRemoveSet(exerciseIndex, setIndex)}
              onOpenNumericPad={(field) => {
                const labels = {
                  weight: 'משקל (ק״ג)',
                  reps: 'חזרות',
                  rpe: 'RPE (1-10)',
                };
                onOpenNumericPad(exerciseIndex, setIndex, field, labels[field]);
              }}
              onOpenEquipmentSelector={() => onOpenEquipmentSelector(exerciseIndex, setIndex)}
              onOpenSupersetSelector={() => onOpenSupersetSelector(exerciseIndex, setIndex)}
              onOpenSupersetNumericPad={(field) => {
                const labels = {
                  superset_weight: 'משקל סופר-סט (ק״ג)',
                  superset_reps: 'חזרות סופר-סט',
                  superset_rpe: 'RPE סופר-סט (1-10)',
                };
                onOpenSupersetNumericPad(exerciseIndex, setIndex, field, labels[field]);
              }}
              onOpenSupersetEquipmentSelector={() => onOpenSupersetEquipmentSelector(exerciseIndex, setIndex)}
              onOpenDropsetNumericPad={(field) => {
                const labels = {
                  dropset_weight: 'משקל דרופ-סט (ק״ג)',
                  dropset_reps: 'חזרות דרופ-סט',
                };
                onOpenDropsetNumericPad(exerciseIndex, setIndex, field, labels[field]);
              }}
              onOpenSupersetDropsetNumericPad={(field) => {
                const labels = {
                  superset_dropset_weight: 'משקל דרופ-סט סופר (ק״ג)',
                  superset_dropset_reps: 'חזרות דרופ-סט סופר',
                };
                onOpenSupersetDropsetNumericPad(exerciseIndex, setIndex, field, labels[field]);
              }}
              onUpdateSet={(field, value) => onUpdateSet(exerciseIndex, setIndex, field, value)}
            />
          ))}
        </div>

        {/* Add set button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddSet(exerciseIndex);
          }}
          className="w-full mt-5 lg:mt-6 py-4 lg:py-5 border-2 border-dashed border-border rounded-xl hover:border-primary-500/50 hover:bg-primary-500/10 text-muted hover:text-primary-400 font-bold text-base lg:text-lg transition-all touch-manipulation cursor-pointer btn-press-feedback flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
        >
          <Plus className="h-5 w-5 lg:h-6 lg:w-6" />
          <span>הוסף סט</span>
        </button>

        {/* Notes */}
        <div className="mt-4">
          <label className="block text-sm font-semibold text-muted700 mb-2">הערות לתרגיל</label>
          <textarea
            value={exercise.notes}
            onChange={(e) => onUpdateExercise(exerciseIndex, 'notes', e.target.value)}
            className="w-full px-4 py-3 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300"
            rows={2}
            placeholder="הערות לביצוע התרגיל..."
          />
        </div>
      </div>
    </div>
  );
}
