import { useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import toast from 'react-hot-toast';
import type { MealPlanTemplate, NoteTemplate } from '../types/mealPlanTypes';
import { DEFAULT_NOTE_TEMPLATES } from '../constants/mealPlanConstants';

export function useMealPlanTemplates(trainerId: string) {
  const [templates, setTemplates] = useState<MealPlanTemplate[]>([]);
  const [noteTemplates, setNoteTemplates] = useState<NoteTemplate[]>([]);

  const loadTemplates = useCallback(async () => {
    const { data } = await supabase
      .from('meal_plan_templates')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false });

    setTemplates(data || []);
  }, [trainerId]);

  const loadNoteTemplates = useCallback(async () => {
    const { data } = await supabase
      .from('meal_note_templates')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      setNoteTemplates(data);
    } else {
      setNoteTemplates(DEFAULT_NOTE_TEMPLATES.map((t, i) => ({ ...t, id: `default-${i}` })));
    }
  }, [trainerId]);

  const saveTemplate = useCallback(async (templateName: string, plan: any, meals: any[]) => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return false;
    }

    const { error } = await supabase.from('meal_plan_templates').insert({
      trainer_id: trainerId,
      name: templateName,
      description: plan.description,
      daily_calories: plan.daily_calories,
      daily_water_ml: plan.daily_water_ml,
      protein_grams: plan.protein_grams,
      carbs_grams: plan.carbs_grams,
      fat_grams: plan.fat_grams,
      meals: meals,
    });

    if (error) {
      toast.error('Error saving template');
      return false;
    }

    toast.success('Template saved successfully');
    await loadTemplates();
    return true;
  }, [trainerId, loadTemplates]);

  const createNoteTemplate = useCallback(async (title: string, content: string) => {
    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in all fields');
      return false;
    }

    const { error } = await supabase.from('meal_note_templates').insert({
      trainer_id: trainerId,
      title: title,
      content: content,
    });

    if (error) {
      toast.error('Error saving template');
      return false;
    }

    toast.success('Template saved');
    await loadNoteTemplates();
    return true;
  }, [trainerId, loadNoteTemplates]);

  return {
    templates,
    noteTemplates,
    loadTemplates,
    loadNoteTemplates,
    saveTemplate,
    createNoteTemplate,
  };
}
