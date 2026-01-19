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
    <div className="premium-card-static p-4 lg:p-6 mb-4 lg:mb-6 sticky top-0 z-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 lg:gap-4">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBack();
            }}
            className="p-2.5 rounded-xl bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-all touch-manipulation cursor-pointer"
            aria-label="חזור"
          >
            <ArrowRight className="h-5 w-5 lg:h-6 lg:w-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/15">
              <Dumbbell className="h-6 w-6 lg:h-7 lg:w-7 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-white">
                {workoutId ? 'עריכת אימון' : 'אימון חדש'}
              </h1>
              <p className="text-sm lg:text-base text-zinc-500">{trainee.full_name}</p>
              {trainee.is_pair && selectedMember && workoutType === 'personal' && (
                <p className={`text-xs font-semibold mt-1 px-2 py-0.5 rounded-lg inline-block ${
                  selectedMember === 'member_1' 
                    ? 'text-cyan-400 bg-cyan-500/15 border border-cyan-500/30'
                    : 'text-amber-400 bg-amber-500/15 border border-amber-500/30'
                }`}>
                  {selectedMember === 'member_1' ? trainee.pairName1 : trainee.pairName2}
                </p>
              )}
              {exercisesCount > 0 && (
                <p className="text-sm font-semibold mt-1 text-emerald-400 bg-emerald-500/15 rounded-lg px-2 py-0.5 inline-block">
                  נפח כולל: {totalVolume.toLocaleString()} ק"ג
                </p>
              )}
              {!workoutId && <AutoSaveIndicator lastSaved={lastSaved} isDirty={isDirty} />}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {exercisesCount === 0 && !workoutId && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onLoadPrevious();
              }}
              className="bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 px-3 lg:px-5 py-2.5 lg:py-3 rounded-xl flex items-center gap-2 transition-all touch-manipulation cursor-pointer"
            >
              <Copy className="h-4 w-4 lg:h-5 lg:w-5" />
              <span className="font-medium text-sm lg:text-base hidden sm:inline">טען אימון אחרון</span>
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
              className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 px-3 lg:px-5 py-2.5 lg:py-3 rounded-xl flex items-center gap-2 transition-all touch-manipulation cursor-pointer"
            >
              <BookMarked className="h-4 w-4 lg:h-5 lg:w-5" />
              <span className="font-medium text-sm lg:text-base hidden sm:inline">שמור תבנית</span>
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
            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-4 lg:px-6 py-2.5 lg:py-3 rounded-xl flex items-center gap-2 transition-all disabled:cursor-not-allowed touch-manipulation font-bold cursor-pointer"
          >
            <Save className="h-4 w-4 lg:h-5 lg:w-5" />
            <span className="text-sm lg:text-base">{saving ? 'שומר...' : (workoutId ? 'עדכן' : 'שמור')}</span>
          </button>
        </div>
      </div>

      <div className="mt-4 bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-zinc-500" />
          <label className="text-sm font-medium text-zinc-400">תאריך האימון</label>
        </div>
        <input
          type="date"
          value={workoutDate.toISOString().split('T')[0]}
          onChange={(e) => onDateChange(new Date(e.target.value))}
          className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 text-white rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          readOnly={isTablet}
          onClick={(e) => {
            if (isTablet && e.currentTarget.hasAttribute('readonly')) {
              e.currentTarget.removeAttribute('readonly');
              // Date picker will open on click
            }
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <button
          type="button"
          onClick={handlePersonalClick}
          className={`py-3 lg:py-4 px-4 rounded-xl border transition-all touch-manipulation cursor-pointer ${
            workoutType === 'personal'
              ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400 font-bold'
              : 'border-zinc-700/50 bg-zinc-800/30 hover:bg-zinc-800/50 text-zinc-400 hover:text-white'
          }`}
        >
          <span className="text-base lg:text-lg">אימון אישי</span>
        </button>
        <button
          type="button"
          onClick={handlePairClick}
          className={`py-3 lg:py-4 px-4 rounded-xl border transition-all touch-manipulation cursor-pointer ${
            workoutType === 'pair'
              ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400 font-bold'
              : 'border-zinc-700/50 bg-zinc-800/30 hover:bg-zinc-800/50 text-zinc-400 hover:text-white'
          }`}
        >
          <span className="text-base lg:text-lg">אימון זוגי</span>
        </button>
      </div>
    </div>
  );
});

WorkoutHeader.displayName = 'WorkoutHeader';
