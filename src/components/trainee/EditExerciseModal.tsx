import { useState, useEffect } from 'react';
import { X, Save, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { notifyTrainerOfPlanChange } from '../../utils/workoutPlanNotifications';

interface Exercise {
  id: string;
  name: string;
  muscle_group_id: string;
}

interface DayExercise {
  id: string;
  day_id: string;
  exercise_id: string | null;
  exercise_name: string | null;
  sets_count: number;
  reps_range: string;
  rest_seconds: number;
  notes: string | null;
  target_weight: number | null;
  trainee_notes: string | null;
  trainee_target_weight: number | null;
  exercise?: {
    id: string;
    name: string;
    muscle_group_id: string;
  };
}

interface EditExerciseModalProps {
  isOpen: boolean;
  exercise: DayExercise | null;
  dayId: string;
  traineeId: string;
  planId: string;
  trainerId: string;
  onClose: () => void;
  onSave: () => void;
  isAddingNew?: boolean;
}

export default function EditExerciseModal({
  isOpen,
  exercise,
  dayId,
  traineeId,
  planId,
  trainerId,
  onClose,
  onSave,
  isAddingNew = false,
}: EditExerciseModalProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [formData, setFormData] = useState({
    exercise_id: '',
    trainee_target_weight: null as number | null,
    trainee_notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (isAddingNew) {
        loadExercises();
        setFormData({
          exercise_id: '',
          trainee_target_weight: null,
          trainee_notes: '',
        });
      } else if (exercise) {
        setFormData({
          exercise_id: exercise.exercise_id || '',
          trainee_target_weight: exercise.trainee_target_weight,
          trainee_notes: exercise.trainee_notes || '',
        });
      }
    }
  }, [isOpen, exercise, isAddingNew]);

  const loadExercises = async () => {
    setLoadingExercises(true);
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name, muscle_group_id')
        .order('name');

      if (error) throw error;
      setExercises(data || []);
    } catch (error: any) {
      toast.error('שגיאה בטעינת תרגילים');
    } finally {
      setLoadingExercises(false);
    }
  };

  const handleSave = async () => {
    if (isAddingNew) {
      if (!formData.exercise_id) {
        toast.error('נא לבחור תרגיל');
        return;
      }

      setSaving(true);
      try {
        // Get the selected exercise
        const selectedExercise = exercises.find(e => e.id === formData.exercise_id);
        if (!selectedExercise) {
          toast.error('תרגיל לא נמצא');
          return;
        }

        // Get max order_index for this day
        const { data: existingExercises } = await supabase
          .from('workout_plan_day_exercises')
          .select('order_index')
          .eq('day_id', dayId)
          .order('order_index', { ascending: false })
          .limit(1);

        const nextOrderIndex = existingExercises && existingExercises.length > 0
          ? (existingExercises[0] as any).order_index + 1
          : 0;

        // Insert new exercise
        const { error: insertError } = await supabase
          .from('workout_plan_day_exercises')
          .insert({
            day_id: dayId,
            exercise_id: formData.exercise_id,
            sets_count: 3,
            reps_range: '10-12',
            rest_seconds: 90,
            order_index: nextOrderIndex,
            target_weight: formData.trainee_target_weight,
            trainee_target_weight: formData.trainee_target_weight,
            trainee_notes: formData.trainee_notes || null,
            added_by_trainee: true,
            trainee_added_at: new Date().toISOString(),
          } as any);

        if (insertError) throw insertError;

        // Notify trainer
        await notifyTrainerOfPlanChange({
          trainerId,
          traineeId,
          changeType: 'exercise_added',
          exerciseName: selectedExercise.name,
          planId,
          exerciseId: formData.exercise_id,
        });

        toast.success('תרגיל נוסף בהצלחה');
        onSave();
        onClose();
      } catch (error: any) {
        toast.error('שגיאה בהוספת תרגיל');
      } finally {
        setSaving(false);
      }
    } else if (exercise) {
      setSaving(true);
      try {
        const { error } = await supabase
          .from('workout_plan_day_exercises')
          .update({
            trainee_target_weight: formData.trainee_target_weight,
            trainee_notes: formData.trainee_notes || null,
            trainee_modified_at: new Date().toISOString(),
          } as any)
          .eq('id', exercise.id);

        if (error) throw error;

        // Notify trainer
        await notifyTrainerOfPlanChange({
          trainerId,
          traineeId,
          changeType: 'exercise_edited',
          exerciseName: exercise.exercise?.name || exercise.exercise_name || 'תרגיל',
          planId,
        });

        toast.success('תרגיל עודכן בהצלחה');
        onSave();
        onClose();
      } catch (error: any) {
        toast.error('שגיאה בעדכון תרגיל');
      } finally {
        setSaving(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[var(--color-border)] p-5 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {isAddingNew ? 'הוסף תרגיל' : 'ערוך תרגיל'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-bg-surface)] rounded-xl transition-all"
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isAddingNew && (
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                בחר תרגיל
              </label>
              {loadingExercises ? (
                <div className="text-[var(--color-text-muted)]">טוען תרגילים...</div>
              ) : (
                <select
                  value={formData.exercise_id}
                  onChange={(e) => setFormData({ ...formData, exercise_id: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                >
                  <option value="">בחר תרגיל</option>
                  {exercises.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {!isAddingNew && exercise && (
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                תרגיל
              </label>
              <div className="px-4 py-3 bg-[var(--color-bg-surface)] rounded-xl border border-[var(--color-border)]">
                <span className="font-bold text-[var(--color-text-primary)]">
                  {exercise.exercise?.name || exercise.exercise_name || 'תרגיל'}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
              משקל יעד שלי (ק״ג)
            </label>
            <input
              type="number"
              value={formData.trainee_target_weight || ''}
              onChange={(e) => setFormData({
                ...formData,
                trainee_target_weight: e.target.value ? parseFloat(e.target.value) : null,
              })}
              placeholder={!isAddingNew && exercise?.target_weight ? `המאמן המליץ: ${exercise.target_weight}` : 'הזן משקל יעד'}
              className="w-full px-4 py-3 border-2 border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
              הערות שלי
            </label>
            <textarea
              value={formData.trainee_notes}
              onChange={(e) => setFormData({ ...formData, trainee_notes: e.target.value })}
              placeholder="הוסף הערות אישיות לתרגיל..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[var(--color-border)] p-5 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || (isAddingNew && !formData.exercise_id)}
            className="flex-1 py-3 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-foreground font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                שומר...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {isAddingNew ? 'הוסף' : 'שמור'}
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] font-bold rounded-xl transition-all"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
