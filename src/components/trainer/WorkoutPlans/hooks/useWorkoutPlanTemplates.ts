import { useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import toast from 'react-hot-toast';
import type { WorkoutPlanTemplate, WorkoutDay } from '../types';

export function useWorkoutPlanTemplates() {
  const [templates, setTemplates] = useState<WorkoutPlanTemplate[]>([]);
  const [showLoadTemplateModal, setShowLoadTemplateModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const loadTemplates = useCallback(async () => {
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
  }, []);

  const loadTemplate = useCallback((template: WorkoutPlanTemplate, setDays: (days: WorkoutDay[]) => void, setPlanName: (name: string) => void, setPlanDescription: (desc: string) => void, setDaysPerWeek: (days: number) => void) => {
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
  }, []);

  const saveTemplate = useCallback(async (templateName: string, planDescription: string, days: WorkoutDay[]) => {
    if (!templateName.trim()) {
      toast.error('נא להזין שם לתבנית');
      return false;
    }

    if (days.length === 0) {
      toast.error('אין תוכן לשמור כתבנית');
      return false;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

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
      return false;
    }

    toast.success('תבנית נשמרה בהצלחה!');
    setShowSaveTemplateModal(false);
    setTemplateName('');
    await loadTemplates();
    return true;
  }, [loadTemplates]);

  return {
    templates,
    showLoadTemplateModal,
    showSaveTemplateModal,
    templateName,
    setShowLoadTemplateModal,
    setShowSaveTemplateModal,
    setTemplateName,
    loadTemplates,
    loadTemplate,
    saveTemplate,
  };
}
