import { useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import toast from 'react-hot-toast';
import { logger } from '../../../../utils/logger';
import type { WorkoutPlanTemplate, WorkoutDay } from '../types';

export function useWorkoutPlanTemplates() {
  const [templates, setTemplates] = useState<WorkoutPlanTemplate[]>([]);
  const [showLoadTemplateModal, setShowLoadTemplateModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const loadTemplates = useCallback(async (traineeId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      let query = supabase
        .from('workout_plan_templates')
        .select('*')
        .eq('trainer_id', user.id);

      // If traineeId is provided, load both general templates (trainee_id IS NULL) 
      // and trainee-specific templates (trainee_id = traineeId)
      if (traineeId) {
        // Use separate queries and combine results, as or() with null checks can be problematic
        const [generalResult, specificResult] = await Promise.all([
          supabase
            .from('workout_plan_templates')
            .select('*')
            .eq('trainer_id', user.id)
            .is('trainee_id', null)
            .order('created_at', { ascending: false }),
          supabase
            .from('workout_plan_templates')
            .select('*')
            .eq('trainer_id', user.id)
            .eq('trainee_id', traineeId)
            .order('created_at', { ascending: false }),
        ]);

        const generalTemplates = generalResult.data || [];
        const specificTemplates = specificResult.data || [];
        
        // Combine and deduplicate by id
        const allTemplates = [...generalTemplates, ...specificTemplates];
        const uniqueTemplates = allTemplates.filter((template, index, self) =>
          index === self.findIndex(t => t.id === template.id)
        );
        
        // Sort by created_at descending
        uniqueTemplates.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        setTemplates(uniqueTemplates);
      } else {
        // Load only general templates
        const { data, error } = await query.is('trainee_id', null).order('created_at', { ascending: false });
        
        if (error) {
          logger.error('Error loading templates', error, 'useWorkoutPlanTemplates');
          return;
        }
        
        if (data) {
          setTemplates(data);
        }
      }
    } catch (error) {
      logger.error('Error loading templates', error, 'useWorkoutPlanTemplates');
    }
  }, []);

  const loadTemplate = useCallback(async (template: WorkoutPlanTemplate, setDays: (days: WorkoutDay[]) => void, setPlanName: (name: string) => void, setPlanDescription: (desc: string) => void, setDaysPerWeek: (days: number) => void) => {
    try {
      if (template.days && template.days.length > 0) {
        // Load exercises from database if we only have IDs
        const loadedDays: WorkoutDay[] = [];
        
        for (const day of template.days as any[]) {
          const planExercises: any[] = [];
          
          if (day.exercises && Array.isArray(day.exercises)) {
            for (const ex of day.exercises) {
              // If we have exercise_id, fetch the full exercise data
              let exerciseData = ex.exercise;
              if (ex.exercise_id && !exerciseData) {
                const { data: exercise, error: exerciseError } = await supabase
                  .from('exercises')
                  .select('id, name, muscle_group_id')
                  .eq('id', ex.exercise_id)
                  .single();
                
                if (exerciseError) {
                  logger.warn('Error loading exercise for template', exerciseError, 'useWorkoutPlanTemplates');
                  continue;
                }
                exerciseData = exercise;
              }
              
              if (exerciseData) {
                planExercises.push({
                  tempId: `${day.day_number}-${ex.exercise_id || Date.now()}`,
                  exercise: exerciseData,
                  sets: ex.sets || [],
                  rest_seconds: ex.rest_seconds || 90,
                  notes: ex.notes || '',
                });
              }
            }
          }
          
          loadedDays.push({
            tempId: Date.now().toString() + Math.random(),
            day_number: day.day_number,
            day_name: day.day_name || '',
            focus: day.focus || '',
            notes: day.notes || '',
            exercises: planExercises,
          });
        }

        setDays(loadedDays);
        setPlanName(template.name);
        setPlanDescription(template.description || '');
        setDaysPerWeek(template.days.length);
        toast.success('תבנית נטענה בהצלחה!');
      }
    } catch (error) {
      logger.error('Error loading template', error, 'useWorkoutPlanTemplates');
      toast.error('שגיאה בטעינת התבנית');
    } finally {
      setShowLoadTemplateModal(false);
    }
  }, []);

  const saveTemplate = useCallback(async (templateName: string, planDescription: string, days: WorkoutDay[], traineeId?: string | null) => {
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

    // Clean and serialize the data for JSONB storage
    const cleanedDays = days.map(day => ({
      day_number: day.day_number,
      day_name: day.day_name || null,
      focus: day.focus || null,
      notes: day.notes || null,
      exercises: day.exercises.map(ex => ({
        exercise_id: ex.exercise?.id || null,
        exercise_name: ex.exercise?.name || null,
        sets: ex.sets.map(set => ({
          set_number: set.set_number,
          weight: set.weight || null,
          reps: set.reps || null,
          rpe: set.rpe || null,
          set_type: set.set_type || 'regular',
          failure: set.failure || false,
          equipment_id: set.equipment_id || null,
          superset_exercise_id: set.superset_exercise_id || null,
          superset_weight: set.superset_weight || null,
          superset_reps: set.superset_reps || null,
          superset_rpe: set.superset_rpe || null,
          superset_equipment_id: set.superset_equipment_id || null,
          superset_dropset_weight: set.superset_dropset_weight || null,
          superset_dropset_reps: set.superset_dropset_reps || null,
          dropset_weight: set.dropset_weight || null,
          dropset_reps: set.dropset_reps || null,
        })),
        rest_seconds: ex.rest_seconds || 90,
        notes: ex.notes || null,
      })),
    }));

    const insertData: any = {
      trainer_id: user.id,
      name: templateName,
      description: planDescription || null,
      days: cleanedDays,
    };

    // Only include trainee_id if it's provided (not null/undefined)
    if (traineeId) {
      insertData.trainee_id = traineeId;
    }

    const { error, data } = await supabase
      .from('workout_plan_templates')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error('Error saving template', error, 'useWorkoutPlanTemplates');
      toast.error(`שגיאה בשמירת התבנית: ${error.message || 'שגיאה לא ידועה'}`);
      return false;
    }

    toast.success('תבנית נשמרה בהצלחה!');
    setShowSaveTemplateModal(false);
    setTemplateName('');
    await loadTemplates(traineeId || undefined);
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
