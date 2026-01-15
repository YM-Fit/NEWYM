import React from 'react';
import { Copy, Trash2 } from 'lucide-react';
import type { SetData, Equipment, Exercise } from '../types';
import type { NumericPadState, SupersetNumericPadState, DropsetNumericPadState, SupersetDropsetNumericPadState, SelectorState } from '../types';

interface WorkoutSetEditorProps {
  set: SetData;
  exerciseIndex: number;
  setIndex: number;
  setsCount: number;
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: string, value: any) => void;
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
  onDuplicateSet: (exerciseIndex: number, setIndex: number) => void;
  onOpenNumericPad: (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps' | 'rpe', label: string) => void;
  onOpenEquipmentSelector: (exerciseIndex: number, setIndex: number) => void;
  onOpenSupersetSelector: (exerciseIndex: number, setIndex: number) => void;
  onOpenSupersetNumericPad: (exerciseIndex: number, setIndex: number, field: 'superset_weight' | 'superset_reps' | 'superset_rpe', label: string) => void;
  onOpenSupersetEquipmentSelector: (exerciseIndex: number, setIndex: number) => void;
  onOpenDropsetNumericPad: (exerciseIndex: number, setIndex: number, field: 'dropset_weight' | 'dropset_reps', label: string) => void;
  onOpenSupersetDropsetNumericPad: (exerciseIndex: number, setIndex: number, field: 'superset_dropset_weight' | 'superset_dropset_reps', label: string) => void;
}

export default function WorkoutSetEditor({
  set,
  exerciseIndex,
  setIndex,
  setsCount,
  onUpdateSet,
  onRemoveSet,
  onDuplicateSet,
  onOpenNumericPad,
  onOpenEquipmentSelector,
  onOpenSupersetSelector,
  onOpenSupersetNumericPad,
  onOpenSupersetEquipmentSelector,
  onOpenDropsetNumericPad,
  onOpenSupersetDropsetNumericPad,
}: WorkoutSetEditorProps) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 border-2 border-gray-200 transition-all duration-300 hover:shadow-md">
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-base lg:text-lg text-gray-700 bg-white px-3 py-1 rounded-lg shadow-sm">סט {set.set_number}</span>
        <div className="flex space-x-2 rtl:space-x-reverse">
          <button
            onClick={() => onDuplicateSet(exerciseIndex, setIndex)}
            className="p-2 lg:p-3 hover:bg-white rounded-xl transition-all duration-300 shadow-sm hover:shadow-md"
            title="שכפל סט"
          >
            <Copy className="h-4 w-4 lg:h-5 lg:w-5 text-gray-600" />
          </button>
          {setsCount > 1 && (
            <button
              onClick={() => onRemoveSet(exerciseIndex, setIndex)}
              className="p-2 lg:p-3 hover:bg-red-50 text-red-600 rounded-xl transition-all duration-300"
            >
              <Trash2 className="h-4 w-4 lg:h-5 lg:w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-3">
        <div>
          <label className="block text-sm lg:text-base font-semibold text-gray-700 mb-2">משקל (ק״ג)</label>
          <button
            onClick={() => onOpenNumericPad(exerciseIndex, setIndex, 'weight', 'משקל (ק״ג)')}
            className="w-full px-3 py-3 lg:py-5 text-xl lg:text-3xl font-bold border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700 rounded-xl hover:from-emerald-100 hover:to-teal-100 transition-all duration-300 shadow-md hover:shadow-lg"
          >
            {set.weight || '0'}
          </button>
        </div>

        <div>
          <label className="block text-sm lg:text-base font-semibold text-gray-700 mb-2">חזרות</label>
          <button
            onClick={() => onOpenNumericPad(exerciseIndex, setIndex, 'reps', 'חזרות')}
            className="w-full px-3 py-3 lg:py-5 text-xl lg:text-3xl font-bold border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-sky-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-sky-100 transition-all duration-300 shadow-md hover:shadow-lg"
          >
            {set.reps || '0'}
          </button>
        </div>

        <div>
          <label className="block text-sm lg:text-base font-semibold text-gray-700 mb-2">RPE</label>
          <button
            onClick={() => onOpenNumericPad(exerciseIndex, setIndex, 'rpe', 'RPE (1-10)')}
            className="w-full px-3 py-3 lg:py-5 text-xl lg:text-3xl font-bold border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700 rounded-xl hover:from-amber-100 hover:to-orange-100 transition-all duration-300 shadow-md hover:shadow-lg"
          >
            {set.rpe || '-'}
          </button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => onOpenEquipmentSelector(exerciseIndex, setIndex)}
          className={`py-3 lg:py-4 px-3 rounded-xl border-2 transition-all duration-300 text-right shadow-sm hover:shadow-md ${
            set.equipment
              ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-sky-50'
              : 'border-gray-300 hover:border-blue-400 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className="text-xl lg:text-2xl">
                {set.equipment?.emoji || '🎒'}
              </span>
              <span className="font-semibold text-sm lg:text-base">
                {set.equipment?.name || 'ציוד'}
              </span>
            </div>
            {set.equipment && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateSet(exerciseIndex, setIndex, 'equipment_id', null);
                  onUpdateSet(exerciseIndex, setIndex, 'equipment', null);
                }}
                className="p-1 hover:bg-red-100 rounded-lg text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </button>

        <button
          onClick={() => onUpdateSet(exerciseIndex, setIndex, 'failure', !set.failure)}
          className={`py-3 lg:py-4 px-3 rounded-xl border-2 transition-all duration-300 shadow-sm hover:shadow-md ${
            set.failure
              ? 'border-red-500 bg-gradient-to-br from-red-50 to-rose-50 text-red-700'
              : 'border-gray-300 hover:border-red-400 bg-white text-gray-700'
          }`}
        >
          <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
            <span className="text-xl lg:text-2xl">
              {set.failure ? '🔥' : '💪'}
            </span>
            <span className="font-semibold text-sm lg:text-base">
              כשל
            </span>
          </div>
        </button>
      </div>

      <div className="flex space-x-2 rtl:space-x-reverse">
        <button
          onClick={() => onUpdateSet(exerciseIndex, setIndex, 'set_type', 'regular')}
          className={`flex-1 py-3 px-3 rounded-xl text-sm font-bold transition-all duration-300 ${
            set.set_type === 'regular'
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg'
              : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          רגיל
        </button>
        <button
          onClick={() => {
            if (set.set_type !== 'superset') {
              onUpdateSet(exerciseIndex, setIndex, 'set_type', 'superset');
            }
          }}
          className={`flex-1 py-3 px-3 rounded-xl text-sm font-bold transition-all duration-300 ${
            set.set_type === 'superset'
              ? 'bg-gradient-to-br from-blue-500 to-sky-600 text-white shadow-lg'
              : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          סופר-סט
        </button>
        <button
          onClick={() => onUpdateSet(exerciseIndex, setIndex, 'set_type', 'dropset')}
          className={`flex-1 py-3 px-3 rounded-xl text-sm font-bold transition-all duration-300 ${
            set.set_type === 'dropset'
              ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg'
              : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          דרופ-סט
        </button>
      </div>

      {set.set_type === 'superset' && (
        <div className="mt-4 pt-4 border-t-2 border-blue-200">
          <div className="mb-3">
            <label className="block text-sm font-bold text-blue-700 mb-2">
              תרגיל סופר-סט
            </label>
            {set.superset_exercise_id ? (
              <div className="flex items-center justify-between bg-gradient-to-br from-blue-50 to-sky-50 border-2 border-blue-500 rounded-xl p-4 shadow-md">
                <span className="font-bold text-blue-900">{set.superset_exercise_name}</span>
                <button
                  onClick={() => {
                    onUpdateSet(exerciseIndex, setIndex, 'superset_exercise_id', null);
                    onUpdateSet(exerciseIndex, setIndex, 'superset_exercise_name', null);
                    onUpdateSet(exerciseIndex, setIndex, 'superset_weight', null);
                    onUpdateSet(exerciseIndex, setIndex, 'superset_reps', null);
                  }}
                  className="p-1 hover:bg-red-100 rounded-lg text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onOpenSupersetSelector(exerciseIndex, setIndex)}
                className="w-full py-4 px-4 border-2 border-dashed border-blue-400 rounded-xl hover:border-blue-500 hover:bg-blue-50 text-blue-600 font-bold transition-all duration-300"
              >
                + בחר תרגיל לסופר-סט
              </button>
            )}
          </div>
          {set.superset_exercise_id && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-bold text-blue-700 mb-2">
                    משקל (ק״ג)
                  </label>
                  <button
                    onClick={() => onOpenSupersetNumericPad(exerciseIndex, setIndex, 'superset_weight', 'משקל סופר-סט (ק״ג)')}
                    className="w-full px-3 py-3 text-xl font-bold border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-sky-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-sky-100 transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    {set.superset_weight || '0'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-bold text-blue-700 mb-2">
                    חזרות
                  </label>
                  <button
                    onClick={() => onOpenSupersetNumericPad(exerciseIndex, setIndex, 'superset_reps', 'חזרות סופר-סט')}
                    className="w-full px-3 py-3 text-xl font-bold border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-sky-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-sky-100 transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    {set.superset_reps || '0'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-bold text-blue-700 mb-2">
                    RPE
                  </label>
                  <button
                    onClick={() => onOpenSupersetNumericPad(exerciseIndex, setIndex, 'superset_rpe', 'RPE סופר-סט (1-10)')}
                    className="w-full px-3 py-3 text-xl font-bold border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-sky-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-sky-100 transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    {set.superset_rpe || '-'}
                  </button>
                </div>
              </div>

              <div>
                <button
                  onClick={() => onOpenSupersetEquipmentSelector(exerciseIndex, setIndex)}
                  className={`w-full py-3 px-4 rounded-xl border-2 transition-all duration-300 text-right shadow-sm hover:shadow-md ${
                    set.superset_equipment
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-sky-50'
                      : 'border-blue-300 hover:border-blue-500 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="text-2xl">
                        {set.superset_equipment?.emoji || '🎒'}
                      </span>
                      <span className="font-semibold text-base">
                        {set.superset_equipment?.name || 'הוסף ציוד (אופציונלי)'}
                      </span>
                    </div>
                    {set.superset_equipment && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateSet(exerciseIndex, setIndex, 'superset_equipment_id', null);
                          onUpdateSet(exerciseIndex, setIndex, 'superset_equipment', null);
                        }}
                        className="p-1 hover:bg-red-100 rounded-lg text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </button>
              </div>

              <div>
                <label className="block text-sm font-bold text-blue-700 mb-2">
                  דרופ-סט לסופר-סט (אופציונלי)
                </label>
                {(set.superset_dropset_weight !== null && set.superset_dropset_weight !== undefined) || (set.superset_dropset_reps !== null && set.superset_dropset_reps !== undefined) ? (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-4 shadow-md">
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div>
                        <label className="block text-xs font-bold text-amber-700 mb-1">
                          משקל דרופ (ק״ג)
                        </label>
                        <button
                          onClick={() => onOpenSupersetDropsetNumericPad(exerciseIndex, setIndex, 'superset_dropset_weight', 'משקל דרופ-סט סופר (ק״ג)')}
                          className="w-full px-2 py-2 text-lg font-bold border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700 rounded-xl hover:from-amber-100 hover:to-orange-100 transition-all duration-300 shadow-md"
                        >
                          {set.superset_dropset_weight || '0'}
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-amber-700 mb-1">
                          חזרות דרופ
                        </label>
                        <button
                          onClick={() => onOpenSupersetDropsetNumericPad(exerciseIndex, setIndex, 'superset_dropset_reps', 'חזרות דרופ-סט סופר')}
                          className="w-full px-2 py-2 text-lg font-bold border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700 rounded-xl hover:from-amber-100 hover:to-orange-100 transition-all duration-300 shadow-md"
                        >
                          {set.superset_dropset_reps || '0'}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onUpdateSet(exerciseIndex, setIndex, 'superset_dropset_weight', null);
                        onUpdateSet(exerciseIndex, setIndex, 'superset_dropset_reps', null);
                      }}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold"
                    >
                      הסר דרופ-סט
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      onUpdateSet(exerciseIndex, setIndex, 'superset_dropset_weight', 0);
                      onUpdateSet(exerciseIndex, setIndex, 'superset_dropset_reps', 0);
                    }}
                    className="w-full py-2 px-4 border-2 border-dashed border-amber-400 rounded-xl hover:border-amber-500 hover:bg-amber-50 text-amber-600 font-bold transition-all duration-300 text-sm"
                  >
                    + הוסף דרופ-סט
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {set.set_type === 'dropset' && (
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t-2 border-amber-200">
          <div>
            <label className="block text-sm font-bold text-amber-700 mb-2">
              משקל דרופ (ק״ג)
            </label>
            <button
              onClick={() => onOpenDropsetNumericPad(exerciseIndex, setIndex, 'dropset_weight', 'משקל דרופ-סט (ק״ג)')}
              className="w-full px-3 py-3 text-xl font-bold border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700 rounded-xl hover:from-amber-100 hover:to-orange-100 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              {set.dropset_weight || '0'}
            </button>
          </div>
          <div>
            <label className="block text-sm font-bold text-amber-700 mb-2">
              חזרות דרופ
            </label>
            <button
              onClick={() => onOpenDropsetNumericPad(exerciseIndex, setIndex, 'dropset_reps', 'חזרות דרופ-סט')}
              className="w-full px-3 py-3 text-xl font-bold border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700 rounded-xl hover:from-amber-100 hover:to-orange-100 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              {set.dropset_reps || '0'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
