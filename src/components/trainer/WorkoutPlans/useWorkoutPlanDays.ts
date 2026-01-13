import { useState, useCallback } from 'react';
import { WorkoutDay, PlanExercise, SetData, createEmptyDay, createEmptySet, createEmptyExercise, Exercise } from './types';
import toast from 'react-hot-toast';

export function useWorkoutPlanDays() {
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [minimizedDays, setMinimizedDays] = useState<Set<string>>(new Set());

  const addDay = useCallback(() => {
    const newDay = createEmptyDay(days.length + 1);
    setDays(prev => [...prev, newDay]);
    setSelectedDay(newDay);
    return newDay;
  }, [days.length]);

  const removeDay = useCallback((dayId: string) => {
    if (!confirm('האם למחוק את היום?')) return;
    setDays(prev => prev.filter(d => d.tempId !== dayId));
    setSelectedDay(prev => prev?.tempId === dayId ? null : prev);
  }, []);

  const duplicateDay = useCallback((day: WorkoutDay) => {
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
    setDays(prev => [...prev, newDay]);
    toast.success('יום שוכפל בהצלחה');
    return newDay;
  }, [days.length]);

  const updateDay = useCallback((dayId: string, field: keyof WorkoutDay, value: unknown) => {
    setDays(prev => prev.map(d => d.tempId === dayId ? { ...d, [field]: value } : d));
    setSelectedDay(prev => prev?.tempId === dayId ? { ...prev, [field]: value } : prev);
  }, []);

  const toggleMinimizeDay = useCallback((dayId: string) => {
    setMinimizedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayId)) {
        next.delete(dayId);
      } else {
        next.add(dayId);
      }
      return next;
    });
  }, []);

  const addExercise = useCallback((dayId: string, exercise: Exercise) => {
    const newExercise = createEmptyExercise(exercise);
    setDays(prev => prev.map(d => {
      if (d.tempId === dayId) {
        return { ...d, exercises: [...d.exercises, newExercise] };
      }
      return d;
    }));
    setSelectedDay(prev => {
      if (prev?.tempId === dayId) {
        return { ...prev, exercises: [...prev.exercises, newExercise] };
      }
      return prev;
    });
  }, []);

  const removeExercise = useCallback((dayId: string, exerciseIndex: number) => {
    setDays(prev => prev.map(d => {
      if (d.tempId === dayId) {
        const exercises = [...d.exercises];
        exercises.splice(exerciseIndex, 1);
        return { ...d, exercises };
      }
      return d;
    }));
    setSelectedDay(prev => {
      if (prev?.tempId === dayId) {
        const exercises = [...prev.exercises];
        exercises.splice(exerciseIndex, 1);
        return { ...prev, exercises };
      }
      return prev;
    });
  }, []);

  const updateExercise = useCallback((dayId: string, exerciseIndex: number, updates: Partial<PlanExercise>) => {
    setDays(prev => prev.map(d => {
      if (d.tempId === dayId) {
        const exercises = [...d.exercises];
        exercises[exerciseIndex] = { ...exercises[exerciseIndex], ...updates };
        return { ...d, exercises };
      }
      return d;
    }));
    setSelectedDay(prev => {
      if (prev?.tempId === dayId) {
        const exercises = [...prev.exercises];
        exercises[exerciseIndex] = { ...exercises[exerciseIndex], ...updates };
        return { ...prev, exercises };
      }
      return prev;
    });
  }, []);

  const addSet = useCallback((dayId: string, exerciseIndex: number) => {
    setDays(prev => prev.map(d => {
      if (d.tempId === dayId) {
        const exercises = [...d.exercises];
        const exercise = exercises[exerciseIndex];
        const newSet = createEmptySet(exercise.sets.length + 1);
        exercises[exerciseIndex] = {
          ...exercise,
          sets: [...exercise.sets, newSet],
        };
        return { ...d, exercises };
      }
      return d;
    }));
    setSelectedDay(prev => {
      if (prev?.tempId === dayId) {
        const exercises = [...prev.exercises];
        const exercise = exercises[exerciseIndex];
        const newSet = createEmptySet(exercise.sets.length + 1);
        exercises[exerciseIndex] = {
          ...exercise,
          sets: [...exercise.sets, newSet],
        };
        return { ...prev, exercises };
      }
      return prev;
    });
  }, []);

  const removeSet = useCallback((dayId: string, exerciseIndex: number, setIndex: number) => {
    setDays(prev => prev.map(d => {
      if (d.tempId === dayId) {
        const exercises = [...d.exercises];
        const exercise = exercises[exerciseIndex];
        const sets = exercise.sets.filter((_, i) => i !== setIndex);
        exercises[exerciseIndex] = { ...exercise, sets };
        return { ...d, exercises };
      }
      return d;
    }));
    setSelectedDay(prev => {
      if (prev?.tempId === dayId) {
        const exercises = [...prev.exercises];
        const exercise = exercises[exerciseIndex];
        const sets = exercise.sets.filter((_, i) => i !== setIndex);
        exercises[exerciseIndex] = { ...exercise, sets };
        return { ...prev, exercises };
      }
      return prev;
    });
  }, []);

  const updateSet = useCallback((dayId: string, exerciseIndex: number, setIndex: number, updates: Partial<SetData>) => {
    setDays(prev => prev.map(d => {
      if (d.tempId === dayId) {
        const exercises = [...d.exercises];
        const exercise = exercises[exerciseIndex];
        const sets = [...exercise.sets];
        sets[setIndex] = { ...sets[setIndex], ...updates };
        exercises[exerciseIndex] = { ...exercise, sets };
        return { ...d, exercises };
      }
      return d;
    }));
    setSelectedDay(prev => {
      if (prev?.tempId === dayId) {
        const exercises = [...prev.exercises];
        const exercise = exercises[exerciseIndex];
        const sets = [...exercise.sets];
        sets[setIndex] = { ...sets[setIndex], ...updates };
        exercises[exerciseIndex] = { ...exercise, sets };
        return { ...prev, exercises };
      }
      return prev;
    });
  }, []);

  const loadDays = useCallback((loadedDays: WorkoutDay[]) => {
    setDays(loadedDays);
    setSelectedDay(null);
  }, []);

  const clearDays = useCallback(() => {
    setDays([]);
    setSelectedDay(null);
    setMinimizedDays(new Set());
  }, []);

  return {
    days,
    selectedDay,
    minimizedDays,
    setDays,
    setSelectedDay,
    addDay,
    removeDay,
    duplicateDay,
    updateDay,
    toggleMinimizeDay,
    addExercise,
    removeExercise,
    updateExercise,
    addSet,
    removeSet,
    updateSet,
    loadDays,
    clearDays,
  };
}
