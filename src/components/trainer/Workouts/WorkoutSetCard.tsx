import { memo, useCallback } from 'react';
import { Copy, Trash2, Calculator } from 'lucide-react';

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

interface WorkoutSetCardProps {
  set: SetData;
  setIndex: number;
  isCollapsed: boolean;
  canDelete: boolean;
  onToggleCollapse: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onOpenNumericPad: (field: 'weight' | 'reps' | 'rpe') => void;
  onOpenEquipmentSelector: () => void;
  onOpenSupersetSelector: () => void;
  onOpenSupersetNumericPad: (field: 'superset_weight' | 'superset_reps' | 'superset_rpe') => void;
  onOpenSupersetEquipmentSelector: () => void;
  onOpenDropsetNumericPad: (field: 'dropset_weight' | 'dropset_reps') => void;
  onOpenSupersetDropsetNumericPad: (field: 'superset_dropset_weight' | 'superset_dropset_reps') => void;
  onUpdateSet: (field: string, value: any) => void;
  onOpenCalculator: () => void;
}

export const WorkoutSetCard = memo(({
  set,
  setIndex,
  isCollapsed,
  canDelete,
  onToggleCollapse,
  onDuplicate,
  onRemove,
  onOpenNumericPad,
  onOpenEquipmentSelector,
  onOpenSupersetSelector,
  onOpenSupersetNumericPad,
  onOpenSupersetEquipmentSelector,
  onOpenDropsetNumericPad,
  onOpenSupersetDropsetNumericPad,
  onUpdateSet,
  onOpenCalculator,
}: WorkoutSetCardProps) => {
  if (isCollapsed) {
    return (
      <div
        onClick={onToggleCollapse}
        className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl p-3 border border-gray-200 cursor-pointer hover:border-emerald-300 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-teal-50 transition-all duration-300"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm text-white bg-gradient-to-br from-emerald-500 to-teal-600 px-3 py-1.5 rounded-lg">סט {set.set_number}</span>
            <span className="text-gray-700 font-medium">{set.weight} ק״ג</span>
            <span className="text-gray-500">x</span>
            <span className="text-gray-700 font-medium">{set.reps} חזרות</span>
            {set.rpe && <span className="text-amber-600 text-sm">RPE {set.rpe}</span>}
            {set.set_type !== 'regular' && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                set.set_type === 'superset' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {set.set_type === 'superset' ? 'סופר-סט' : 'דרופ-סט'}
              </span>
            )}
          </div>
          <span className="text-xs text-emerald-600 font-medium">לחץ לעריכה</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-base lg:text-lg text-white bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-2 rounded-xl">סט {set.set_number}</span>
        <div className="flex space-x-2 rtl:space-x-reverse">
          <button
            type="button"
            onClick={onDuplicate}
            className="p-2 lg:p-3 hover:bg-blue-50 active:bg-blue-100 rounded-xl transition-all duration-300 touch-manipulation"
            title="שכפל סט"
            aria-label="שכפל סט"
          >
            <Copy className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={onRemove}
              className="p-2 lg:p-3 hover:bg-red-50 active:bg-red-100 text-red-500 rounded-xl transition-all duration-300 touch-manipulation"
              aria-label="מחק סט"
            >
              <Trash2 className="h-4 w-4 lg:h-5 lg:w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-3">
        <div>
          <label className="block text-sm lg:text-base font-medium text-gray-700 mb-1">משקל (ק״ג)</label>
          <button
            type="button"
            onClick={() => onOpenNumericPad('weight')}
            className="w-full px-3 py-3 lg:py-5 text-xl lg:text-3xl font-bold border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700 rounded-xl hover:from-emerald-100 hover:to-teal-100 active:from-emerald-200 active:to-teal-200 transition-all duration-300 touch-manipulation shadow-md hover:shadow-lg"
          >
            {set.weight || '0'}
          </button>
        </div>

        <div>
          <label className="block text-sm lg:text-base font-medium text-gray-700 mb-1">חזרות</label>
          <button
            type="button"
            onClick={() => onOpenNumericPad('reps')}
            className="w-full px-3 py-3 lg:py-5 text-xl lg:text-3xl font-bold border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-cyan-100 active:from-blue-200 active:to-cyan-200 transition-all duration-300 touch-manipulation shadow-md hover:shadow-lg"
          >
            {set.reps || '0'}
          </button>
        </div>

        <div>
          <label className="block text-sm lg:text-base font-medium text-gray-700 mb-1">RPE</label>
          <button
            type="button"
            onClick={() => onOpenNumericPad('rpe')}
            className="w-full px-3 py-3 lg:py-5 text-xl lg:text-3xl font-bold border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700 rounded-xl hover:from-amber-100 hover:to-orange-100 active:from-amber-200 active:to-orange-200 transition-all duration-300 touch-manipulation shadow-md hover:shadow-lg"
          >
            {set.rpe || '-'}
          </button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onOpenEquipmentSelector}
          className={`py-3 lg:py-4 px-3 rounded-xl border-2 transition-all duration-300 text-right shadow-md hover:shadow-lg ${
            set.equipment
              ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50'
              : 'border-gray-200 hover:border-blue-300 bg-white hover:bg-blue-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className="text-xl lg:text-2xl">
                {set.equipment?.emoji || '🎒'}
              </span>
              <span className="font-medium text-sm lg:text-base">
                {set.equipment?.name || 'ציוד'}
              </span>
            </div>
            {set.equipment && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateSet('equipment_id', null);
                  onUpdateSet('equipment', null);
                }}
                className="p-1 hover:bg-red-100 rounded-lg text-red-500 transition-all duration-300"
                aria-label="מחק ציוד"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onUpdateSet('failure', !set.failure)}
          className={`py-3 lg:py-4 px-3 rounded-xl border-2 transition-all duration-300 shadow-md hover:shadow-lg ${
            set.failure
              ? 'border-red-400 bg-gradient-to-br from-red-50 to-orange-50 text-red-700'
              : 'border-gray-200 hover:border-red-300 bg-white text-gray-700 hover:bg-red-50/50'
          }`}
        >
          <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
            <span className="text-xl lg:text-2xl">
              {set.failure ? '🔥' : '💪'}
            </span>
            <span className="font-medium text-sm lg:text-base">
              כשל
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenCalculator}
          className="py-3 lg:py-4 px-3 rounded-xl border-2 border-gray-200 hover:border-amber-300 bg-white hover:bg-gradient-to-br hover:from-amber-50 hover:to-orange-50 transition-all duration-300 shadow-md hover:shadow-lg"
        >
          <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
            <Calculator className="h-5 w-5 lg:h-6 lg:w-6 text-amber-600" />
            <span className="font-medium text-sm lg:text-base text-gray-700">
              1RM
            </span>
          </div>
        </button>
      </div>

      <div className="flex space-x-2 rtl:space-x-reverse">
        <button
          type="button"
          onClick={() => onUpdateSet('set_type', 'regular')}
          className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all duration-300 ${
            set.set_type === 'regular'
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-emerald-300'
          }`}
        >
          רגיל
        </button>
        <button
          type="button"
          onClick={() => {
            if (set.set_type !== 'superset') {
              onUpdateSet('set_type', 'superset');
            }
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all duration-300 ${
            set.set_type === 'superset'
              ? 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-blue-300'
          }`}
        >
          סופר-סט
        </button>
        <button
          type="button"
          onClick={() => onUpdateSet('set_type', 'dropset')}
          className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all duration-300 ${
            set.set_type === 'dropset'
              ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-amber-300'
          }`}
        >
          דרופ-סט
        </button>
      </div>

      {set.set_type === 'superset' && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="mb-3">
            <label className="block text-sm font-medium text-blue-700 mb-2">
              תרגיל סופר-סט
            </label>
            {set.superset_exercise_id ? (
              <div className="flex items-center justify-between bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-400 rounded-xl p-3 shadow-md">
                <span className="font-medium text-blue-900">{set.superset_exercise_name}</span>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSet('superset_exercise_id', null);
                    onUpdateSet('superset_exercise_name', null);
                    onUpdateSet('superset_weight', null);
                    onUpdateSet('superset_reps', null);
                  }}
                  className="p-1 hover:bg-red-100 rounded-lg text-red-500 transition-all duration-300"
                  aria-label="מחק תרגיל סופר-סט"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenSupersetSelector}
                className="w-full py-3 px-4 border-2 border-dashed border-blue-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 text-blue-600 font-medium transition-all duration-300"
              >
                + בחר תרגיל לסופר-סט
              </button>
            )}
          </div>
          {set.superset_exercise_id && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    משקל (ק״ג)
                  </label>
                  <button
                    type="button"
                    onClick={() => onOpenSupersetNumericPad('superset_weight')}
                    className="w-full px-3 py-3 text-xl font-bold border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-cyan-100 active:from-blue-200 active:to-cyan-200 transition-all duration-300 shadow-md"
                  >
                    {set.superset_weight || '0'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    חזרות
                  </label>
                  <button
                    type="button"
                    onClick={() => onOpenSupersetNumericPad('superset_reps')}
                    className="w-full px-3 py-3 text-xl font-bold border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-cyan-100 active:from-blue-200 active:to-cyan-200 transition-all duration-300 shadow-md"
                  >
                    {set.superset_reps || '0'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    RPE
                  </label>
                  <button
                    type="button"
                    onClick={() => onOpenSupersetNumericPad('superset_rpe')}
                    className="w-full px-3 py-3 text-xl font-bold border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-cyan-100 active:from-blue-200 active:to-cyan-200 transition-all duration-300 shadow-md"
                  >
                    {set.superset_rpe || '-'}
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={onOpenSupersetEquipmentSelector}
                  className={`w-full py-3 px-4 rounded-xl border-2 transition-all duration-300 text-right shadow-md hover:shadow-lg ${
                    set.superset_equipment
                      ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50'
                      : 'border-blue-200 hover:border-blue-400 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="text-2xl">
                        {set.superset_equipment?.emoji || '🎒'}
                      </span>
                      <span className="font-medium text-base">
                        {set.superset_equipment?.name || 'הוסף ציוד (אופציונלי)'}
                      </span>
                    </div>
                    {set.superset_equipment && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateSet('superset_equipment_id', null);
                          onUpdateSet('superset_equipment', null);
                        }}
                        className="p-1 hover:bg-red-100 rounded-lg text-red-500 transition-all duration-300"
                        aria-label="מחק ציוד"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {set.set_type === 'dropset' && (
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
          <div>
            <label className="block text-sm font-medium text-amber-700 mb-1">
              משקל דרופ (ק״ג)
            </label>
            <button
              type="button"
              onClick={() => onOpenDropsetNumericPad('dropset_weight')}
              className="w-full px-3 py-3 text-xl font-bold border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700 rounded-xl hover:from-amber-100 hover:to-orange-100 active:from-amber-200 active:to-orange-200 transition-all duration-300 touch-manipulation shadow-md"
            >
              {set.dropset_weight || '0'}
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-amber-700 mb-1">
              חזרות דרופ
            </label>
            <button
              type="button"
              onClick={() => onOpenDropsetNumericPad('dropset_reps')}
              className="w-full px-3 py-3 text-xl font-bold border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700 rounded-xl hover:from-amber-100 hover:to-orange-100 active:from-amber-200 active:to-orange-200 transition-all duration-300 touch-manipulation shadow-md"
            >
              {set.dropset_reps || '0'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

WorkoutSetCard.displayName = 'WorkoutSetCard';
