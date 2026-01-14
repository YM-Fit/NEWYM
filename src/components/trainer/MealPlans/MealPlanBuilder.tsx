import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { createFoodItem, updateFoodItem, deleteFoodItem } from '../../../api/nutritionApi';
import type { NutritionFoodItem } from '../../../types/nutritionTypes';
import {
  ArrowRight,
  Plus,
  Trash2,
  Save,
  Clock,
  GripVertical,
  FileText,
  Download,
  Upload,
  History,
  ChevronDown,
  ChevronUp,
  Droplets,
  Flame,
  Beef,
  Wheat,
  Droplet,
  X,
  Copy,
  Check,
  AlertCircle,
  UtensilsCrossed,
} from 'lucide-react';

interface MealPlanBuilderProps {
  traineeId: string;
  traineeName: string;
  trainerId: string;
  onBack: () => void;
}

interface Meal {
  id?: string;
  plan_id?: string;
  meal_time: string;
  meal_name: string;
  description: string;
  alternatives: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  notes: string;
  order_index: number;
  food_items?: NutritionFoodItem[];
  total_calories?: number | null;
  total_protein?: number | null;
  total_carbs?: number | null;
  total_fat?: number | null;
}

interface MealPlan {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  daily_calories: number | null;
  daily_water_ml: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

interface MealPlanTemplate {
  id: string;
  name: string;
  description: string | null;
  daily_calories: number | null;
  daily_water_ml: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  meals: Meal[];
  created_at: string;
}

interface NoteTemplate {
  id: string;
  title: string;
  content: string;
}

interface HistoryEntry {
  id: string;
  change_description: string;
  changed_at: string;
  snapshot: any;
}

const MEAL_NAMES = [
  { value: 'breakfast', label: 'ארוחת בוקר', icon: '🌅' },
  { value: 'morning_snack', label: 'ביניים בוקר', icon: '🍎' },
  { value: 'lunch', label: 'ארוחת צהריים', icon: '🌞' },
  { value: 'afternoon_snack', label: 'ביניים אחה"צ', icon: '🥤' },
  { value: 'dinner', label: 'ארוחת ערב', icon: '🌙' },
  { value: 'evening_snack', label: 'ביניים ערב', icon: '🍵' },
];

const DEFAULT_NOTE_TEMPLATES = [
  { title: 'Drink Water', content: 'Drink a glass of water before each meal' },
  { title: 'Stop Eating', content: 'No eating 3 hours before sleep' },
  { title: 'Slow Eating', content: 'Eat slowly and chew each bite thoroughly' },
  { title: 'Protein in Every Meal', content: 'Include a protein source in every meal' },
];

export default function MealPlanBuilder({
  traineeId,
  traineeName,
  trainerId,
  onBack,
}: MealPlanBuilderProps) {
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [activePlan, setActivePlan] = useState<MealPlan | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [templates, setTemplates] = useState<MealPlanTemplate[]>([]);
  const [noteTemplates, setNoteTemplates] = useState<NoteTemplate[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'list' | 'editor' | 'history'>('list');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showLoadTemplateModal, setShowLoadTemplateModal] = useState(false);
  const [showNoteTemplateModal, setShowNoteTemplateModal] = useState(false);
  const [showNewNoteTemplateModal, setShowNewNoteTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [newNoteTemplate, setNewNoteTemplate] = useState({ title: '', content: '' });
  const [expandedMeals, setExpandedMeals] = useState<Set<number>>(new Set());
  const [draggedMealIndex, setDraggedMealIndex] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlanData, setNewPlanData] = useState({
    name: '',
    description: '',
    daily_calories: '',
    daily_water_ml: '',
    protein_grams: '',
    carbs_grams: '',
    fat_grams: '',
    notes: '',
  });

  // Debounce timers for food item updates
  const updateTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Debounced update function for food items
  const debouncedUpdateFoodItem = useCallback((
    foodItemId: string,
    updates: Partial<NutritionFoodItem>,
    displayIndex: number,
    itemIndex: number
  ) => {
    // Update local state immediately for instant UI feedback
    setMeals((prevMeals) => {
      const updatedMeals = [...prevMeals];
      const updatedItems = [...(updatedMeals[displayIndex].food_items || [])];
      updatedItems[itemIndex] = { ...updatedItems[itemIndex], ...updates };
      updatedMeals[displayIndex] = {
        ...updatedMeals[displayIndex],
        food_items: updatedItems,
      };
      return updatedMeals;
    });

    // Clear existing timer for this item
    const existingTimer = updateTimersRef.current.get(foodItemId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer to save to database after 500ms of inactivity
    const timer = setTimeout(async () => {
      try {
        const updated = await updateFoodItem(foodItemId, updates);
        if (!updated) {
          toast.error('שגיאה בעדכון פריט מזון');
        }
      } catch (error) {
        console.error('Error updating food item:', error);
        toast.error('שגיאה בעדכון פריט מזון');
      }
      updateTimersRef.current.delete(foodItemId);
    }, 500);

    updateTimersRef.current.set(foodItemId, timer);
  }, [updateFoodItem]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      updateTimersRef.current.forEach((timer) => clearTimeout(timer));
      updateTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [traineeId]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadPlans(),
      loadTemplates(),
      loadNoteTemplates(),
    ]);
    setLoading(false);
  };

  const loadPlans = async () => {
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('trainee_id', traineeId)
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('שגיאה בטעינת תפריטים');
      return;
    }

    setPlans(data || []);
    const active = data?.find((p) => p.is_active);
    if (active) {
      setActivePlan(active);
      await loadMeals(active.id);
    }
  };

  const loadMeals = async (planId: string) => {
    const { data: mealsData, error } = await supabase
      .from('meal_plan_meals')
      .select('*')
      .eq('plan_id', planId)
      .order('order_index', { ascending: true });

    if (error) {
      toast.error('שגיאה בטעינת ארוחות');
      return;
    }

    if (!mealsData) {
      setMeals([]);
      return;
    }

    // Load food items for each meal
    const mealsWithFoodItems = await Promise.all(
      mealsData.map(async (meal) => {
        const { data: foodItems } = await supabase
          .from('meal_plan_food_items')
          .select('*')
          .eq('meal_id', meal.id)
          .order('order_index', { ascending: true });

        // Calculate totals from food items
        const totals = (foodItems || []).reduce(
          (acc, item) => ({
            calories: acc.calories + (item.calories || 0),
            protein: acc.protein + (item.protein || 0),
            carbs: acc.carbs + (item.carbs || 0),
            fat: acc.fat + (item.fat || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );

        return {
          ...meal,
          food_items: foodItems || [],
          total_calories: totals.calories || null,
          total_protein: totals.protein || null,
          total_carbs: totals.carbs || null,
          total_fat: totals.fat || null,
        };
      })
    );

    setMeals(mealsWithFoodItems);
  };

  const loadTemplates = async () => {
    const { data } = await supabase
      .from('meal_plan_templates')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false });

    setTemplates(data || []);
  };

  const loadNoteTemplates = async () => {
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
  };

  const loadHistory = async (planId: string) => {
    const { data } = await supabase
      .from('meal_plan_history')
      .select('*')
      .eq('plan_id', planId)
      .order('changed_at', { ascending: false });

    setHistory(data || []);
  };

  const handleCreatePlan = async () => {
    if (!newPlanData.name.trim()) {
      toast.error('נא להזין שם לתפריט');
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from('meal_plans')
      .insert({
        trainer_id: trainerId,
        trainee_id: traineeId,
        name: newPlanData.name,
        description: newPlanData.description || null,
        daily_calories: newPlanData.daily_calories ? parseInt(newPlanData.daily_calories) : null,
        daily_water_ml: newPlanData.daily_water_ml ? parseInt(newPlanData.daily_water_ml) : null,
        protein_grams: newPlanData.protein_grams ? parseInt(newPlanData.protein_grams) : null,
        carbs_grams: newPlanData.carbs_grams ? parseInt(newPlanData.carbs_grams) : null,
        fat_grams: newPlanData.fat_grams ? parseInt(newPlanData.fat_grams) : null,
        notes: newPlanData.notes || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      toast.error('שגיאה ביצירת תפריט');
      setSaving(false);
      return;
    }

    await supabase
      .from('meal_plans')
      .update({ is_active: false })
      .eq('trainee_id', traineeId)
      .eq('trainer_id', trainerId)
      .neq('id', data.id);

    toast.success('תפריט נוצר בהצלחה');
    setShowCreateForm(false);
    setNewPlanData({
      name: '',
      description: '',
      daily_calories: '',
      daily_water_ml: '',
      protein_grams: '',
      carbs_grams: '',
      fat_grams: '',
      notes: '',
    });
    setActivePlan(data);
    setMeals([]);
    setView('editor');
    await loadPlans();
    setSaving(false);
  };

  const handleUpdatePlan = async (updates: Partial<MealPlan>) => {
    if (!activePlan) return;

    const { error } = await supabase
      .from('meal_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', activePlan.id);

    if (error) {
      toast.error('שגיאה בעדכון תפריט');
      return;
    }

    setActivePlan({ ...activePlan, ...updates });
  };

  const handleActivatePlan = async (planId: string) => {
    await supabase
      .from('meal_plans')
      .update({ is_active: false })
      .eq('trainee_id', traineeId)
      .eq('trainer_id', trainerId);

    await supabase
      .from('meal_plans')
      .update({ is_active: true })
      .eq('id', planId);

    toast.success('תפריט הופעל');
    await loadPlans();
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('האם למחוק את התפריט? פעולה זו תמחק גם את כל הארוחות בתפריט.')) return;

    const { error } = await supabase.from('meal_plans').delete().eq('id', planId);

    if (error) {
      toast.error('שגיאה במחיקת תפריט');
      return;
    }

    toast.success('תפריט נמחק בהצלחה');
    if (activePlan?.id === planId) {
      setActivePlan(null);
      setMeals([]);
      setView('list');
    }
    await loadPlans();
  };

  const handleAddMeal = () => {
    const newMeal: Meal = {
      meal_time: '08:00',
      meal_name: 'breakfast',
      description: '',
      alternatives: '',
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      notes: '',
      order_index: meals.length,
    };
    setMeals([...meals, newMeal]);
    setExpandedMeals(new Set([...expandedMeals, meals.length]));
  };

  const handleUpdateMeal = (index: number, field: keyof Meal, value: any) => {
    const updated = [...meals];
    updated[index] = { ...updated[index], [field]: value };
    setMeals(updated);
  };

  const handleDeleteMeal = (index: number) => {
    const updated = meals.filter((_, i) => i !== index);
    updated.forEach((meal, i) => (meal.order_index = i));
    setMeals(updated);
  };

  const handleDragStart = (index: number) => {
    setDraggedMealIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedMealIndex === null || draggedMealIndex === index) return;

    const updated = [...meals];
    const dragged = updated[draggedMealIndex];
    updated.splice(draggedMealIndex, 1);
    updated.splice(index, 0, dragged);
    updated.forEach((meal, i) => (meal.order_index = i));
    setMeals(updated);
    setDraggedMealIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedMealIndex(null);
  };

  const handleSaveMeals = async () => {
    if (!activePlan) return;

    setSaving(true);

    await supabase.from('meal_plan_meals').delete().eq('plan_id', activePlan.id);

    const mealsToInsert = meals.map((meal) => ({
      plan_id: activePlan.id,
      meal_time: meal.meal_time,
      meal_name: meal.meal_name,
      description: meal.description,
      alternatives: meal.alternatives,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      notes: meal.notes,
      order_index: meal.order_index,
    }));

    if (mealsToInsert.length > 0) {
      const { error } = await supabase.from('meal_plan_meals').insert(mealsToInsert);

      if (error) {
        toast.error('שגיאה בשמירת ארוחות');
        setSaving(false);
        return;
      }
    }

    await saveToHistory('Updated meals');
    await handleUpdatePlan({ updated_at: new Date().toISOString() } as any);

    toast.success('הארוחות נשמרו בהצלחה');
    await loadMeals(activePlan.id);
    setSaving(false);
  };

  const saveToHistory = async (description: string) => {
    if (!activePlan) return;

    const snapshot = {
      plan: activePlan,
      meals: meals,
    };

    await supabase.from('meal_plan_history').insert({
      plan_id: activePlan.id,
      trainee_id: traineeId,
      change_description: description,
      snapshot: snapshot,
    });
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (!activePlan) return;

    setSaving(true);

    const { error } = await supabase.from('meal_plan_templates').insert({
      trainer_id: trainerId,
      name: templateName,
      description: activePlan.description,
      daily_calories: activePlan.daily_calories,
      daily_water_ml: activePlan.daily_water_ml,
      protein_grams: activePlan.protein_grams,
      carbs_grams: activePlan.carbs_grams,
      fat_grams: activePlan.fat_grams,
      meals: meals,
    });

    if (error) {
      toast.error('Error saving template');
    } else {
      toast.success('Template saved successfully');
      setShowTemplateModal(false);
      setTemplateName('');
      await loadTemplates();
    }

    setSaving(false);
  };

  const handleLoadFromTemplate = async (template: MealPlanTemplate) => {
    if (!activePlan) return;

    await handleUpdatePlan({
      daily_calories: template.daily_calories,
      daily_water_ml: template.daily_water_ml,
      protein_grams: template.protein_grams,
      carbs_grams: template.carbs_grams,
      fat_grams: template.fat_grams,
    });

    const loadedMeals = (template.meals || []).map((m, i) => ({
      ...m,
      id: undefined,
      plan_id: activePlan.id,
      order_index: i,
    }));

    setMeals(loadedMeals);
    setShowLoadTemplateModal(false);
    toast.success('Template loaded successfully');
  };

  const handleAddNoteFromTemplate = (template: NoteTemplate) => {
    if (!activePlan) return;

    const currentNotes = activePlan.notes || '';
    const newNotes = currentNotes ? `${currentNotes}\n${template.content}` : template.content;
    handleUpdatePlan({ notes: newNotes });
    setShowNoteTemplateModal(false);
    toast.success('Note added');
  };

  const handleCreateNoteTemplate = async () => {
    if (!newNoteTemplate.title.trim() || !newNoteTemplate.content.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    const { error } = await supabase.from('meal_note_templates').insert({
      trainer_id: trainerId,
      title: newNoteTemplate.title,
      content: newNoteTemplate.content,
    });

    if (error) {
      toast.error('Error saving template');
    } else {
      toast.success('Template saved');
      setShowNewNoteTemplateModal(false);
      setNewNoteTemplate({ title: '', content: '' });
      await loadNoteTemplates();
    }
  };

  const toggleMealExpanded = (index: number) => {
    const newExpanded = new Set(expandedMeals);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedMeals(newExpanded);
  };

  const getMealLabel = (value: string) => {
    return MEAL_NAMES.find((m) => m.value === value)?.label || value;
  };

  const calculateTotalMacros = useCallback(() => {
    return meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.calories || 0),
        protein: acc.protein + (meal.protein || 0),
        carbs: acc.carbs + (meal.carbs || 0),
        fat: acc.fat + (meal.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [meals]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="premium-card-static p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-3 hover:bg-[var(--color-accent-bg)] rounded-xl transition-all duration-300 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500/30 to-teal-500/30 rounded-2xl shadow-lg">
                <UtensilsCrossed className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">תפריט תזונה</h1>
                <p className="text-[var(--color-text-muted)]">{traineeName}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setView('list')}
              className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 ${
                view === 'list'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]'
              }`}
            >
              רשימה
            </button>
            {activePlan && (
              <>
                <button
                  onClick={() => setView('editor')}
                  className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 ${
                    view === 'editor'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                      : 'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]'
                  }`}
                >
                  עריכה
                </button>
                <button
                  onClick={() => {
                    loadHistory(activePlan.id);
                    setView('history');
                  }}
                  className={`p-2.5 rounded-xl font-semibold transition-all duration-300 ${
                    view === 'history'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                      : 'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]'
                  }`}
                >
                  <History className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {view === 'list' && (
        <PlanListView
          plans={plans}
          activePlan={activePlan}
          onActivate={handleActivatePlan}
          onEdit={(plan) => {
            setActivePlan(plan);
            loadMeals(plan.id);
            setView('editor');
          }}
          onDelete={handleDeletePlan}
          onCreateNew={() => setShowCreateForm(true)}
        />
      )}

      {view === 'editor' && activePlan && (
        <PlanEditorView
          plan={activePlan}
          meals={meals}
          expandedMeals={expandedMeals}
          saving={saving}
          onUpdatePlan={handleUpdatePlan}
          onAddMeal={handleAddMeal}
          onUpdateMeal={handleUpdateMeal}
          onDeleteMeal={handleDeleteMeal}
          onToggleMeal={toggleMealExpanded}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onSave={handleSaveMeals}
          onSaveAsTemplate={() => setShowTemplateModal(true)}
          onLoadTemplate={() => setShowLoadTemplateModal(true)}
          onAddNote={() => setShowNoteTemplateModal(true)}
          getMealLabel={getMealLabel}
          calculateTotalMacros={calculateTotalMacros}
          setMeals={setMeals}
          debouncedUpdateFoodItem={debouncedUpdateFoodItem}
        />
      )}

      {view === 'history' && activePlan && (
        <HistoryView
          history={history}
          onRestore={(entry) => {
            if (entry.snapshot.meals) {
              setMeals(entry.snapshot.meals);
              toast.success('Version restored - click Save to save');
              setView('editor');
            }
          }}
        />
      )}

      {showCreateForm && (
        <CreatePlanModal
          data={newPlanData}
          saving={saving}
          onChange={setNewPlanData}
          onSave={handleCreatePlan}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {showTemplateModal && (
        <SaveTemplateModal
          templateName={templateName}
          saving={saving}
          onNameChange={setTemplateName}
          onSave={handleSaveAsTemplate}
          onClose={() => setShowTemplateModal(false)}
        />
      )}

      {showLoadTemplateModal && (
        <LoadTemplateModal
          templates={templates}
          onLoad={handleLoadFromTemplate}
          onClose={() => setShowLoadTemplateModal(false)}
        />
      )}

      {showNoteTemplateModal && (
        <NoteTemplateModal
          templates={noteTemplates}
          onSelect={handleAddNoteFromTemplate}
          onCreateNew={() => {
            setShowNoteTemplateModal(false);
            setShowNewNoteTemplateModal(true);
          }}
          onClose={() => setShowNoteTemplateModal(false)}
        />
      )}

      {showNewNoteTemplateModal && (
        <CreateNoteTemplateModal
          data={newNoteTemplate}
          onChange={setNewNoteTemplate}
          onSave={handleCreateNoteTemplate}
          onClose={() => setShowNewNoteTemplateModal(false)}
        />
      )}
    </div>
  );
}

interface PlanListViewProps {
  plans: MealPlan[];
  activePlan: MealPlan | null;
  onActivate: (planId: string) => void;
  onEdit: (plan: MealPlan) => void;
  onDelete: (planId: string) => void;
  onCreateNew: () => void;
}

function PlanListView({ plans, activePlan, onActivate, onEdit, onDelete, onCreateNew }: PlanListViewProps) {
  return (
    <div className="space-y-6">
      <button
        onClick={onCreateNew}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-4 rounded-2xl flex items-center justify-center gap-3 font-semibold transition-all duration-300 shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:shadow-emerald-500/30 hover:scale-[1.01]"
      >
        <Plus className="h-5 w-5" />
        צור תפריט חדש
      </button>

      {activePlan && (
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-8 text-white shadow-xl shadow-emerald-500/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="bg-white/20 text-xs px-3 py-1.5 rounded-xl font-semibold">תפריט פעיל</span>
              <h3 className="text-2xl font-bold mt-3">{activePlan.name}</h3>
              {activePlan.description && <p className="text-emerald-100 text-sm mt-2">{activePlan.description}</p>}
            </div>
            <button
              onClick={() => onEdit(activePlan)}
              className="bg-white/20 hover:bg-white/30 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
            >
              ערוך
            </button>
          </div>

          {(activePlan.daily_calories || activePlan.protein_grams) && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
              {activePlan.daily_calories && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center hover:bg-white/20 transition-all duration-300">
                  <Flame className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-xl font-bold">{activePlan.daily_calories}</p>
                  <p className="text-xs text-emerald-200">קלוריות</p>
                </div>
              )}
              {activePlan.protein_grams && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center hover:bg-white/20 transition-all duration-300">
                  <Beef className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-xl font-bold">{activePlan.protein_grams}ג</p>
                  <p className="text-xs text-emerald-200">חלבון</p>
                </div>
              )}
              {activePlan.carbs_grams && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center hover:bg-white/20 transition-all duration-300">
                  <Wheat className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-xl font-bold">{activePlan.carbs_grams}ג</p>
                  <p className="text-xs text-emerald-200">פחמימות</p>
                </div>
              )}
              {activePlan.fat_grams && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center hover:bg-white/20 transition-all duration-300">
                  <Droplet className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-xl font-bold">{activePlan.fat_grams}ג</p>
                  <p className="text-xs text-emerald-200">שומן</p>
                </div>
              )}
              {activePlan.daily_water_ml && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center hover:bg-white/20 transition-all duration-300">
                  <Droplets className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-xl font-bold">{(activePlan.daily_water_ml / 1000).toFixed(1)} ליטר</p>
                  <p className="text-xs text-emerald-200">מים</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="premium-card-static overflow-hidden">
        <div className="p-6 border-b border-[var(--color-border)]">
          <h3 className="font-bold text-[var(--color-text-primary)] text-lg">היסטוריית תפריטים</h3>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {plans.filter((p) => p.id !== activePlan?.id).length === 0 ? (
            <div className="p-12 text-center text-[var(--color-text-muted)]">אין תפריטים נוספים</div>
          ) : (
            plans
              .filter((p) => p.id !== activePlan?.id)
              .map((plan) => (
                <div key={plan.id} className="p-5 flex items-center justify-between hover:bg-[var(--color-accent-bg)] transition-all duration-300">
                  <div>
                    <h4 className="font-semibold text-[var(--color-text-primary)]">{plan.name}</h4>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {new Date(plan.created_at).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => onActivate(plan.id)}
                      className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold hover:bg-emerald-500/30 transition-all duration-300 hover:scale-105"
                    >
                      הפעל
                    </button>
                    <button
                      onClick={() => onEdit(plan)}
                      className="px-4 py-2 bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] rounded-xl text-sm font-semibold hover:bg-[var(--color-bg-elevated)] transition-all duration-300 border border-[var(--color-border)]"
                    >
                      ערוך
                    </button>
                    <button
                      onClick={() => onDelete(plan.id)}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-xl transition-all duration-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

interface PlanEditorViewProps {
  plan: MealPlan;
  meals: Meal[];
  expandedMeals: Set<number>;
  saving: boolean;
  onUpdatePlan: (updates: Partial<MealPlan>) => void;
  onAddMeal: () => void;
  onUpdateMeal: (index: number, field: keyof Meal, value: any) => void;
  onDeleteMeal: (index: number) => void;
  onToggleMeal: (index: number) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onSave: () => void;
  onSaveAsTemplate: () => void;
  onLoadTemplate: () => void;
  onAddNote: () => void;
  getMealLabel: (value: string) => string;
  calculateTotalMacros: () => { calories: number; protein: number; carbs: number; fat: number };
  setMeals: React.Dispatch<React.SetStateAction<Meal[]>>;
  debouncedUpdateFoodItem: (foodItemId: string, updates: Partial<NutritionFoodItem>, displayIndex: number, itemIndex: number) => void;
}

function PlanEditorView({
  plan,
  meals,
  expandedMeals,
  saving,
  onUpdatePlan,
  onAddMeal,
  onUpdateMeal,
  onDeleteMeal,
  onToggleMeal,
  onDragStart,
  onDragOver,
  onDragEnd,
  onSave,
  onSaveAsTemplate,
  onLoadTemplate,
  onAddNote,
  getMealLabel,
  calculateTotalMacros,
  setMeals,
  debouncedUpdateFoodItem,
}: PlanEditorViewProps) {
  const totals = calculateTotalMacros();

  return (
    <div className="space-y-8">
      {/* Plan Settings Card */}
      <div className="premium-card-static p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-[var(--color-text-primary)] text-xl">הגדרות תפריט</h3>
          <div className="flex gap-3">
            <button
              onClick={onLoadTemplate}
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-500/30 transition-all duration-300 hover:scale-105"
            >
              <Download className="h-4 w-4" />
              טען תבנית
            </button>
            <button
              onClick={onSaveAsTemplate}
              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] rounded-xl text-sm font-semibold hover:bg-[var(--color-bg-elevated)] transition-all duration-300 border border-[var(--color-border)]"
            >
              <Upload className="h-4 w-4" />
              שמור כתבנית
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">שם התפריט</label>
            <input
              type="text"
              value={plan.name || ''}
              onChange={(e) => onUpdatePlan({ name: e.target.value })}
              className="glass-input w-full px-4 py-3"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">תיאור</label>
            <input
              type="text"
              value={plan.description || ''}
              onChange={(e) => onUpdatePlan({ description: e.target.value })}
              className="glass-input w-full px-4 py-3"
              placeholder="לדוגמה: תפריט הורדה במשקל"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              <Flame className="h-4 w-4 inline ml-1 text-amber-400" />
              קלוריות יומיות
            </label>
            <input
              type="number"
              value={plan.daily_calories || ''}
              onChange={(e) => onUpdatePlan({ daily_calories: e.target.value ? parseInt(e.target.value) : null })}
              className="glass-input w-full px-4 py-3"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              <Beef className="h-4 w-4 inline ml-1 text-red-400" />
              חלבון (גרם)
            </label>
            <input
              type="number"
              value={plan.protein_grams || ''}
              onChange={(e) => onUpdatePlan({ protein_grams: e.target.value ? parseInt(e.target.value) : null })}
              className="glass-input w-full px-4 py-3"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              <Wheat className="h-4 w-4 inline ml-1 text-amber-500" />
              פחמימות (גרם)
            </label>
            <input
              type="number"
              value={plan.carbs_grams || ''}
              onChange={(e) => onUpdatePlan({ carbs_grams: e.target.value ? parseInt(e.target.value) : null })}
              className="glass-input w-full px-4 py-3"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              <Droplet className="h-4 w-4 inline ml-1 text-yellow-400" />
              שומן (גרם)
            </label>
            <input
              type="number"
              value={plan.fat_grams || ''}
              onChange={(e) => onUpdatePlan({ fat_grams: e.target.value ? parseInt(e.target.value) : null })}
              className="glass-input w-full px-4 py-3"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
              <Droplets className="h-4 w-4 inline ml-1 text-blue-400" />
              מים (מ״ל)
            </label>
            <input
              type="number"
              value={plan.daily_water_ml || ''}
              onChange={(e) => onUpdatePlan({ daily_water_ml: e.target.value ? parseInt(e.target.value) : null })}
              className="glass-input w-full px-4 py-3"
            />
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)]">הערות כלליות</label>
            <button
              onClick={onAddNote}
              className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors duration-300"
            >
              <FileText className="h-4 w-4" />
              הוסף מתבנית
            </button>
          </div>
          <textarea
            value={plan.notes || ''}
            onChange={(e) => onUpdatePlan({ notes: e.target.value })}
            className="glass-input w-full px-4 py-3"
            rows={3}
            placeholder="הערות כלליות לתפריט..."
          />
        </div>
      </div>

      {/* Meals organized by meal type */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[var(--color-text-primary)] text-xl">ארוחות יומיות</h3>
          <button
            onClick={onAddMeal}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold hover:bg-emerald-500/30 transition-all duration-300 hover:scale-105"
          >
            <Plus className="h-4 w-4" />
            הוסף ארוחה
          </button>
        </div>

          {meals.length === 0 ? (
          <div className="premium-card-static p-12 text-center">
            <AlertCircle className="h-14 w-14 mx-auto mb-4 text-[var(--color-text-muted)]" />
            <p className="font-medium text-[var(--color-text-secondary)]">אין ארוחות בתפריט זה</p>
            <p className="text-sm mt-2 text-[var(--color-text-muted)]">לחץ על "הוסף ארוחה" כדי להתחיל</p>
            </div>
          ) : (
          // Group meals by meal type
          MEAL_NAMES.map((mealType) => {
            const mealsForType = meals.filter(m => m.meal_name === mealType.value);
            if (mealsForType.length === 0) return null;

            const mealTotals = mealsForType.reduce(
              (acc, m) => ({
                calories: acc.calories + (m.total_calories || 0),
                protein: acc.protein + (m.total_protein || 0),
                carbs: acc.carbs + (m.total_carbs || 0),
                fat: acc.fat + (m.total_fat || 0),
              }),
              { calories: 0, protein: 0, carbs: 0, fat: 0 }
            );

            return (
              <div
                key={mealType.value}
                className="premium-card-static overflow-hidden"
              >
                <div className="p-6 border-b border-[var(--color-border)] bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{mealType.icon}</span>
                      <div>
                        <h4 className="font-bold text-[var(--color-text-primary)] text-xl">{mealType.label}</h4>
                        <p className="text-sm text-[var(--color-text-muted)]">{mealsForType.length} {mealsForType.length === 1 ? 'מזון' : 'מזונות'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {mealTotals.calories > 0 && (
                        <div className="flex gap-2 text-sm">
                          {mealTotals.calories > 0 && (
                            <span className="text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] px-3 py-1.5 rounded-lg border border-[var(--color-border)]">
                              <span className="text-emerald-400 font-semibold">{mealTotals.calories}</span> קל'
                            </span>
                          )}
                          {mealTotals.protein > 0 && (
                            <span className="text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] px-3 py-1.5 rounded-lg border border-[var(--color-border)]">
                              <span className="text-emerald-400 font-semibold">{mealTotals.protein}ג</span> חלבון
                            </span>
                          )}
                        </div>
                      )}
                      <button
                        onClick={() => {
                          const defaultTimes: Record<string, string> = {
                            breakfast: '08:00',
                            morning_snack: '10:00',
                            lunch: '13:00',
                            afternoon_snack: '16:00',
                            dinner: '19:00',
                            evening_snack: '21:00',
                          };
                          const newMeal: Meal = {
                            meal_time: defaultTimes[mealType.value] || '12:00',
                            meal_name: mealType.value,
                            description: '',
                            alternatives: '',
                            calories: null,
                            protein: null,
                            carbs: null,
                            fat: null,
                            notes: '',
                            order_index: meals.length,
                          };
                          onAddMeal();
                          // Update the new meal to match the meal type
                          setTimeout(() => {
                            const lastIndex = meals.length;
                            onUpdateMeal(lastIndex, 'meal_name', mealType.value);
                            onUpdateMeal(lastIndex, 'meal_time', newMeal.meal_time);
                          }, 100);
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold hover:bg-emerald-500/30 transition-all duration-300"
                      >
                        <Plus className="h-4 w-4" />
                        הוסף מזון
                      </button>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-[var(--color-border)]">
                  {mealsForType
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((meal) => {
                      const mealIndex = meals.findIndex(m => 
                        (m.id && meal.id && m.id === meal.id) || 
                        (!m.id && !meal.id && m.meal_name === meal.meal_name && m.order_index === meal.order_index && m.meal_time === meal.meal_time)
                      );
                      const displayIndex = mealIndex >= 0 ? mealIndex : meals.findIndex(m => m.meal_name === meal.meal_name);
                      
                      return (
                        <div
                          key={meal.id || `${meal.meal_name}-${meal.order_index}-${meal.meal_time}`}
                          className="p-5 hover:bg-[var(--color-accent-bg)] transition-all duration-300"
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                            onClick={() => onToggleMeal(displayIndex)}
                >
                            <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 bg-emerald-500/20 rounded-xl">
                      <Clock className="h-4 w-4 text-emerald-400" />
                    </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <span className="font-semibold text-[var(--color-text-primary)]">{meal.meal_time}</span>
                                  {meal.description && (
                                    <span className="text-[var(--color-text-muted)] text-sm line-clamp-1">{meal.description}</span>
                                  )}
                  </div>
                                {meal.total_calories || meal.total_protein ? (
                                  <div className="flex gap-2 text-xs">
                                    {meal.total_calories && (
                                      <span className="text-[var(--color-text-muted)] bg-[var(--color-bg-surface)] px-2 py-0.5 rounded border border-[var(--color-border)]">{meal.total_calories} קל'</span>
                                    )}
                                    {meal.total_protein && (
                                      <span className="text-[var(--color-text-muted)] bg-[var(--color-bg-surface)] px-2 py-0.5 rounded border border-[var(--color-border)]">{meal.total_protein}ג חלבון</span>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                                  onDeleteMeal(displayIndex);
                      }}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-xl transition-all duration-300"
                                title="מחק מזון"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                              {expandedMeals.has(displayIndex) ? (
                                <ChevronUp className="h-5 w-5 text-[var(--color-text-muted)]" />
                    ) : (
                                <ChevronDown className="h-5 w-5 text-[var(--color-text-muted)]" />
                    )}
                  </div>
                </div>

                          {expandedMeals.has(displayIndex) && (
                            <div className="mt-6 space-y-5 pr-10">
                              <div className="grid grid-cols-2 gap-5">
                                <div>
                                  <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">שעה</label>
                                  <input
                                    type="time"
                                    value={meal.meal_time}
                                    onChange={(e) => onUpdateMeal(displayIndex, 'meal_time', e.target.value)}
                                    className="glass-input w-full px-4 py-3"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">סוג ארוחה</label>
                                  <select
                                    value={meal.meal_name}
                                    onChange={(e) => onUpdateMeal(displayIndex, 'meal_name', e.target.value)}
                                    className="glass-input w-full px-4 py-3"
                                  >
                                    {MEAL_NAMES.map((m) => (
                                      <option key={m.value} value={m.value}>
                                        {m.icon} {m.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* Food Items List */}
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <label className="block text-sm font-semibold text-[var(--color-text-secondary)]">פריטי מזון</label>
                                  <button
                                    onClick={async () => {
                                      if (!meal.id) {
                                        toast.error('שמור את הארוחה קודם לפני הוספת פריטי מזון');
                                        return;
                                      }
                                      const newItem = await createFoodItem(meal.id, {
                                        food_name: '',
                                        quantity: 1,
                                        unit: 'g',
                                        calories: null,
                                        protein: null,
                                        carbs: null,
                                        fat: null,
                                        order_index: (meal.food_items?.length || 0),
                                      });
                                      if (newItem) {
                                        const updatedMeals = [...meals];
                                        updatedMeals[displayIndex] = {
                                          ...updatedMeals[displayIndex],
                                          food_items: [...(updatedMeals[displayIndex].food_items || []), newItem],
                                        };
                                        setMeals(updatedMeals);
                                        toast.success('פריט מזון נוסף');
                                      }
                                    }}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold hover:bg-emerald-500/30 transition-all"
                                  >
                                    <Plus className="h-3 w-3" />
                                    הוסף פריט מזון
                                  </button>
                    </div>

                                {meal.food_items && meal.food_items.length > 0 ? (
                                  <div className="space-y-2">
                                    {meal.food_items.map((item, itemIndex) => (
                                      <div
                                        key={item.id}
                                        className="bg-[var(--color-bg-surface)] rounded-xl p-4 border border-[var(--color-border)]"
                                      >
                                        <div className="grid grid-cols-12 gap-3 items-end">
                                          <div className="col-span-4">
                                            <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">שם מזון</label>
                                            <input
                                              type="text"
                                              value={item.food_name}
                                              onChange={(e) => {
                                                debouncedUpdateFoodItem(item.id, { food_name: e.target.value }, displayIndex, itemIndex);
                                              }}
                                              className="glass-input w-full px-3 py-2 text-sm"
                                              placeholder="לדוגמה: ביצה"
                                            />
                                          </div>
                                          <div className="col-span-2">
                                            <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">כמות</label>
                                            <input
                                              type="number"
                                              step="0.1"
                                              value={item.quantity}
                                              onChange={(e) => {
                                                debouncedUpdateFoodItem(item.id, { quantity: parseFloat(e.target.value) || 0 }, displayIndex, itemIndex);
                                              }}
                                              className="glass-input w-full px-3 py-2 text-sm"
                                            />
                                          </div>
                                          <div className="col-span-2">
                                            <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">יחידה</label>
                                            <select
                                              value={item.unit}
                                              onChange={(e) => {
                                                debouncedUpdateFoodItem(item.id, { unit: e.target.value }, displayIndex, itemIndex);
                                              }}
                                              className="glass-input w-full px-3 py-2 text-sm"
                                            >
                                              <option value="g">גרם</option>
                                              <option value="unit">יחידה</option>
                                              <option value="ml">מ"ל</option>
                                              <option value="cup">כוס</option>
                                              <option value="tbsp">כף</option>
                                              <option value="tsp">כפית</option>
                                            </select>
                                          </div>
                                          <div className="col-span-3 flex gap-2">
                                            <div className="flex-1">
                                              <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">קל'</label>
                                              <input
                                                type="number"
                                                value={item.calories || ''}
                                                onChange={(e) => {
                                                  debouncedUpdateFoodItem(item.id, { calories: e.target.value ? parseInt(e.target.value) : null }, displayIndex, itemIndex);
                                                }}
                                                className="glass-input w-full px-2 py-2 text-xs"
                                                placeholder="קל'"
                                              />
                                            </div>
                                            <div className="flex-1">
                                              <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">חלבון</label>
                                              <input
                                                type="number"
                                                value={item.protein || ''}
                                                onChange={(e) => {
                                                  debouncedUpdateFoodItem(item.id, { protein: e.target.value ? parseInt(e.target.value) : null }, displayIndex, itemIndex);
                                                }}
                                                className="glass-input w-full px-2 py-2 text-xs"
                                                placeholder="גרם"
                                              />
                                            </div>
                                          </div>
                                          <div className="col-span-1">
                                            <button
                                              onClick={async () => {
                                                if (await deleteFoodItem(item.id)) {
                                                  const updatedMeals = [...meals];
                                                  updatedMeals[displayIndex] = {
                                                    ...updatedMeals[displayIndex],
                                                    food_items: (updatedMeals[displayIndex].food_items || []).filter(fi => fi.id !== item.id),
                                                  };
                                                  setMeals(updatedMeals);
                                                  toast.success('פריט מזון נמחק');
                                                }
                                              }}
                                              className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                                              title="מחק"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-6 text-[var(--color-text-muted)] text-sm bg-[var(--color-bg-surface)] rounded-xl border border-dashed border-[var(--color-border)]">
                                    אין פריטי מזון. לחץ על "הוסף פריט מזון" כדי להתחיל.
                                  </div>
                                )}

                                {/* Meal totals from food items */}
                                {meal.food_items && meal.food_items.length > 0 && (
                                  <div className="mt-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-[var(--color-text-secondary)] font-semibold">סיכום הארוחה:</span>
                                      <div className="flex gap-4">
                                        <span className="text-emerald-400">
                                          {meal.food_items.reduce((sum, item) => sum + (item.calories || 0), 0)} קל'
                                        </span>
                                        <span className="text-emerald-400">
                                          {meal.food_items.reduce((sum, item) => sum + (item.protein || 0), 0)}ג חלבון
                                        </span>
                                        <span className="text-emerald-400">
                                          {meal.food_items.reduce((sum, item) => sum + (item.carbs || 0), 0)}ג פחמימות
                                        </span>
                                        <span className="text-emerald-400">
                                          {meal.food_items.reduce((sum, item) => sum + (item.fat || 0), 0)}ג שומן
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">הערות כלליות (אופציונלי)</label>
                                <textarea
                                  value={meal.description}
                                  onChange={(e) => onUpdateMeal(displayIndex, 'description', e.target.value)}
                                  className="glass-input w-full px-4 py-3"
                                  rows={2}
                                  placeholder="הערות כלליות על הארוחה..."
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">חלופות</label>
                                <textarea
                                  value={meal.alternatives}
                                  onChange={(e) => onUpdateMeal(displayIndex, 'alternatives', e.target.value)}
                                  className="glass-input w-full px-4 py-3"
                                  rows={2}
                                  placeholder="ניתן להחליף ב..."
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">הערות</label>
                                <input
                                  type="text"
                                  value={meal.notes}
                                  onChange={(e) => onUpdateMeal(displayIndex, 'notes', e.target.value)}
                                  className="glass-input w-full px-4 py-3"
                                  placeholder="הערות נוספות..."
                                />
                              </div>
                  </div>
                )}
              </div>
                      );
                    })}
        </div>
              </div>
            );
          })
        )}

        {meals.length > 0 && totals.calories > 0 && (
          <div className="premium-card-static p-5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--color-text-primary)]">סיכום יומי כולל:</span>
              <div className="flex gap-6 text-sm">
                <span className="text-[var(--color-text-secondary)]"><span className="text-emerald-400 font-semibold">{totals.calories}</span> קלוריות</span>
                <span className="text-[var(--color-text-secondary)]"><span className="text-emerald-400 font-semibold">{totals.protein}ג</span> חלבון</span>
                <span className="text-[var(--color-text-secondary)]"><span className="text-emerald-400 font-semibold">{totals.carbs}ג</span> פחמימות</span>
                <span className="text-[var(--color-text-secondary)]"><span className="text-emerald-400 font-semibold">{totals.fat}ג</span> שומן</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white px-10 py-4 rounded-2xl flex items-center gap-3 font-semibold transition-all duration-300 shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:shadow-emerald-500/30 hover:scale-[1.02]"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              שומר...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              שמור תפריט
            </>
          )}
        </button>
      </div>
    </div>
  );
}

interface HistoryViewProps {
  history: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
}

function HistoryView({ history, onRestore }: HistoryViewProps) {
  return (
    <div className="premium-card-static overflow-hidden">
      <div className="p-6 border-b border-[var(--color-border)]">
        <h3 className="font-bold text-[var(--color-text-primary)] text-xl">היסטוריית שינויים</h3>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {history.length === 0 ? (
          <div className="p-12 text-center text-[var(--color-text-muted)]">אין היסטוריה</div>
        ) : (
          history.map((entry) => (
            <div key={entry.id} className="p-5 flex items-center justify-between hover:bg-[var(--color-accent-bg)] transition-all duration-300">
              <div>
                <p className="font-semibold text-[var(--color-text-primary)]">{entry.change_description}</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {new Date(entry.changed_at).toLocaleString('he-IL')}
                </p>
              </div>
              <button
                onClick={() => onRestore(entry)}
                className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-500/30 transition-all duration-300 hover:scale-105"
              >
                שחזר גרסה
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface CreatePlanModalProps {
  data: any;
  saving: boolean;
  onChange: (data: any) => void;
  onSave: () => void;
  onClose: () => void;
}

function CreatePlanModal({ data, saving, onChange, onSave, onClose }: CreatePlanModalProps) {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-white/10 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">תפריט חדש</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all duration-300">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">שם התפריט *</label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800/80 border-2 border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
              placeholder="לדוגמה: תפריט הורדה במשקל"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">תיאור</label>
            <input
              type="text"
              value={data.description}
              onChange={(e) => onChange({ ...data, description: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800/80 border-2 border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">יעד קלוריות יומי</label>
              <input
                type="number"
                value={data.daily_calories}
                onChange={(e) => onChange({ ...data, daily_calories: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800/80 border-2 border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">מים יומיים (מ״ל)</label>
              <input
                type="number"
                value={data.daily_water_ml}
                onChange={(e) => onChange({ ...data, daily_water_ml: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800/80 border-2 border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">חלבון (גרם)</label>
              <input
                type="number"
                value={data.protein_grams}
                onChange={(e) => onChange({ ...data, protein_grams: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800/80 border-2 border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">פחמימות (גרם)</label>
              <input
                type="number"
                value={data.carbs_grams}
                onChange={(e) => onChange({ ...data, carbs_grams: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800/80 border-2 border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">שומן (גרם)</label>
              <input
                type="number"
                value={data.fat_grams}
                onChange={(e) => onChange({ ...data, fat_grams: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800/80 border-2 border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">הערות כלליות</label>
            <textarea
              value={data.notes}
              onChange={(e) => onChange({ ...data, notes: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800/80 border-2 border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
              rows={3}
            />
          </div>
        </div>
        <div className="p-6 border-t border-white/10 flex gap-4">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-emerald-500/25"
          >
            {saving ? 'יוצר...' : 'צור תפריט'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 bg-gray-700/50 hover:bg-gray-700 text-gray-300 py-3.5 rounded-xl font-semibold transition-all duration-300"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

interface SaveTemplateModalProps {
  templateName: string;
  saving: boolean;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onClose: () => void;
}

function SaveTemplateModal({ templateName, saving, onNameChange, onSave, onClose }: SaveTemplateModalProps) {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-white/10 max-w-md w-full animate-fade-in">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Save as Template</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all duration-300">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6">
          <label className="block text-sm font-semibold text-gray-300 mb-2">Template Name</label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800/80 border-2 border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
            placeholder="e.g., 1800 calorie plan"
          />
        </div>
        <div className="p-6 border-t border-white/10 flex gap-4">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-emerald-500/25"
          >
            {saving ? 'Saving...' : 'Save Template'}
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-700/50 hover:bg-gray-700 text-gray-300 py-3.5 rounded-xl font-semibold transition-all duration-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface LoadTemplateModalProps {
  templates: MealPlanTemplate[];
  onLoad: (template: MealPlanTemplate) => void;
  onClose: () => void;
}

function LoadTemplateModal({ templates, onLoad, onClose }: LoadTemplateModalProps) {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-white/10 max-w-lg w-full max-h-[80vh] overflow-y-auto animate-fade-in">
        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-gradient-to-br from-gray-900 to-gray-800">
          <h2 className="text-xl font-bold text-white">Load from Template</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all duration-300">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6">
          {templates.length === 0 ? (
            <div className="text-center text-gray-500 py-12">No saved templates</div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onLoad(template)}
                  className="w-full text-right p-5 border-2 border-gray-700/50 rounded-2xl hover:border-emerald-500/30 hover:bg-gradient-to-br hover:from-emerald-500/5 hover:to-teal-500/5 transition-all duration-300 group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white group-hover:text-emerald-300 transition-colors">{template.name}</p>
                      {template.description && (
                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                      )}
                      <div className="flex gap-4 mt-3 text-xs text-gray-500">
                        {template.daily_calories && <span>{template.daily_calories} cal</span>}
                        {template.protein_grams && <span>{template.protein_grams}g protein</span>}
                      </div>
                    </div>
                    <Copy className="h-5 w-5 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface NoteTemplateModalProps {
  templates: NoteTemplate[];
  onSelect: (template: NoteTemplate) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

function NoteTemplateModal({ templates, onSelect, onCreateNew, onClose }: NoteTemplateModalProps) {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-white/10 max-w-md w-full max-h-[80vh] overflow-y-auto animate-fade-in">
        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-gradient-to-br from-gray-900 to-gray-800">
          <h2 className="text-xl font-bold text-white">Add Note from Template</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all duration-300">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className="w-full text-right p-5 border-2 border-gray-700/50 rounded-2xl hover:border-emerald-500/30 hover:bg-gradient-to-br hover:from-emerald-500/5 hover:to-teal-500/5 transition-all duration-300 group"
            >
              <p className="font-semibold text-white group-hover:text-emerald-300 transition-colors">{template.title}</p>
              <p className="text-sm text-gray-500 mt-2">{template.content}</p>
            </button>
          ))}
          <button
            onClick={onCreateNew}
            className="w-full p-5 border-2 border-dashed border-gray-700/50 rounded-2xl text-gray-500 hover:text-emerald-400 hover:border-emerald-500/30 transition-all duration-300 flex items-center justify-center gap-3"
          >
            <Plus className="h-5 w-5" />
            Create New Template
          </button>
        </div>
      </div>
    </div>
  );
}

interface CreateNoteTemplateModalProps {
  data: { title: string; content: string };
  onChange: (data: { title: string; content: string }) => void;
  onSave: () => void;
  onClose: () => void;
}

function CreateNoteTemplateModal({ data, onChange, onSave, onClose }: CreateNoteTemplateModalProps) {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-white/10 max-w-md w-full animate-fade-in">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">New Note Template</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all duration-300">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Title</label>
            <input
              type="text"
              value={data.title}
              onChange={(e) => onChange({ ...data, title: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800/80 border-2 border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
              placeholder="e.g., Drink Water"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Note Content</label>
            <textarea
              value={data.content}
              onChange={(e) => onChange({ ...data, content: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800/80 border-2 border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
              rows={3}
              placeholder="e.g., Drink a glass of water before each meal"
            />
          </div>
        </div>
        <div className="p-6 border-t border-white/10 flex gap-4">
          <button
            onClick={onSave}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-3.5 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-emerald-500/25"
          >
            Save Template
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-700/50 hover:bg-gray-700 text-gray-300 py-3.5 rounded-xl font-semibold transition-all duration-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
