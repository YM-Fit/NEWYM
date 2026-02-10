import { ArrowRight, Save, BookMarked, Dumbbell, Copy, Calendar } from 'lucide-react';
import { memo } from 'react';
import AutoSaveIndicator from '../../common/AutoSaveIndicator';

interface WorkoutHeaderProps {
  trainee: {
    full_name: string;
    is_pair?: boolean;
    pairName1?: string;
    pairName2?: string;
    pair_name_1?: string;
    pair_name_2?: string;
  };
  workoutId: string | null;
  totalVolume: number;
  lastSaved: Date | null;
  isDirty: boolean;
  workoutDate: Date;
  workoutType: 'personal' | 'pair';
  exercisesCount: number;
  saving: boolean;
  selectedMember?: 'member_1' | 'member_2' | null;
  onBack: () => void;
  onSave: () => void;
  onSaveTemplate: () => void;
  onLoadPrevious: () => void;
  onDateChange: (date: Date) => void;
  onWorkoutTypeChange: (type: 'personal' | 'pair') => void;
  isTablet?: boolean;
}

export const WorkoutHeader = memo(({
  trainee,
  workoutId,
  totalVolume,
  lastSaved,
  isDirty,
  workoutDate,
  workoutType,
  exercisesCount,
  saving,
  selectedMember,
  onBack,
  onSave,
  onSaveTemplate,
  onLoadPrevious,
  onDateChange,
  onWorkoutTypeChange,
  isTablet,
}: WorkoutHeaderProps) => {
  const handlePersonalClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onWorkoutTypeChange('personal');
  };

  const handlePairClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onWorkoutTypeChange('pair');
  };
  return (
    <div className="premium-card-static p-2 sm:p-3 lg:p-3 mb-2 lg:mb-3 sticky top-0 z-10">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBack();
            }}
            className="p-2 sm:p-2.5 rounded-lg bg-surface text-muted hover:text-foreground hover:bg-elevated/50 transition-all touch-manipulation cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center flex-shrink-0 active:scale-95"
            aria-label="חזור"
          >
            <ArrowRight className="h-4 w-4 lg:h-5 lg:w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary-500/15">
              <Dumbbell className="h-4 w-4 lg:h-5 lg:w-5 text-primary-400" />
            </div>
            <div>
              <h1 className="text-base lg:text-lg font-bold text-foreground">
                {workoutId ? 'עריכת אימון' : 'אימון חדש'}
              </h1>
              <p className="text-xs lg:text-sm text-muted">{trainee.full_name}</p>
              {trainee.is_pair && selectedMember && workoutType === 'personal' && (
                <p className={`text-[10px] font-semibold mt-0.5 px-1.5 py-0.5 rounded-lg inline-block ${
                  selectedMember === 'member_1' 
                    ? 'text-blue-400 bg-blue-500/15 border border-blue-500/30'
                    : 'text-amber-400 bg-amber-500/15 border border-amber-500/30'
                }`}>
                  {selectedMember === 'member_1' ? trainee.pairName1 : trainee.pairName2}
                </p>
              )}
              {exercisesCount > 0 && (
                <p className="text-xs font-semibold mt-0.5 text-primary-400 bg-primary-500/15 rounded-lg px-1.5 py-0.5 inline-block">
                  נפח: {totalVolume.toLocaleString()} ק"ג
                </p>
              )}
              {!workoutId && <AutoSaveIndicator lastSaved={lastSaved} isDirty={isDirty} />}
            </div>
          </div>
        </div>

        <div className="flex gap-1 sm:gap-1.5 flex-shrink-0">
          {exercisesCount === 0 && !workoutId && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onLoadPrevious();
              }}
              className="bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 px-2 lg:px-3 py-2 lg:py-2.5 rounded-lg flex items-center gap-1.5 transition-all touch-manipulation cursor-pointer min-h-[40px] active:scale-95"
            >
              <Copy className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              <span className="font-medium text-xs lg:text-sm hidden sm:inline">טען אחרון</span>
            </button>
          )}
          {exercisesCount > 0 && !workoutId && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSaveTemplate();
              }}
              className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 px-2 lg:px-3 py-2 lg:py-2.5 rounded-lg flex items-center gap-1.5 transition-all touch-manipulation cursor-pointer min-h-[40px] active:scale-95"
            >
              <BookMarked className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              <span className="font-medium text-xs lg:text-sm hidden sm:inline">תבנית</span>
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSave();
            }}
            disabled={saving || exercisesCount === 0}
            className="bg-primary-500 hover:bg-primary-600 disabled:bg-elevated disabled:text-muted text-foreground px-3 lg:px-4 py-2 lg:py-2.5 rounded-lg flex items-center gap-1.5 transition-all disabled:cursor-not-allowed touch-manipulation font-bold cursor-pointer text-xs lg:text-sm min-h-[40px] active:scale-95"
          >
            <Save className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
            <span>{saving ? 'שומר...' : (workoutId ? 'עדכן' : 'שמור')}</span>
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Calendar className="h-3 w-3 text-muted" />
        <input
          type="date"
          value={workoutDate.toISOString().split('T')[0]}
          onChange={(e) => onDateChange(new Date(e.target.value))}
          className="text-xs px-2 py-1 bg-surface border border-border text-foreground rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-transparent transition-all"
          readOnly={isTablet}
          tabIndex={isTablet ? -1 : 0}
          inputMode={isTablet ? 'none' : undefined}
          onFocus={(e) => {
            if (isTablet) {
              e.target.blur();
              e.preventDefault();
            }
          }}
          onTouchStart={(e) => {
            if (isTablet) {
              e.preventDefault();
              const input = e.currentTarget;
              setTimeout(() => {
                input.removeAttribute('readonly');
                input.showPicker?.();
              }, 100);
            }
          }}
          onClick={(e) => {
            if (isTablet) {
              e.preventDefault();
              const input = e.currentTarget;
              setTimeout(() => {
                input.removeAttribute('readonly');
                input.showPicker?.();
              }, 100);
            }
          }}
        />
      </div>
    </div>
  );
});

WorkoutHeader.displayName = 'WorkoutHeader';
