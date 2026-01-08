import { ArrowRight, Save, Calculator, BookMarked, Dumbbell, Copy } from 'lucide-react';
import { memo } from 'react';
import AutoSaveIndicator from '../../common/AutoSaveIndicator';

interface WorkoutHeaderProps {
  trainee: {
    full_name: string;
  };
  workoutId: string | null;
  totalVolume: number;
  lastSaved: Date | null;
  isDirty: boolean;
  workoutDate: Date;
  workoutType: 'personal' | 'pair';
  exercisesCount: number;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
  onCalculator: () => void;
  onSaveTemplate: () => void;
  onLoadPrevious: () => void;
  onDateChange: (date: Date) => void;
  onWorkoutTypeChange: (type: 'personal' | 'pair') => void;
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
  onBack,
  onSave,
  onCalculator,
  onSaveTemplate,
  onLoadPrevious,
  onDateChange,
  onWorkoutTypeChange,
}: WorkoutHeaderProps) => {
  return (
    <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl shadow-xl p-4 lg:p-6 mb-4 lg:mb-6 sticky top-0 z-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3 lg:space-x-4 rtl:space-x-reverse">
          <button
            type="button"
            onClick={onBack}
            className="p-3 lg:p-4 hover:bg-white/10 active:bg-white/20 rounded-xl transition-all duration-300 touch-manipulation text-white"
            aria-label="חזור"
          >
            <ArrowRight className="h-6 w-6 lg:h-7 lg:w-7" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 lg:w-14 lg:h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Dumbbell className="h-6 w-6 lg:h-7 lg:w-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl lg:text-3xl font-bold text-white">
                {workoutId ? 'עריכת אימון' : 'אימון חדש'}
              </h1>
              <p className="text-base lg:text-lg text-emerald-100">{trainee.full_name}</p>
              {exercisesCount > 0 && (
                <p className="text-sm lg:text-base text-white font-semibold mt-1 bg-white/20 rounded-lg px-2 py-0.5 inline-block">
                  נפח כולל: {totalVolume.toLocaleString()} ק"ג
                </p>
              )}
              {!workoutId && <AutoSaveIndicator lastSaved={lastSaved} isDirty={isDirty} />}
            </div>
          </div>
        </div>

        <div className="flex space-x-3 rtl:space-x-reverse">
          {exercisesCount === 0 && !workoutId && (
            <button
              type="button"
              onClick={onLoadPrevious}
              className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-4 lg:px-6 py-3 lg:py-4 rounded-xl flex items-center space-x-2 rtl:space-x-reverse transition-all duration-300 shadow-lg hover:shadow-xl touch-manipulation"
            >
              <Copy className="h-5 w-5 lg:h-6 lg:w-6" />
              <span className="font-semibold text-base lg:text-lg">טען אימון אחרון</span>
            </button>
          )}
          <button
            type="button"
            onClick={onCalculator}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm active:bg-white/40 text-white px-4 lg:px-6 py-3 lg:py-4 rounded-xl flex items-center space-x-2 rtl:space-x-reverse transition-all duration-300 shadow-lg hover:shadow-xl touch-manipulation"
          >
            <Calculator className="h-5 w-5 lg:h-6 lg:w-6" />
            <span className="font-semibold text-base lg:text-lg">מחשבון</span>
          </button>
          {exercisesCount > 0 && !workoutId && (
            <button
              type="button"
              onClick={onSaveTemplate}
              className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white px-4 lg:px-6 py-3 lg:py-4 rounded-xl flex items-center space-x-2 rtl:space-x-reverse transition-all duration-300 shadow-lg hover:shadow-xl touch-manipulation"
            >
              <BookMarked className="h-5 w-5 lg:h-6 lg:w-6" />
              <span className="font-semibold text-base lg:text-lg">שמור תבנית</span>
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={saving || exercisesCount === 0}
            className="bg-white hover:bg-gray-50 active:bg-gray-100 text-emerald-700 px-6 lg:px-8 py-3 lg:py-4 rounded-xl flex items-center space-x-2 rtl:space-x-reverse transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl touch-manipulation font-bold"
          >
            <Save className="h-5 w-5 lg:h-6 lg:w-6" />
            <span className="text-base lg:text-lg">{saving ? 'שומר...' : (workoutId ? 'עדכן אימון' : 'שמור אימון')}</span>
          </button>
        </div>
      </div>

      <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
        <label className="block text-sm font-medium text-emerald-100 mb-2">תאריך האימון</label>
        <input
          type="date"
          value={workoutDate.toISOString().split('T')[0]}
          onChange={(e) => onDateChange(new Date(e.target.value))}
          className="w-full px-4 py-3 border-2 border-white/20 bg-white/10 text-white rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all duration-300"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:gap-4 mt-4">
        <button
          type="button"
          onClick={() => onWorkoutTypeChange('personal')}
          className={`py-4 lg:py-5 px-4 rounded-xl border-2 transition-all duration-300 touch-manipulation ${
            workoutType === 'personal'
              ? 'border-white bg-white text-emerald-700 font-bold shadow-lg'
              : 'border-white/30 hover:bg-white/10 text-white'
          }`}
        >
          <span className="text-base lg:text-lg">אימון אישי</span>
        </button>
        <button
          type="button"
          onClick={() => onWorkoutTypeChange('pair')}
          className={`py-4 lg:py-5 px-4 rounded-xl border-2 transition-all duration-300 touch-manipulation ${
            workoutType === 'pair'
              ? 'border-white bg-white text-emerald-700 font-bold shadow-lg'
              : 'border-white/30 hover:bg-white/10 text-white'
          }`}
        >
          <span className="text-base lg:text-lg">אימון זוגי</span>
        </button>
      </div>
    </div>
  );
});

WorkoutHeader.displayName = 'WorkoutHeader';
