import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  Plus,
  Trash2,
  Save,
  Target,
  Clock,
  Repeat,
  Copy,
  Calculator,
  Dumbbell,
  Info,
} from 'lucide-react';
import ExerciseSelector from '../Workouts/ExerciseSelector';
import QuickNumericPad from '../Workouts/QuickNumericPad';
import EquipmentSelector from '../Equipment/EquipmentSelector';
import ExerciseInstructionsModal from '../../common/ExerciseInstructionsModal';

interface Exercise {
  id: string;
  name: string;
  muscle_group_id: string;
  instructions?: string | null;
  muscle_group?: {
    name: string;
  };
}

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

interface PlanExercise {
  tempId: string;
  exercise: Exercise;
  sets: SetData[];
  rest_seconds: number;
  notes: string;
}

interface WorkoutDay {
  tempId: string;
  day_number: number;
  day_name: string;
  focus: string;
  notes: string;
  exercises: PlanExercise[];
}

interface WorkoutPlanBuilderProps {
  traineeId: string;
  traineeName: string;
  onBack: () => void;
}

const dayColors = [
  { bg: 'from-emerald-500 to-teal-600', light: 'bg-gradient-to-br from-emerald-50 to-teal-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  { bg: 'from-blue-500 to-sky-600', light: 'bg-gradient-to-br from-blue-50 to-sky-50', text: 'text-blue-700', border: 'border-blue-200' },
  { bg: 'from-amber-500 to-orange-600', light: 'bg-gradient-to-br from-amber-50 to-orange-50', text: 'text-amber-700', border: 'border-amber-200' },
  { bg: 'from-rose-500 to-pink-600', light: 'bg-gradient-to-br from-rose-50 to-pink-50', text: 'text-rose-700', border: 'border-rose-200' },
  { bg: 'from-cyan-500 to-teal-600', light: 'bg-gradient-to-br from-cyan-50 to-teal-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  { bg: 'from-green-500 to-emerald-600', light: 'bg-gradient-to-br from-green-50 to-emerald-50', text: 'text-green-700', border: 'border-green-200' },
];

interface WorkoutPlanTemplate {
  id: string;
  name: string;
  description: string | null;
  days: any[];
}

export default function WorkoutPlanBuilder({ traineeId, traineeName, onBack }: WorkoutPlanBuilderProps) {
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number | null>(null);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [saving, setSaving] = useState(false);
  const [minimizedDays, setMinimizedDays] = useState<Set<string>>(new Set());
  const [showLoadTemplateModal, setShowLoadTemplateModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState<WorkoutPlanTemplate[]>([]);

  const [numericPad, setNumericPad] = useState<{
    exerciseIndex: number;
    setIndex: number;
    field: 'weight' | 'reps' | 'rpe';
    value: number;
    label: string;
  } | null>(null);

  const [equipmentSelector, setEquipmentSelector] = useState<{
    exerciseIndex: number;
    setIndex: number;
  } | null>(null);

  const [supersetSelector, setSupersetSelector] = useState<{
    exerciseIndex: number;
    setIndex: number;
  } | null>(null);

  const [supersetNumericPad, setSupersetNumericPad] = useState<{
    exerciseIndex: number;
    setIndex: number;
    field: 'superset_weight' | 'superset_reps' | 'superset_rpe';
    value: number;
    label: string;
  } | null>(null);

  const [dropsetNumericPad, setDropsetNumericPad] = useState<{
    exerciseIndex: number;
    setIndex: number;
    field: 'dropset_weight' | 'dropset_reps';
    value: number;
    label: string;
  } | null>(null);

  const [supersetDropsetNumericPad, setSupersetDropsetNumericPad] = useState<{
    exerciseIndex: number;
    setIndex: number;
    field: 'superset_dropset_weight' | 'superset_dropset_reps';
    value: number;
    label: string;
  } | null>(null);

  const [supersetEquipmentSelector, setSupersetEquipmentSelector] = useState<{
    exerciseIndex: number;
    setIndex: number;
  } | null>(null);

  const [instructionsExercise, setInstructionsExercise] = useState<{
    name: string;
    instructions: string | null | undefined;
  } | null>(null);

  const addDay = () => {
    const newDay: WorkoutDay = {
      tempId: Date.now().toString() + Math.random(),
      day_number: days.length + 1,
      day_name: '',
      focus: '',
      notes: '',
      exercises: [],
    };
    setDays([...days, newDay]);
    setSelectedDay(newDay);
  };

  const removeDay = (dayId: string) => {
    if (!confirm('האם למחוק את היום?')) return;
    setDays(days.filter(d => d.tempId !== dayId));
    if (selectedDay?.tempId === dayId) {
      setSelectedDay(null);
    }
  };

  const duplicateDay = (day: WorkoutDay) => {
    const newDay: WorkoutDay = {
      ...day,
      tempId: Date.now().toString() + Math.random(),
      day_number: days.length + 1,
      day_name: day.day_name ? `${day.day_name} (עותק)` : '',
      exercises: day.exercises.map(ex => ({
        ...ex,
        tempId: Date.now().toString() + Math.random(),
        sets: ex.sets.map(set => ({ ...set, id: Date.now().toString() + Math.random() })),
      })),
    };
    setDays([...days, newDay]);
    toast.success('יום שוכפל בהצלחה');
  };

  const updateDay = (dayId: string, field: keyof WorkoutDay, value: any) => {
    setDays(days.map(d => d.tempId === dayId ? { ...d, [field]: value } : d));
    if (selectedDay?.tempId === dayId) {
      setSelectedDay({ ...selectedDay, [field]: value });
    }
  };

  const addExerciseToDay = (exercise: Exercise) => {
    if (!selectedDay) return;

    const newExercise: PlanExercise = {
      tempId: Date.now().toString() + Math.random(),
      exercise,
      sets: [
        {
          id: Date.now().toString() + Math.random(),
          set_number: 1,
          weight: 0,
          reps: 0,
          rpe: null,
          set_type: 'regular',
          failure: false,
          equipment_id: null,
          equipment: null,
        },
      ],
      rest_seconds: 90,
      notes: '',
    };

    const updatedDay = {
      ...selectedDay,
      exercises: [...selectedDay.exercises, newExercise],
    };

    setDays(days.map(d => d.tempId === selectedDay.tempId ? updatedDay : d));
    setSelectedDay(updatedDay);
    setShowExerciseSelector(false);
  };

  const removeExerciseFromDay = (exerciseIndex: number) => {
    if (!selectedDay) return;

    const updatedDay = {
      ...selectedDay,
      exercises: selectedDay.exercises.filter((_, i) => i !== exerciseIndex),
    };

    setDays(days.map(d => d.tempId === selectedDay.tempId ? updatedDay : d));
    setSelectedDay(updatedDay);
  };

  const addSet = (exerciseIndex: number) => {
    if (!selectedDay) return;

    const exercise = selectedDay.exercises[exerciseIndex];
    const lastSet = exercise.sets[exercise.sets.length - 1];

    const newSet: SetData = {
      id: Date.now().toString() + Math.random(),
      set_number: exercise.sets.length + 1,
      weight: lastSet?.weight || 0,
      reps: lastSet?.reps || 0,
      rpe: lastSet?.rpe >= 1 && lastSet?.rpe <= 10 ? lastSet.rpe : null,
      set_type: 'regular',
      failure: false,
      equipment_id: lastSet?.equipment_id || null,
      equipment: lastSet?.equipment || null,
    };

    const updatedExercises = [...selectedDay.exercises];
    updatedExercises[exerciseIndex] = {
      ...exercise,
      sets: [...exercise.sets, newSet],
    };

    const updatedDay = { ...selectedDay, exercises: updatedExercises };
    setDays(days.map(d => d.tempId === selectedDay.tempId ? updatedDay : d));
    setSelectedDay(updatedDay);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    if (!selectedDay) return;

    const exercise = selectedDay.exercises[exerciseIndex];
    if (exercise.sets.length === 1) return;

    const updatedSets = exercise.sets
      .filter((_, i) => i !== setIndex)
      .map((set, i) => ({ ...set, set_number: i + 1 }));

    const updatedExercises = [...selectedDay.exercises];
    updatedExercises[exerciseIndex] = {
      ...exercise,
      sets: updatedSets,
    };

    const updatedDay = { ...selectedDay, exercises: updatedExercises };
    setDays(days.map(d => d.tempId === selectedDay.tempId ? updatedDay : d));
    setSelectedDay(updatedDay);
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: string, value: any) => {
    if (!selectedDay) return;

    const exercise = selectedDay.exercises[exerciseIndex];
    const updatedSets = [...exercise.sets];
    updatedSets[setIndex] = { ...updatedSets[setIndex], [field]: value };

    const updatedExercises = [...selectedDay.exercises];
    updatedExercises[exerciseIndex] = {
      ...exercise,
      sets: updatedSets,
    };

    const updatedDay = { ...selectedDay, exercises: updatedExercises };
    setDays(days.map(d => d.tempId === selectedDay.tempId ? updatedDay : d));
    setSelectedDay(updatedDay);
  };

  const duplicateSet = (exerciseIndex: number, setIndex: number) => {
    if (!selectedDay) return;

    const exercise = selectedDay.exercises[exerciseIndex];
    const setToDuplicate = exercise.sets[setIndex];

    const newSet: SetData = {
      ...setToDuplicate,
      id: Date.now().toString() + Math.random(),
      set_number: exercise.sets.length + 1,
    };

    const updatedExercises = [...selectedDay.exercises];
    updatedExercises[exerciseIndex] = {
      ...exercise,
      sets: [...exercise.sets, newSet],
    };

    const updatedDay = { ...selectedDay, exercises: updatedExercises };
    setDays(days.map(d => d.tempId === selectedDay.tempId ? updatedDay : d));
    setSelectedDay(updatedDay);
  };

  const updateExercise = (exerciseIndex: number, field: keyof PlanExercise, value: any) => {
    if (!selectedDay) return;

    const updatedExercises = [...selectedDay.exercises];
    updatedExercises[exerciseIndex] = {
      ...updatedExercises[exerciseIndex],
      [field]: value,
    };

    const updatedDay = { ...selectedDay, exercises: updatedExercises };
    setDays(days.map(d => d.tempId === selectedDay.tempId ? updatedDay : d));
    setSelectedDay(updatedDay);
  };

  const openNumericPad = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps' | 'rpe', label: string) => {
    if (!selectedDay) return;
    const currentValue = selectedDay.exercises[exerciseIndex].sets[setIndex][field] || 0;
    setNumericPad({ exerciseIndex, setIndex, field, value: currentValue as number, label });
  };

  const handleNumericPadConfirm = (value: number) => {
    if (numericPad) {
      updateSet(numericPad.exerciseIndex, numericPad.setIndex, numericPad.field, value);
      setNumericPad(null);
    }
  };

  const handleEquipmentSelect = (equipment: Equipment | null) => {
    if (equipmentSelector) {
      updateSet(equipmentSelector.exerciseIndex, equipmentSelector.setIndex, 'equipment_id', equipment?.id || null);
      updateSet(equipmentSelector.exerciseIndex, equipmentSelector.setIndex, 'equipment', equipment);
      setEquipmentSelector(null);
    }
  };

  const handleSupersetExerciseSelect = (exercise: Exercise) => {
    if (supersetSelector) {
      updateSet(supersetSelector.exerciseIndex, supersetSelector.setIndex, 'set_type', 'superset');
      updateSet(supersetSelector.exerciseIndex, supersetSelector.setIndex, 'superset_exercise_id', exercise.id);
      updateSet(supersetSelector.exerciseIndex, supersetSelector.setIndex, 'superset_exercise_name', exercise.name);
      setSupersetSelector(null);
    }
  };

  const openSupersetNumericPad = (exerciseIndex: number, setIndex: number, field: 'superset_weight' | 'superset_reps' | 'superset_rpe', label: string) => {
    if (!selectedDay) return;
    const currentValue = selectedDay.exercises[exerciseIndex].sets[setIndex][field] || 0;
    setSupersetNumericPad({ exerciseIndex, setIndex, field, value: currentValue as number, label });
  };

  const handleSupersetEquipmentSelect = (equipment: Equipment | null) => {
    if (supersetEquipmentSelector) {
      updateSet(supersetEquipmentSelector.exerciseIndex, supersetEquipmentSelector.setIndex, 'superset_equipment_id', equipment?.id || null);
      updateSet(supersetEquipmentSelector.exerciseIndex, supersetEquipmentSelector.setIndex, 'superset_equipment', equipment);
      setSupersetEquipmentSelector(null);
    }
  };

  const handleSupersetNumericPadConfirm = (value: number) => {
    if (supersetNumericPad) {
      updateSet(supersetNumericPad.exerciseIndex, supersetNumericPad.setIndex, supersetNumericPad.field, value);
      setSupersetNumericPad(null);
    }
  };

  const openDropsetNumericPad = (exerciseIndex: number, setIndex: number, field: 'dropset_weight' | 'dropset_reps', label: string) => {
    if (!selectedDay) return;
    const currentValue = selectedDay.exercises[exerciseIndex].sets[setIndex][field] || 0;
    setDropsetNumericPad({ exerciseIndex, setIndex, field, value: currentValue as number, label });
  };

  const handleDropsetNumericPadConfirm = (value: number) => {
    if (dropsetNumericPad) {
      updateSet(dropsetNumericPad.exerciseIndex, dropsetNumericPad.setIndex, dropsetNumericPad.field, value);
      setDropsetNumericPad(null);
    }
  };

  const openSupersetDropsetNumericPad = (exerciseIndex: number, setIndex: number, field: 'superset_dropset_weight' | 'superset_dropset_reps', label: string) => {
    if (!selectedDay) return;
    const currentValue = selectedDay.exercises[exerciseIndex].sets[setIndex][field] || 0;
    setSupersetDropsetNumericPad({ exerciseIndex, setIndex, field, value: currentValue as number, label });
  };

  const handleSupersetDropsetNumericPadConfirm = (value: number) => {
    if (supersetDropsetNumericPad) {
      updateSet(supersetDropsetNumericPad.exerciseIndex, supersetDropsetNumericPad.setIndex, supersetDropsetNumericPad.field, value);
      setSupersetDropsetNumericPad(null);
    }
  };

  const toggleMinimizeDay = (dayId: string) => {
    const newMinimized = new Set(minimizedDays);
    if (newMinimized.has(dayId)) {
      newMinimized.delete(dayId);
    } else {
      newMinimized.add(dayId);
    }
    setMinimizedDays(newMinimized);
  };

  const completeExercise = (exerciseIndex: number) => {
    setSelectedExerciseIndex(exerciseIndex === selectedExerciseIndex ? null : exerciseIndex);
  };

  const completeDay = (dayId: string) => {
    toggleMinimizeDay(dayId);
    setSelectedDay(null);
  };

  const formatRestTime = (seconds: number) => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}:${String(remainingSeconds).padStart(2, '0')}` : `${minutes}`;
    }
    return seconds.toString();
  };

  const loadTemplates = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('workout_plan_templates')
      .select('*')
      .eq('trainer_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setTemplates(data);
    }
  };

  const handleLoadTemplate = (template: WorkoutPlanTemplate) => {
    if (template.days && template.days.length > 0) {
      const loadedDays: WorkoutDay[] = template.days.map((day: any, index: number) => ({
        tempId: Date.now().toString() + Math.random() + index,
        day_number: day.day_number,
        day_name: day.day_name || '',
        focus: day.focus || '',
        notes: day.notes || '',
        exercises: day.exercises || [],
      }));

      setDays(loadedDays);
      setPlanName(template.name);
      setPlanDescription(template.description || '');
      setDaysPerWeek(template.days.length);
      toast.success('תבנית נטענה בהצלחה!');
    }
    setShowLoadTemplateModal(false);
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('נא להזין שם לתבנית');
      return;
    }

    if (days.length === 0) {
      toast.error('אין תוכן לשמור כתבנית');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('workout_plan_templates')
      .insert({
        trainer_id: user.id,
        name: templateName,
        description: planDescription || null,
        days: days.map(day => ({
          day_number: day.day_number,
          day_name: day.day_name,
          focus: day.focus,
          notes: day.notes,
          exercises: day.exercises.map(ex => ({
            tempId: ex.tempId,
            exercise: ex.exercise,
            sets: ex.sets,
            rest_seconds: ex.rest_seconds,
            notes: ex.notes,
          })),
        })),
      });

    if (error) {
      toast.error('שגיאה בשמירת התבנית');
    } else {
      toast.success('תבנית נשמרה בהצלחה!');
      setShowSaveTemplateModal(false);
      setTemplateName('');
      await loadTemplates();
    }
  };

  const handleSave = async () => {
    if (!planName.trim()) {
      toast.error('נא להזין שם לתוכנית');
      return;
    }

    if (days.length === 0) {
      toast.error('נא להוסיף לפחות יום אימון אחד');
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: plan, error: planError } = await supabase
        .from('trainee_workout_plans')
        .insert({
          trainer_id: user.id,
          trainee_id: traineeId,
          name: planName,
          description: planDescription || null,
          days_per_week: daysPerWeek,
          is_active: true,
        })
        .select()
        .single();

      if (planError || !plan) {
        toast.error('שגיאה ביצירת תוכנית');
        return;
      }

      for (const day of days) {
        const { data: dayData, error: dayError } = await supabase
          .from('workout_plan_days')
          .insert({
            plan_id: plan.id,
            day_number: day.day_number,
            day_name: day.day_name || null,
            focus: day.focus || null,
            notes: day.notes || null,
            order_index: day.day_number - 1,
          })
          .select()
          .single();

        if (dayError || !dayData) {
          toast.error('שגיאה בהוספת יום');
          continue;
        }

        for (let i = 0; i < day.exercises.length; i++) {
          const exercise = day.exercises[i];
          const firstSet = exercise.sets[0];

          await supabase
            .from('workout_plan_day_exercises')
            .insert({
              day_id: dayData.id,
              exercise_id: exercise.exercise.id,
              sets_count: exercise.sets.length,
              reps_range: firstSet ? `${firstSet.reps}` : '10-12',
              rest_seconds: exercise.rest_seconds,
              notes: exercise.notes || null,
              order_index: i,
              target_weight: firstSet?.weight || null,
              target_rpe: firstSet?.rpe >= 1 && firstSet?.rpe <= 10 ? firstSet.rpe : null,
              equipment_id: firstSet?.equipment_id || null,
              set_type: firstSet?.set_type || 'regular',
              failure: firstSet?.failure || false,
              superset_exercise_id: firstSet?.superset_exercise_id || null,
              superset_weight: firstSet?.superset_weight || null,
              superset_reps: firstSet?.superset_reps || null,
              superset_rpe: firstSet?.superset_rpe >= 1 && firstSet?.superset_rpe <= 10 ? firstSet.superset_rpe : null,
              superset_equipment_id: firstSet?.superset_equipment_id || null,
              superset_dropset_weight: firstSet?.superset_dropset_weight || null,
              superset_dropset_reps: firstSet?.superset_dropset_reps || null,
              dropset_weight: firstSet?.dropset_weight || null,
              dropset_reps: firstSet?.dropset_reps || null,
            });
        }
      }

      toast.success('תוכנית נשמרה בהצלחה!');
      onBack();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('שגיאה בשמירת התוכנית');
    } finally {
      setSaving(false);
    }
  };

  if (selectedDay) {
    const colorIndex = (selectedDay.day_number - 1) % dayColors.length;
    const color = dayColors[colorIndex];

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 lg:p-6">
        {/* Day Edit Header */}
        <div className="bg-white rounded-2xl shadow-xl p-4 lg:p-6 mb-4 lg:mb-6 sticky top-0 z-10 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <button
                onClick={() => setSelectedDay(null)}
                className="p-3 lg:p-4 hover:bg-gray-100 rounded-xl transition-all duration-300"
              >
                <ArrowRight className="h-6 w-6 lg:h-7 lg:w-7 text-gray-600" />
              </button>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br ${color.bg} rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105`}>
                  <span className="text-2xl lg:text-3xl font-bold text-white">{selectedDay.day_number}</span>
                </div>
                <div>
                  <h1 className="text-xl lg:text-3xl font-bold text-gray-900">יום {selectedDay.day_number}</h1>
                  <p className="text-base lg:text-lg text-gray-600">{selectedDay.day_name || 'הגדר שם ליום'}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => completeDay(selectedDay.tempId)}
              className="bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              סיים יום
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">שם היום</label>
              <input
                type="text"
                value={selectedDay.day_name}
                onChange={(e) => updateDay(selectedDay.tempId, 'day_name', e.target.value)}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-lg"
                placeholder="לדוגמה: חזה + טריצפס"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">פוקוס (קבוצות שריר)</label>
              <input
                type="text"
                value={selectedDay.focus}
                onChange={(e) => updateDay(selectedDay.tempId, 'focus', e.target.value)}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-lg"
                placeholder="חזה, כתפיים קדמיות, טריצפס"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">הערות ליום</label>
              <textarea
                value={selectedDay.notes}
                onChange={(e) => updateDay(selectedDay.tempId, 'notes', e.target.value)}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-lg"
                rows={2}
                placeholder="הערות כלליות ליום האימון..."
              />
            </div>
          </div>
        </div>

        {/* Exercise List */}
        <div className="space-y-4">
          {selectedDay.exercises.map((exercise, exerciseIndex) => {
            const isMinimized = selectedExerciseIndex !== exerciseIndex;

            return (
              <div
                key={exercise.tempId}
                className={`bg-white rounded-2xl shadow-xl transition-all duration-300 hover:shadow-2xl ${
                  !isMinimized ? '' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-r-4 border-emerald-500'
                }`}
                style={{
                  height: isMinimized ? '72px' : 'auto',
                  overflow: isMinimized ? 'hidden' : 'visible',
                }}
              >
                {isMinimized ? (
                  <div
                    className="h-full flex items-center justify-between px-4 lg:px-6 cursor-pointer hover:bg-emerald-100/50 transition-all duration-300"
                    onClick={() => completeExercise(exerciseIndex)}
                  >
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                        <span className="text-lg text-white font-bold">{exerciseIndex + 1}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{exercise.exercise.name}</h3>
                        <p className="text-sm text-gray-600">{exercise.sets.length} סטים</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInstructionsExercise({
                            name: exercise.exercise.name,
                            instructions: exercise.exercise.instructions,
                          });
                        }}
                        className="p-2 hover:bg-cyan-50 text-cyan-600 rounded-xl transition-all duration-300"
                        aria-label="איך לבצע"
                        title="איך לבצע"
                      >
                        <Info className="h-5 w-5" />
                      </button>
                      <span className="text-sm text-emerald-600 font-semibold">לחץ לעריכה</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeExerciseFromDay(exerciseIndex);
                        }}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition-all duration-300"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 lg:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                          <span className="text-xl text-white font-bold">{exerciseIndex + 1}</span>
                        </div>
                        <div>
                          <h3 className="text-lg lg:text-2xl font-bold text-gray-900">{exercise.exercise.name}</h3>
                          {exercise.exercise.muscle_group?.name && (
                            <p className="text-sm text-gray-500">{exercise.exercise.muscle_group.name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <button
                          onClick={() => setInstructionsExercise({
                            name: exercise.exercise.name,
                            instructions: exercise.exercise.instructions,
                          })}
                          className="p-3 hover:bg-cyan-50 text-cyan-600 rounded-xl transition-all duration-300"
                          aria-label="איך לבצע"
                          title="איך לבצע"
                        >
                          <Info className="h-5 w-5 lg:h-6 lg:w-6" />
                        </button>
                        <button
                          onClick={() => completeExercise(exerciseIndex)}
                          className="px-4 py-2 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl transition-all duration-300 text-sm font-bold shadow-lg hover:shadow-xl hover:scale-105"
                        >
                          סיים תרגיל
                        </button>
                        <button
                          onClick={() => removeExerciseFromDay(exerciseIndex)}
                          className="p-3 hover:bg-red-50 text-red-600 rounded-xl transition-all duration-300"
                        >
                          <Trash2 className="h-5 w-5 lg:h-6 lg:w-6" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {exercise.sets.map((set, setIndex) => (
                        <div
                          key={set.id}
                          className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 border-2 border-gray-200 transition-all duration-300 hover:shadow-md"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-base lg:text-lg text-gray-700 bg-white px-3 py-1 rounded-lg shadow-sm">סט {set.set_number}</span>
                            <div className="flex space-x-2 rtl:space-x-reverse">
                              <button
                                onClick={() => duplicateSet(exerciseIndex, setIndex)}
                                className="p-2 lg:p-3 hover:bg-white rounded-xl transition-all duration-300 shadow-sm hover:shadow-md"
                                title="שכפל סט"
                              >
                                <Copy className="h-4 w-4 lg:h-5 lg:w-5 text-gray-600" />
                              </button>
                              {exercise.sets.length > 1 && (
                                <button
                                  onClick={() => removeSet(exerciseIndex, setIndex)}
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
                                onClick={() => openNumericPad(exerciseIndex, setIndex, 'weight', 'משקל (ק״ג)')}
                                className="w-full px-3 py-3 lg:py-5 text-xl lg:text-3xl font-bold border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700 rounded-xl hover:from-emerald-100 hover:to-teal-100 transition-all duration-300 shadow-md hover:shadow-lg"
                              >
                                {set.weight || '0'}
                              </button>
                            </div>

                            <div>
                              <label className="block text-sm lg:text-base font-semibold text-gray-700 mb-2">חזרות</label>
                              <button
                                onClick={() => openNumericPad(exerciseIndex, setIndex, 'reps', 'חזרות')}
                                className="w-full px-3 py-3 lg:py-5 text-xl lg:text-3xl font-bold border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-sky-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-sky-100 transition-all duration-300 shadow-md hover:shadow-lg"
                              >
                                {set.reps || '0'}
                              </button>
                            </div>

                            <div>
                              <label className="block text-sm lg:text-base font-semibold text-gray-700 mb-2">RPE</label>
                              <button
                                onClick={() => openNumericPad(exerciseIndex, setIndex, 'rpe', 'RPE (1-10)')}
                                className="w-full px-3 py-3 lg:py-5 text-xl lg:text-3xl font-bold border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700 rounded-xl hover:from-amber-100 hover:to-orange-100 transition-all duration-300 shadow-md hover:shadow-lg"
                              >
                                {set.rpe || '-'}
                              </button>
                            </div>
                          </div>

                          <div className="mb-3 grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setEquipmentSelector({ exerciseIndex, setIndex })}
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
                                      updateSet(exerciseIndex, setIndex, 'equipment_id', null);
                                      updateSet(exerciseIndex, setIndex, 'equipment', null);
                                    }}
                                    className="p-1 hover:bg-red-100 rounded-lg text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </button>

                            <button
                              onClick={() => updateSet(exerciseIndex, setIndex, 'failure', !set.failure)}
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
                              onClick={() => updateSet(exerciseIndex, setIndex, 'set_type', 'regular')}
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
                                  updateSet(exerciseIndex, setIndex, 'set_type', 'superset');
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
                              onClick={() => updateSet(exerciseIndex, setIndex, 'set_type', 'dropset')}
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
                                        updateSet(exerciseIndex, setIndex, 'superset_exercise_id', null);
                                        updateSet(exerciseIndex, setIndex, 'superset_exercise_name', null);
                                        updateSet(exerciseIndex, setIndex, 'superset_weight', null);
                                        updateSet(exerciseIndex, setIndex, 'superset_reps', null);
                                      }}
                                      className="p-1 hover:bg-red-100 rounded-lg text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setSupersetSelector({ exerciseIndex, setIndex })}
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
                                        onClick={() => openSupersetNumericPad(exerciseIndex, setIndex, 'superset_weight', 'משקל סופר-סט (ק״ג)')}
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
                                        onClick={() => openSupersetNumericPad(exerciseIndex, setIndex, 'superset_reps', 'חזרות סופר-סט')}
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
                                        onClick={() => openSupersetNumericPad(exerciseIndex, setIndex, 'superset_rpe', 'RPE סופר-סט (1-10)')}
                                        className="w-full px-3 py-3 text-xl font-bold border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-sky-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-sky-100 transition-all duration-300 shadow-md hover:shadow-lg"
                                      >
                                        {set.superset_rpe || '-'}
                                      </button>
                                    </div>
                                  </div>

                                  <div>
                                    <button
                                      onClick={() => setSupersetEquipmentSelector({ exerciseIndex, setIndex })}
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
                                              updateSet(exerciseIndex, setIndex, 'superset_equipment_id', null);
                                              updateSet(exerciseIndex, setIndex, 'superset_equipment', null);
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
                                              onClick={() => openSupersetDropsetNumericPad(exerciseIndex, setIndex, 'superset_dropset_weight', 'משקל דרופ-סט סופר (ק״ג)')}
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
                                              onClick={() => openSupersetDropsetNumericPad(exerciseIndex, setIndex, 'superset_dropset_reps', 'חזרות דרופ-סט סופר')}
                                              className="w-full px-2 py-2 text-lg font-bold border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700 rounded-xl hover:from-amber-100 hover:to-orange-100 transition-all duration-300 shadow-md"
                                            >
                                              {set.superset_dropset_reps || '0'}
                                            </button>
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => {
                                            updateSet(exerciseIndex, setIndex, 'superset_dropset_weight', null);
                                            updateSet(exerciseIndex, setIndex, 'superset_dropset_reps', null);
                                          }}
                                          className="text-xs text-red-600 hover:text-red-700 font-semibold"
                                        >
                                          הסר דרופ-סט
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          updateSet(exerciseIndex, setIndex, 'superset_dropset_weight', 0);
                                          updateSet(exerciseIndex, setIndex, 'superset_dropset_reps', 0);
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
                                  onClick={() => openDropsetNumericPad(exerciseIndex, setIndex, 'dropset_weight', 'משקל דרופ-סט (ק״ג)')}
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
                                  onClick={() => openDropsetNumericPad(exerciseIndex, setIndex, 'dropset_reps', 'חזרות דרופ-סט')}
                                  className="w-full px-3 py-3 text-xl font-bold border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700 rounded-xl hover:from-amber-100 hover:to-orange-100 transition-all duration-300 shadow-md hover:shadow-lg"
                                >
                                  {set.dropset_reps || '0'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => addSet(exerciseIndex)}
                      className="w-full mt-4 py-4 lg:py-5 border-2 border-dashed border-gray-300 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 font-bold text-base lg:text-lg transition-all duration-300"
                    >
                      + הוסף סט
                    </button>

                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">הערות לתרגיל</label>
                      <textarea
                        value={exercise.notes}
                        onChange={(e) => updateExercise(exerciseIndex, 'notes', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"
                        rows={2}
                        placeholder="הערות לביצוע התרגיל..."
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setShowExerciseSelector(true)}
          className="w-full mt-4 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-5 lg:py-6 rounded-2xl flex items-center justify-center space-x-3 rtl:space-x-reverse transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02]"
        >
          <Plus className="h-6 w-6 lg:h-7 lg:w-7" />
          <span className="font-bold text-lg lg:text-xl">הוסף תרגיל</span>
        </button>

        {showExerciseSelector && (
          <ExerciseSelector
            onSelect={addExerciseToDay}
            onClose={() => setShowExerciseSelector(false)}
          />
        )}

        {instructionsExercise && (
          <ExerciseInstructionsModal
            isOpen={!!instructionsExercise}
            onClose={() => setInstructionsExercise(null)}
            exerciseName={instructionsExercise.name}
            instructions={instructionsExercise.instructions}
          />
        )}

        {numericPad && (
          <QuickNumericPad
            value={numericPad.value}
            label={numericPad.label}
            onConfirm={handleNumericPadConfirm}
            onClose={() => setNumericPad(null)}
            allowDecimal={numericPad.field === 'weight'}
          />
        )}

        {equipmentSelector && (
          <EquipmentSelector
            currentEquipmentId={
              selectedDay.exercises[equipmentSelector.exerciseIndex]?.sets[equipmentSelector.setIndex]?.equipment_id || null
            }
            onSelect={handleEquipmentSelect}
            onClose={() => setEquipmentSelector(null)}
          />
        )}

        {supersetSelector && (
          <ExerciseSelector
            onSelect={handleSupersetExerciseSelect}
            onClose={() => setSupersetSelector(null)}
          />
        )}

        {supersetNumericPad && (
          <QuickNumericPad
            value={supersetNumericPad.value}
            label={supersetNumericPad.label}
            onConfirm={handleSupersetNumericPadConfirm}
            onClose={() => setSupersetNumericPad(null)}
            allowDecimal={supersetNumericPad.field === 'superset_weight'}
          />
        )}

        {supersetEquipmentSelector && (
          <EquipmentSelector
            currentEquipmentId={
              selectedDay.exercises[supersetEquipmentSelector.exerciseIndex]?.sets[supersetEquipmentSelector.setIndex]?.superset_equipment_id || null
            }
            onSelect={handleSupersetEquipmentSelect}
            onClose={() => setSupersetEquipmentSelector(null)}
          />
        )}

        {dropsetNumericPad && (
          <QuickNumericPad
            value={dropsetNumericPad.value}
            label={dropsetNumericPad.label}
            onConfirm={handleDropsetNumericPadConfirm}
            onClose={() => setDropsetNumericPad(null)}
            allowDecimal={dropsetNumericPad.field === 'dropset_weight'}
          />
        )}

        {supersetDropsetNumericPad && (
          <QuickNumericPad
            value={supersetDropsetNumericPad.value}
            label={supersetDropsetNumericPad.label}
            onConfirm={handleSupersetDropsetNumericPadConfirm}
            onClose={() => setSupersetDropsetNumericPad(null)}
            allowDecimal={supersetDropsetNumericPad.field === 'superset_dropset_weight'}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 lg:p-6">
      {/* Main Header */}
      <div className="bg-white rounded-2xl shadow-xl p-4 lg:p-6 mb-4 lg:mb-6 sticky top-0 z-10 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <button
              onClick={onBack}
              className="p-3 lg:p-4 hover:bg-gray-100 rounded-xl transition-all duration-300"
            >
              <ArrowRight className="h-6 w-6 lg:h-7 lg:w-7 text-gray-600" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105">
                <Dumbbell className="w-7 h-7 lg:w-8 lg:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl lg:text-3xl font-bold text-gray-900">תוכנית אימון חדשה</h1>
                <p className="text-base lg:text-lg text-gray-600">{traineeName}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || days.length === 0 || !planName.trim()}
            className="bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 lg:px-8 py-3 lg:py-4 rounded-xl flex items-center space-x-2 rtl:space-x-reverse transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl hover:scale-105"
          >
            <Save className="h-5 w-5 lg:h-6 lg:w-6" />
            <span className="font-bold text-base lg:text-lg">{saving ? 'שומר...' : 'שמור תוכנית'}</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">שם התוכנית</label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-lg"
              placeholder="לדוגמה: תוכנית כוח - שלב 1"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">תיאור</label>
            <textarea
              value={planDescription}
              onChange={(e) => setPlanDescription(e.target.value)}
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-lg"
              rows={2}
              placeholder="מטרות, הערות כלליות..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">ימי אימון בשבוע</label>
            <select
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(parseInt(e.target.value))}
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-lg"
            >
              {[1, 2, 3, 4, 5, 6, 7].map(n => (
                <option key={n} value={n}>{n} ימים</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                loadTemplates();
                setShowLoadTemplateModal(true);
              }}
              className="flex-1 py-4 px-4 bg-gradient-to-br from-blue-50 to-sky-50 hover:from-blue-100 hover:to-sky-100 text-blue-700 font-bold rounded-xl transition-all duration-300 border-2 border-blue-200 shadow-md hover:shadow-lg"
            >
              טען תבנית
            </button>
            {days.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(true)}
                className="flex-1 py-4 px-4 bg-gradient-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-700 font-bold rounded-xl transition-all duration-300 border-2 border-emerald-200 shadow-md hover:shadow-lg"
              >
                שמור כתבנית
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Load Template Modal */}
      {showLoadTemplateModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col transition-all duration-300">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-blue-50 to-sky-50">
              <h3 className="text-2xl font-bold text-gray-900">בחר תבנית</h3>
              <p className="text-gray-600 mt-1">טען תוכנית אימון מוכנה מראש</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {templates.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Dumbbell className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg font-medium">אין תבניות שמורות</p>
                  <p className="text-sm text-gray-400 mt-2">צור תוכנית ושמור אותה כתבנית</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleLoadTemplate(template)}
                      className="w-full text-right p-5 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-sky-50 border-2 border-gray-200 hover:border-blue-400 rounded-2xl transition-all duration-300 shadow-md hover:shadow-lg"
                    >
                      <h4 className="font-bold text-gray-900 text-lg">{template.name}</h4>
                      {template.description && (
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2 font-medium">
                        {template.days?.length || 0} ימי אימון
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowLoadTemplateModal(false)}
                className="w-full py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-all duration-300"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transition-all duration-300">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">שמור כתבנית</h3>
            <p className="text-gray-600 mb-6">תוכל לטעון תבנית זו בעתיד</p>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">שם התבנית</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-lg"
                placeholder="לדוגמה: תוכנית כוח בסיסית"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveAsTemplate}
                className="flex-1 py-4 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                שמור
              </button>
              <button
                onClick={() => {
                  setShowSaveTemplateModal(false);
                  setTemplateName('');
                }}
                className="flex-1 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-all duration-300"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day Cards */}
      <div className="space-y-4">
        {days.map((day) => {
          const colorIndex = (day.day_number - 1) % dayColors.length;
          const color = dayColors[colorIndex];
          const isMinimized = minimizedDays.has(day.tempId);

          return (
            <div
              key={day.tempId}
              className={`bg-white rounded-2xl shadow-xl transition-all duration-300 hover:shadow-2xl ${
                isMinimized ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-r-4 border-emerald-500' : ''
              }`}
              style={{
                height: isMinimized ? '88px' : 'auto',
                overflow: isMinimized ? 'hidden' : 'visible',
              }}
            >
              {isMinimized ? (
                <div
                  className="h-full flex items-center justify-between px-4 lg:px-6 cursor-pointer hover:bg-emerald-100/50 transition-all duration-300"
                  onClick={() => {
                    setSelectedDay(day);
                    toggleMinimizeDay(day.tempId);
                  }}
                >
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                      <span className="text-xl text-white font-bold">{day.day_number}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        יום {day.day_number} {day.day_name ? `- ${day.day_name}` : ''}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {day.exercises.length} תרגילים {day.focus ? `| ${day.focus}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="text-sm text-emerald-600 font-semibold">לחץ לעריכה</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeDay(day.tempId);
                      }}
                      className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition-all duration-300"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 lg:p-6">
                  <div className={`bg-gradient-to-br ${color.bg} rounded-2xl p-5 text-white mb-4 shadow-lg transition-all duration-300`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm opacity-80 font-medium">יום {day.day_number}</p>
                        <h2 className="text-xl font-bold">
                          {day.day_name || `יום אימון ${day.day_number}`}
                        </h2>
                        {day.focus && (
                          <p className="flex items-center gap-2 mt-2 text-sm opacity-90">
                            <Target className="w-4 h-4" />
                            {day.focus}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => duplicateDay(day)}
                          className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-300"
                          title="שכפל יום"
                        >
                          <Copy className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => removeDay(day.tempId)}
                          className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-300"
                          title="מחק יום"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/20">
                      <span className="font-medium">{day.exercises.length} תרגילים</span>
                    </div>
                  </div>

                  {day.exercises.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {day.exercises.map((exercise, index) => (
                        <div key={exercise.tempId} className={`${color.light} ${color.border} border-2 rounded-xl p-4 transition-all duration-300 hover:shadow-md`}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1 flex items-center gap-3">
                              <div className={`w-8 h-8 bg-gradient-to-br ${color.bg} rounded-lg flex items-center justify-center shadow-md`}>
                                <span className="text-sm text-white font-bold">{index + 1}</span>
                              </div>
                              <div>
                                <h4 className={`font-bold ${color.text}`}>{exercise.exercise.name}</h4>
                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <Repeat className="w-3 h-3" />
                                    {exercise.sets.length} סטים
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedDay(day)}
                      className={`flex-1 py-4 px-4 rounded-xl ${color.light} ${color.text} font-bold hover:opacity-80 transition-all duration-300 border-2 ${color.border} shadow-md hover:shadow-lg`}
                    >
                      {day.exercises.length === 0 ? 'הוסף תרגילים' : 'ערוך יום'}
                    </button>
                    {day.exercises.length > 0 && (
                      <button
                        onClick={() => completeDay(day.tempId)}
                        className="px-5 py-4 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl"
                      >
                        סיים יום
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={addDay}
        className="w-full mt-4 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-5 lg:py-6 rounded-2xl flex items-center justify-center space-x-3 rtl:space-x-reverse transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02]"
      >
        <Plus className="h-6 w-6 lg:h-7 lg:w-7" />
        <span className="font-bold text-lg lg:text-xl">{days.length === 0 ? 'הוסף יום אימון ראשון' : 'הוסף יום אימון נוסף'}</span>
      </button>
    </div>
  );
}
