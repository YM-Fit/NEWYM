import { useState, useEffect } from 'react';
import { useAutoSave } from '../../../hooks/useAutoSave';
import type { WorkoutExercise, DraftData } from '../types/selfWorkoutTypes';

interface UseSelfWorkoutStateProps {
  exercises: WorkoutExercise[];
  traineeId: string;
}

export function useSelfWorkoutState({ exercises, traineeId }: UseSelfWorkoutStateProps) {
  const [notes, setNotes] = useState('');
  const [workoutDate] = useState(new Date());
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftData, setDraftData] = useState<DraftData | null>(null);
  const [autoSaved, setAutoSaved] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  const workoutData = {
    exercises,
    notes,
    workoutDate: workoutDate.toISOString(),
    startTime,
  };

  const { lastSaved, isDirty, clearSaved, loadSaved } = useAutoSave({
    data: workoutData,
    localStorageKey: `self_workout_draft_${traineeId}`,
    enabled: true,
  });

  useEffect(() => {
    const saved = loadSaved();
    if (saved && saved.exercises && saved.exercises.length > 0) {
      setDraftData(saved);
      setShowDraftModal(true);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return {
    notes,
    setNotes,
    workoutDate,
    startTime,
    elapsedTime,
    setElapsedTime,
    showDraftModal,
    setShowDraftModal,
    draftData,
    setDraftData,
    autoSaved,
    setAutoSaved,
    showSummary,
    setShowSummary,
    showTemplateModal,
    setShowTemplateModal,
    templateName,
    setTemplateName,
    templateDescription,
    setTemplateDescription,
    savingTemplate,
    setSavingTemplate,
    lastSaved,
    isDirty,
    clearSaved,
    loadSaved,
  };
}
