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
} from 'lucide-react';
import ExerciseSelector from '../Workouts/ExerciseSelector';
import QuickNumericPad from '../Workouts/QuickNumericPad';
import EquipmentSelector from '../Equipment/EquipmentSelector';

interface Exercise {
  id: string;
  name: string;
  muscle_group_id: string;
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
  { bg: 'from-green-500 to-emerald-600', light: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  { bg: 'from-amber-500 to-orange-600', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  { bg: 'from-rose-500 to-pink-600', light: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  { bg: 'from-cyan-500 to-teal-600', light: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  { bg: 'from-violet-500 to-purple-600', light: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
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
      rpe: lastSet?.rpe || null,
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
              target_rpe: firstSet?.rpe || null,
              equipment_id: firstSet?.equipment_id || null,
              set_type: firstSet?.set_type || 'regular',
              failure: firstSet?.failure || false,
              superset_exercise_id: firstSet?.superset_exercise_id || null,
              superset_weight: firstSet?.superset_weight || null,
              superset_reps: firstSet?.superset_reps || null,
              superset_rpe: firstSet?.superset_rpe || null,
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
      <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
        <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 mb-4 lg:mb-6 sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <button
                onClick={() => setSelectedDay(null)}
                className="p-3 lg:p-4 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ArrowRight className="h-6 w-6 lg:h-7 lg:w-7" />
              </button>
              <div>
                <h1 className="text-xl lg:text-3xl font-bold text-gray-900">יום {selectedDay.day_number}</h1>
                <p className="text-base lg:text-lg text-gray-600">{selectedDay.day_name || 'הגדר שם ליום'}</p>
              </div>
            </div>
            <button
              onClick={() => completeDay(selectedDay.tempId)}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              סיים יום
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם היום</label>
              <input
                type="text"
                value={selectedDay.day_name}
                onChange={(e) => updateDay(selectedDay.tempId, 'day_name', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="לדוגמה: חזה + טריצפס"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">פוקוס (קבוצות שריר)</label>
              <input
                type="text"
                value={selectedDay.focus}
                onChange={(e) => updateDay(selectedDay.tempId, 'focus', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="חזה, כתפיים קדמיות, טריצפס"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">הערות ליום</label>
              <textarea
                value={selectedDay.notes}
                onChange={(e) => updateDay(selectedDay.tempId, 'notes', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                rows={2}
                placeholder="הערות כלליות ליום האימון..."
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {selectedDay.exercises.map((exercise, exerciseIndex) => {
            const isMinimized = selectedExerciseIndex !== exerciseIndex;

            return (
              <div
                key={exercise.tempId}
                className={`bg-white rounded-xl shadow-sm transition-all ${
                  !isMinimized ? '' : 'bg-green-50 border-r-4 border-green-500'
                }`}
                style={{
                  height: isMinimized ? '64px' : 'auto',
                  overflow: isMinimized ? 'hidden' : 'visible',
                }}
              >
                {isMinimized ? (
                  <div
                    className="h-full flex items-center justify-between px-4 lg:px-6 cursor-pointer hover:bg-green-100 transition-colors"
                    onClick={() => completeExercise(exerciseIndex)}
                  >
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <span className="text-2xl">✓</span>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{exercise.exercise.name}</h3>
                        <p className="text-sm text-gray-600">{exercise.sets.length} סטים</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="text-sm text-green-600 font-semibold">לחץ לעריכה</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeExerciseFromDay(exerciseIndex);
                        }}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 lg:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg lg:text-2xl font-bold text-gray-900">{exercise.exercise.name}</h3>
                        {exercise.exercise.muscle_group?.name && (
                          <p className="text-sm text-gray-500">{exercise.exercise.muscle_group.name}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <button
                          onClick={() => completeExercise(exerciseIndex)}
                          className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-semibold"
                        >
                          סיים תרגיל
                        </button>
                        <button
                          onClick={() => removeExerciseFromDay(exerciseIndex)}
                          className="p-2 lg:p-3 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-5 w-5 lg:h-6 lg:w-6" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {exercise.sets.map((set, setIndex) => (
                        <div
                          key={set.id}
                          className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-semibold text-base lg:text-lg text-gray-700">סט {set.set_number}</span>
                            <div className="flex space-x-2 rtl:space-x-reverse">
                              <button
                                onClick={() => duplicateSet(exerciseIndex, setIndex)}
                                className="p-2 lg:p-3 hover:bg-white rounded-lg transition-colors"
                                title="שכפל סט"
                              >
                                <Copy className="h-4 w-4 lg:h-5 lg:w-5 text-gray-600" />
                              </button>
                              {exercise.sets.length > 1 && (
                                <button
                                  onClick={() => removeSet(exerciseIndex, setIndex)}
                                  className="p-2 lg:p-3 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
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
                                onClick={() => openNumericPad(exerciseIndex, setIndex, 'weight', 'משקל (ק״ג)')}
                                className="w-full px-3 py-3 lg:py-5 text-xl lg:text-3xl font-bold border-2 border-green-500 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-all"
                              >
                                {set.weight || '0'}
                              </button>
                            </div>

                            <div>
                              <label className="block text-sm lg:text-base font-medium text-gray-700 mb-1">חזרות</label>
                              <button
                                onClick={() => openNumericPad(exerciseIndex, setIndex, 'reps', 'חזרות')}
                                className="w-full px-3 py-3 lg:py-5 text-xl lg:text-3xl font-bold border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all"
                              >
                                {set.reps || '0'}
                              </button>
                            </div>

                            <div>
                              <label className="block text-sm lg:text-base font-medium text-gray-700 mb-1">RPE</label>
                              <button
                                onClick={() => openNumericPad(exerciseIndex, setIndex, 'rpe', 'RPE (1-10)')}
                                className="w-full px-3 py-3 lg:py-5 text-xl lg:text-3xl font-bold border-2 border-purple-500 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all"
                              >
                                {set.rpe || '-'}
                              </button>
                            </div>
                          </div>

                          <div className="mb-3 grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setEquipmentSelector({ exerciseIndex, setIndex })}
                              className={`py-3 lg:py-4 px-3 rounded-xl border-2 transition-all text-right ${
                                set.equipment
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-300 hover:border-blue-300 bg-white'
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
                              className={`py-3 lg:py-4 px-3 rounded-xl border-2 transition-all ${
                                set.failure
                                  ? 'border-red-500 bg-red-50 text-red-700'
                                  : 'border-gray-300 hover:border-red-300 bg-white text-gray-700'
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
                          </div>

                          <div className="flex space-x-2 rtl:space-x-reverse">
                            <button
                              onClick={() => updateSet(exerciseIndex, setIndex, 'set_type', 'regular')}
                              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                set.set_type === 'regular'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
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
                              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                set.set_type === 'superset'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              סופר-סט
                            </button>
                            <button
                              onClick={() => updateSet(exerciseIndex, setIndex, 'set_type', 'dropset')}
                              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                set.set_type === 'dropset'
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              דרופ-סט
                            </button>
                          </div>

                          {set.set_type === 'superset' && (
                            <div className="mt-3 pt-3 border-t border-gray-300">
                              <div className="mb-3">
                                <label className="block text-sm font-medium text-blue-700 mb-2">
                                  תרגיל סופר-סט
                                </label>
                                {set.superset_exercise_id ? (
                                  <div className="flex items-center justify-between bg-blue-50 border-2 border-blue-500 rounded-lg p-3">
                                    <span className="font-medium text-blue-900">{set.superset_exercise_name}</span>
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
                                    className="w-full py-3 px-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-blue-600 font-medium transition-all"
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
                                        onClick={() => openSupersetNumericPad(exerciseIndex, setIndex, 'superset_weight', 'משקל סופר-סט (ק״ג)')}
                                        className="w-full px-3 py-3 text-xl font-bold border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all"
                                      >
                                        {set.superset_weight || '0'}
                                      </button>
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-blue-700 mb-1">
                                        חזרות
                                      </label>
                                      <button
                                        onClick={() => openSupersetNumericPad(exerciseIndex, setIndex, 'superset_reps', 'חזרות סופר-סט')}
                                        className="w-full px-3 py-3 text-xl font-bold border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all"
                                      >
                                        {set.superset_reps || '0'}
                                      </button>
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-blue-700 mb-1">
                                        RPE
                                      </label>
                                      <button
                                        onClick={() => openSupersetNumericPad(exerciseIndex, setIndex, 'superset_rpe', 'RPE סופר-סט (1-10)')}
                                        className="w-full px-3 py-3 text-xl font-bold border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all"
                                      >
                                        {set.superset_rpe || '-'}
                                      </button>
                                    </div>
                                  </div>

                                  <div>
                                    <button
                                      onClick={() => setSupersetEquipmentSelector({ exerciseIndex, setIndex })}
                                      className={`w-full py-3 px-4 rounded-xl border-2 transition-all text-right ${
                                        set.superset_equipment
                                          ? 'border-blue-500 bg-blue-50'
                                          : 'border-blue-300 hover:border-blue-500 bg-white'
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
                                    <label className="block text-sm font-medium text-blue-700 mb-2">
                                      דרופ-סט לסופר-סט (אופציונלי)
                                    </label>
                                    {(set.superset_dropset_weight !== null && set.superset_dropset_weight !== undefined) || (set.superset_dropset_reps !== null && set.superset_dropset_reps !== undefined) ? (
                                      <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-3">
                                        <div className="grid grid-cols-2 gap-3 mb-2">
                                          <div>
                                            <label className="block text-xs font-medium text-orange-700 mb-1">
                                              משקל דרופ (ק״ג)
                                            </label>
                                            <button
                                              onClick={() => openSupersetDropsetNumericPad(exerciseIndex, setIndex, 'superset_dropset_weight', 'משקל דרופ-סט סופר (ק״ג)')}
                                              className="w-full px-2 py-2 text-lg font-bold border-2 border-orange-500 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-all"
                                            >
                                              {set.superset_dropset_weight || '0'}
                                            </button>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-orange-700 mb-1">
                                              חזרות דרופ
                                            </label>
                                            <button
                                              onClick={() => openSupersetDropsetNumericPad(exerciseIndex, setIndex, 'superset_dropset_reps', 'חזרות דרופ-סט סופר')}
                                              className="w-full px-2 py-2 text-lg font-bold border-2 border-orange-500 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-all"
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
                                          className="text-xs text-red-600 hover:text-red-700"
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
                                        className="w-full py-2 px-4 border-2 border-dashed border-orange-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 text-orange-600 font-medium transition-all text-sm"
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
                            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-300">
                              <div>
                                <label className="block text-sm font-medium text-orange-700 mb-1">
                                  משקל דרופ (ק״ג)
                                </label>
                                <button
                                  onClick={() => openDropsetNumericPad(exerciseIndex, setIndex, 'dropset_weight', 'משקל דרופ-סט (ק״ג)')}
                                  className="w-full px-3 py-3 text-xl font-bold border-2 border-orange-500 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-all"
                                >
                                  {set.dropset_weight || '0'}
                                </button>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-orange-700 mb-1">
                                  חזרות דרופ
                                </label>
                                <button
                                  onClick={() => openDropsetNumericPad(exerciseIndex, setIndex, 'dropset_reps', 'חזרות דרופ-סט')}
                                  className="w-full px-3 py-3 text-xl font-bold border-2 border-orange-500 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-all"
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
                      className="w-full mt-4 py-4 lg:py-5 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 text-gray-600 hover:text-green-700 font-semibold text-base lg:text-lg transition-all"
                    >
                      + הוסף סט
                    </button>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">הערות לתרגיל</label>
                      <textarea
                        value={exercise.notes}
                        onChange={(e) => updateExercise(exerciseIndex, 'notes', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
          className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white py-5 lg:py-6 rounded-xl flex items-center justify-center space-x-3 rtl:space-x-reverse transition-all shadow-lg"
        >
          <Plus className="h-6 w-6 lg:h-7 lg:w-7" />
          <span className="font-semibold text-lg lg:text-xl">הוסף תרגיל</span>
        </button>

        {showExerciseSelector && (
          <ExerciseSelector
            onSelect={addExerciseToDay}
            onClose={() => setShowExerciseSelector(false)}
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
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 mb-4 lg:mb-6 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <button
              onClick={onBack}
              className="p-3 lg:p-4 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowRight className="h-6 w-6 lg:h-7 lg:w-7" />
            </button>
            <div>
              <h1 className="text-xl lg:text-3xl font-bold text-gray-900">תוכנית אימון חדשה</h1>
              <p className="text-base lg:text-lg text-gray-600">{traineeName}</p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || days.length === 0 || !planName.trim()}
            className="bg-green-500 hover:bg-green-600 text-white px-6 lg:px-8 py-3 lg:py-4 rounded-xl flex items-center space-x-2 rtl:space-x-reverse transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <Save className="h-5 w-5 lg:h-6 lg:w-6" />
            <span className="font-semibold text-base lg:text-lg">{saving ? 'שומר...' : 'שמור תוכנית'}</span>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם התוכנית</label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="לדוגמה: תוכנית כוח - שלב 1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תיאור</label>
            <textarea
              value={planDescription}
              onChange={(e) => setPlanDescription(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              rows={2}
              placeholder="מטרות, הערות כלליות..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ימי אימון בשבוע</label>
            <select
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(parseInt(e.target.value))}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              {[1, 2, 3, 4, 5, 6, 7].map(n => (
                <option key={n} value={n}>{n} ימים</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                loadTemplates();
                setShowLoadTemplateModal(true);
              }}
              className="flex-1 py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg transition-colors border border-blue-200"
            >
              טען תבנית
            </button>
            {days.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(true)}
                className="flex-1 py-3 px-4 bg-green-50 hover:bg-green-100 text-green-700 font-semibold rounded-lg transition-colors border border-green-200"
              >
                שמור כתבנית
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Load Template Modal */}
      {showLoadTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">בחר תבנית</h3>
              <p className="text-gray-600 mt-1">טען תוכנית אימון מוכנה מראש</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {templates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">אין תבניות שמורות</p>
                  <p className="text-sm text-gray-400 mt-2">צור תוכנית ושמור אותה כתבנית</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleLoadTemplate(template)}
                      className="w-full text-right p-4 bg-gray-50 hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 rounded-lg transition-all"
                    >
                      <h4 className="font-bold text-gray-900">{template.name}</h4>
                      {template.description && (
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
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
                className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">שמור כתבנית</h3>
            <p className="text-gray-600 mb-4">תוכל לטעון תבנית זו בעתיד</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">שם התבנית</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="לדוגמה: תוכנית כוח בסיסית"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveAsTemplate}
                className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors"
              >
                שמור
              </button>
              <button
                onClick={() => {
                  setShowSaveTemplateModal(false);
                  setTemplateName('');
                }}
                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {days.map((day) => {
          const colorIndex = (day.day_number - 1) % dayColors.length;
          const color = dayColors[colorIndex];
          const isMinimized = minimizedDays.has(day.tempId);

          return (
            <div
              key={day.tempId}
              className={`bg-white rounded-xl shadow-sm transition-all ${
                isMinimized ? 'bg-green-50 border-r-4 border-green-500' : ''
              }`}
              style={{
                height: isMinimized ? '80px' : 'auto',
                overflow: isMinimized ? 'hidden' : 'visible',
              }}
            >
              {isMinimized ? (
                <div
                  className="h-full flex items-center justify-between px-4 lg:px-6 cursor-pointer hover:bg-green-100 transition-colors"
                  onClick={() => {
                    setSelectedDay(day);
                    toggleMinimizeDay(day.tempId);
                  }}
                >
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <span className="text-2xl">✓</span>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        יום {day.day_number} {day.day_name ? `- ${day.day_name}` : ''}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {day.exercises.length} תרגילים • {day.focus || 'ללא פוקוס'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="text-sm text-green-600 font-semibold">לחץ לעריכה</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeDay(day.tempId);
                      }}
                      className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 lg:p-6">
                  <div className={`bg-gradient-to-l ${color.bg} rounded-xl p-5 text-white mb-4`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm opacity-80">יום {day.day_number}</p>
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
                          className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                          title="שכפל יום"
                        >
                          <Copy className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => removeDay(day.tempId)}
                          className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                          title="מחק יום"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/20">
                      <span>{day.exercises.length} תרגילים</span>
                    </div>
                  </div>

                  {day.exercises.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {day.exercises.map((exercise, index) => (
                        <div key={exercise.tempId} className={`${color.light} ${color.border} border rounded-lg p-3`}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className={`font-bold ${color.text}`}>{exercise.exercise.name}</h4>
                              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Repeat className="w-3 h-3" />
                                  {exercise.sets.length} סטים
                                </span>
                              </div>
                            </div>
                            <span className={`text-2xl font-bold ${color.text}`}>{index + 1}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedDay(day)}
                      className={`flex-1 py-3 px-4 rounded-lg ${color.light} ${color.text} font-semibold hover:opacity-80 transition-colors`}
                    >
                      {day.exercises.length === 0 ? 'הוסף תרגילים' : 'ערוך יום'}
                    </button>
                    {day.exercises.length > 0 && (
                      <button
                        onClick={() => completeDay(day.tempId)}
                        className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors"
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
        className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white py-5 lg:py-6 rounded-xl flex items-center justify-center space-x-3 rtl:space-x-reverse transition-all shadow-lg"
      >
        <Plus className="h-6 w-6 lg:h-7 lg:w-7" />
        <span className="font-semibold text-lg lg:text-xl">{days.length === 0 ? 'הוסף יום אימון ראשון' : 'הוסף יום אימון נוסף'}</span>
      </button>
    </div>
  );
}
