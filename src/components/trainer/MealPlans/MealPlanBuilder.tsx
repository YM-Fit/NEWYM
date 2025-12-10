import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
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
  { value: 'breakfast', label: 'ארוחת בוקר' },
  { value: 'morning_snack', label: 'ביניים בוקר' },
  { value: 'lunch', label: 'ארוחת צהריים' },
  { value: 'afternoon_snack', label: 'ביניים אחה"צ' },
  { value: 'dinner', label: 'ארוחת ערב' },
  { value: 'evening_snack', label: 'ביניים ערב' },
];

const DEFAULT_NOTE_TEMPLATES = [
  { title: 'שתיית מים', content: 'שתה כוס מים לפני כל ארוחה' },
  { title: 'הפסקת אכילה', content: 'לא לאכול 3 שעות לפני השינה' },
  { title: 'ארוחה איטית', content: 'לאכול לאט ולעסוק כל נשיכה היטב' },
  { title: 'חלבון בכל ארוחה', content: 'לשלב מקור חלבון בכל ארוחה' },
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
    const { data, error } = await supabase
      .from('meal_plan_meals')
      .select('*')
      .eq('plan_id', planId)
      .order('order_index', { ascending: true });

    if (error) {
      toast.error('שגיאה בטעינת ארוחות');
      return;
    }

    setMeals(data || []);
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

    toast.success('התפריט הופעל');
    await loadPlans();
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('האם למחוק את התפריט? פעולה זו לא ניתנת לביטול.')) return;

    const { error } = await supabase.from('meal_plans').delete().eq('id', planId);

    if (error) {
      toast.error('שגיאה במחיקת תפריט');
      return;
    }

    toast.success('תפריט נמחק');
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

    await saveToHistory('עדכון ארוחות');
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
      toast.error('נא להזין שם לתבנית');
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
      toast.error('שגיאה בשמירת תבנית');
    } else {
      toast.success('התבנית נשמרה בהצלחה');
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
    toast.success('התבנית נטענה בהצלחה');
  };

  const handleAddNoteFromTemplate = (template: NoteTemplate) => {
    if (!activePlan) return;

    const currentNotes = activePlan.notes || '';
    const newNotes = currentNotes ? `${currentNotes}\n${template.content}` : template.content;
    handleUpdatePlan({ notes: newNotes });
    setShowNoteTemplateModal(false);
    toast.success('ההערה נוספה');
  };

  const handleCreateNoteTemplate = async () => {
    if (!newNoteTemplate.title.trim() || !newNoteTemplate.content.trim()) {
      toast.error('נא למלא את כל השדות');
      return;
    }

    const { error } = await supabase.from('meal_note_templates').insert({
      trainer_id: trainerId,
      title: newNoteTemplate.title,
      content: newNoteTemplate.content,
    });

    if (error) {
      toast.error('שגיאה בשמירת תבנית');
    } else {
      toast.success('התבנית נשמרה');
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
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowRight className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">תפריט תזונה</h1>
            <p className="text-gray-600">{traineeName}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'list' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            רשימה
          </button>
          {activePlan && (
            <>
              <button
                onClick={() => setView('editor')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'editor' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                עריכה
              </button>
              <button
                onClick={() => {
                  loadHistory(activePlan.id);
                  setView('history');
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  view === 'history' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <History className="h-4 w-4" />
              </button>
            </>
          )}
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
        />
      )}

      {view === 'history' && activePlan && (
        <HistoryView
          history={history}
          onRestore={(entry) => {
            if (entry.snapshot.meals) {
              setMeals(entry.snapshot.meals);
              toast.success('הגרסה שוחזרה - לחץ שמור לשמירה');
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
    <div className="space-y-4">
      <button
        onClick={onCreateNew}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors"
      >
        <Plus className="h-5 w-5" />
        צור תפריט חדש
      </button>

      {activePlan && (
        <div className="bg-gradient-to-l from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="bg-white/20 text-xs px-2 py-1 rounded-full">תפריט פעיל</span>
              <h3 className="text-xl font-bold mt-2">{activePlan.name}</h3>
              {activePlan.description && <p className="text-orange-100 text-sm mt-1">{activePlan.description}</p>}
            </div>
            <button
              onClick={() => onEdit(activePlan)}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              ערוך
            </button>
          </div>

          {(activePlan.daily_calories || activePlan.protein_grams) && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
              {activePlan.daily_calories && (
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <Flame className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-lg font-bold">{activePlan.daily_calories}</p>
                  <p className="text-xs text-orange-200">קלוריות</p>
                </div>
              )}
              {activePlan.protein_grams && (
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <Beef className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-lg font-bold">{activePlan.protein_grams}g</p>
                  <p className="text-xs text-orange-200">חלבון</p>
                </div>
              )}
              {activePlan.carbs_grams && (
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <Wheat className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-lg font-bold">{activePlan.carbs_grams}g</p>
                  <p className="text-xs text-orange-200">פחמימות</p>
                </div>
              )}
              {activePlan.fat_grams && (
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <Droplet className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-lg font-bold">{activePlan.fat_grams}g</p>
                  <p className="text-xs text-orange-200">שומן</p>
                </div>
              )}
              {activePlan.daily_water_ml && (
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <Droplets className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-lg font-bold">{(activePlan.daily_water_ml / 1000).toFixed(1)}L</p>
                  <p className="text-xs text-orange-200">מים</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">היסטוריית תפריטים</h3>
        </div>
        <div className="divide-y">
          {plans.filter((p) => p.id !== activePlan?.id).length === 0 ? (
            <div className="p-8 text-center text-gray-500">אין תפריטים נוספים</div>
          ) : (
            plans
              .filter((p) => p.id !== activePlan?.id)
              .map((plan) => (
                <div key={plan.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <h4 className="font-medium text-gray-900">{plan.name}</h4>
                    <p className="text-sm text-gray-500">
                      {new Date(plan.created_at).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onActivate(plan.id)}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors"
                    >
                      הפעל
                    </button>
                    <button
                      onClick={() => onEdit(plan)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                    >
                      ערוך
                    </button>
                    <button
                      onClick={() => onDelete(plan.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
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
}: PlanEditorViewProps) {
  const totals = calculateTotalMacros();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">הגדרות תפריט</h3>
          <div className="flex gap-2">
            <button
              onClick={onLoadTemplate}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors"
            >
              <Download className="h-4 w-4" />
              טען תבנית
            </button>
            <button
              onClick={onSaveAsTemplate}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
              <Upload className="h-4 w-4" />
              שמור כתבנית
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם התפריט</label>
            <input
              type="text"
              value={plan.name || ''}
              onChange={(e) => onUpdatePlan({ name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תיאור</label>
            <input
              type="text"
              value={plan.description || ''}
              onChange={(e) => onUpdatePlan({ description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="למשל: תפריט להורדת משקל"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Flame className="h-4 w-4 inline ml-1" />
              קלוריות
            </label>
            <input
              type="number"
              value={plan.daily_calories || ''}
              onChange={(e) => onUpdatePlan({ daily_calories: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Beef className="h-4 w-4 inline ml-1" />
              חלבון (גרם)
            </label>
            <input
              type="number"
              value={plan.protein_grams || ''}
              onChange={(e) => onUpdatePlan({ protein_grams: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Wheat className="h-4 w-4 inline ml-1" />
              פחמימות (גרם)
            </label>
            <input
              type="number"
              value={plan.carbs_grams || ''}
              onChange={(e) => onUpdatePlan({ carbs_grams: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Droplet className="h-4 w-4 inline ml-1" />
              שומן (גרם)
            </label>
            <input
              type="number"
              value={plan.fat_grams || ''}
              onChange={(e) => onUpdatePlan({ fat_grams: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Droplets className="h-4 w-4 inline ml-1" />
              מים (מ"ל)
            </label>
            <input
              type="number"
              value={plan.daily_water_ml || ''}
              onChange={(e) => onUpdatePlan({ daily_water_ml: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">הערות כלליות</label>
            <button
              onClick={onAddNote}
              className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              <FileText className="h-4 w-4" />
              הוסף מתבנית
            </button>
          </div>
          <textarea
            value={plan.notes || ''}
            onChange={(e) => onUpdatePlan({ notes: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            rows={3}
            placeholder="הערות כלליות לתפריט..."
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">ארוחות ({meals.length})</h3>
          <button
            onClick={onAddMeal}
            className="flex items-center gap-1 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-sm hover:bg-orange-200 transition-colors"
          >
            <Plus className="h-4 w-4" />
            הוסף ארוחה
          </button>
        </div>

        <div className="divide-y">
          {meals.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>אין ארוחות בתפריט</p>
              <p className="text-sm">לחץ על "הוסף ארוחה" להתחיל</p>
            </div>
          ) : (
            meals.map((meal, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => onDragStart(index)}
                onDragOver={(e) => onDragOver(e, index)}
                onDragEnd={onDragEnd}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => onToggleMeal(index)}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{meal.meal_time}</span>
                    <span className="text-gray-600">{getMealLabel(meal.meal_name)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {meal.calories && (
                      <span className="text-sm text-gray-500">{meal.calories} קל'</span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMeal(index);
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {expandedMeals.has(index) ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedMeals.has(index) && (
                  <div className="mt-4 space-y-4 pr-8">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">שעה</label>
                        <input
                          type="time"
                          value={meal.meal_time}
                          onChange={(e) => onUpdateMeal(index, 'meal_time', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">סוג ארוחה</label>
                        <select
                          value={meal.meal_name}
                          onChange={(e) => onUpdateMeal(index, 'meal_name', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        >
                          {MEAL_NAMES.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">תיאור האוכל</label>
                      <textarea
                        value={meal.description}
                        onChange={(e) => onUpdateMeal(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        rows={3}
                        placeholder="לדוגמה: 2 ביצים, 2 פרוסות לחם מלא, סלט ירקות..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">חלופות</label>
                      <textarea
                        value={meal.alternatives}
                        onChange={(e) => onUpdateMeal(index, 'alternatives', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        rows={2}
                        placeholder="אפשר להחליף ב..."
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">קלוריות</label>
                        <input
                          type="number"
                          value={meal.calories || ''}
                          onChange={(e) => onUpdateMeal(index, 'calories', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">חלבון</label>
                        <input
                          type="number"
                          value={meal.protein || ''}
                          onChange={(e) => onUpdateMeal(index, 'protein', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">פחמימות</label>
                        <input
                          type="number"
                          value={meal.carbs || ''}
                          onChange={(e) => onUpdateMeal(index, 'carbs', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">שומן</label>
                        <input
                          type="number"
                          value={meal.fat || ''}
                          onChange={(e) => onUpdateMeal(index, 'fat', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">הערות</label>
                      <input
                        type="text"
                        value={meal.notes}
                        onChange={(e) => onUpdateMeal(index, 'notes', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="הערות נוספות..."
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {meals.length > 0 && totals.calories > 0 && (
          <div className="p-4 bg-gray-50 border-t">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">סה"כ מארוחות:</span>
              <div className="flex gap-4 text-sm">
                <span>{totals.calories} קלוריות</span>
                <span>{totals.protein}g חלבון</span>
                <span>{totals.carbs}g פחמימות</span>
                <span>{totals.fat}g שומן</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl flex items-center gap-2 font-medium transition-colors"
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
    <div className="bg-white rounded-xl border border-gray-100">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">היסטוריית שינויים</h3>
      </div>
      <div className="divide-y">
        {history.length === 0 ? (
          <div className="p-8 text-center text-gray-500">אין היסטוריה</div>
        ) : (
          history.map((entry) => (
            <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div>
                <p className="font-medium text-gray-900">{entry.change_description}</p>
                <p className="text-sm text-gray-500">
                  {new Date(entry.changed_at).toLocaleString('he-IL')}
                </p>
              </div>
              <button
                onClick={() => onRestore(entry)}
                className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors"
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">תפריט חדש</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם התפריט *</label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              placeholder="לדוגמה: תפריט הורדת משקל"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תיאור</label>
            <input
              type="text"
              value={data.description}
              onChange={(e) => onChange({ ...data, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">יעד קלוריות יומי</label>
              <input
                type="number"
                value={data.daily_calories}
                onChange={(e) => onChange({ ...data, daily_calories: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">מים יומי (מ"ל)</label>
              <input
                type="number"
                value={data.daily_water_ml}
                onChange={(e) => onChange({ ...data, daily_water_ml: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">חלבון (גרם)</label>
              <input
                type="number"
                value={data.protein_grams}
                onChange={(e) => onChange({ ...data, protein_grams: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">פחמימות (גרם)</label>
              <input
                type="number"
                value={data.carbs_grams}
                onChange={(e) => onChange({ ...data, carbs_grams: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שומן (גרם)</label>
              <input
                type="number"
                value={data.fat_grams}
                onChange={(e) => onChange({ ...data, fat_grams: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">הערות כלליות</label>
            <textarea
              value={data.notes}
              onChange={(e) => onChange({ ...data, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              rows={3}
            />
          </div>
        </div>
        <div className="p-6 border-t flex gap-3">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium"
          >
            {saving ? 'יוצר...' : 'צור תפריט'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-medium"
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">שמור כתבנית</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">שם התבנית</label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
            placeholder="לדוגמה: תפריט 1800 קלוריות"
          />
        </div>
        <div className="p-6 border-t flex gap-3">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium"
          >
            {saving ? 'שומר...' : 'שמור תבנית'}
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-medium">
            ביטול
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold">טען מתבנית</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          {templates.length === 0 ? (
            <div className="text-center text-gray-500 py-8">אין תבניות שמורות</div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onLoad(template)}
                  className="w-full text-right p-4 border rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{template.name}</p>
                      {template.description && (
                        <p className="text-sm text-gray-500">{template.description}</p>
                      )}
                      <div className="flex gap-3 mt-2 text-xs text-gray-500">
                        {template.daily_calories && <span>{template.daily_calories} קל'</span>}
                        {template.protein_grams && <span>{template.protein_grams}g חלבון</span>}
                      </div>
                    </div>
                    <Copy className="h-5 w-5 text-gray-400" />
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold">הוסף הערה מתבנית</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className="w-full text-right p-4 border rounded-xl hover:bg-gray-50 transition-colors"
            >
              <p className="font-medium text-gray-900">{template.title}</p>
              <p className="text-sm text-gray-500 mt-1">{template.content}</p>
            </button>
          ))}
          <button
            onClick={onCreateNew}
            className="w-full p-4 border-2 border-dashed rounded-xl text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" />
            צור תבנית חדשה
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">תבנית הערה חדשה</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">כותרת</label>
            <input
              type="text"
              value={data.title}
              onChange={(e) => onChange({ ...data, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              placeholder="לדוגמה: שתיית מים"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תוכן ההערה</label>
            <textarea
              value={data.content}
              onChange={(e) => onChange({ ...data, content: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              rows={3}
              placeholder="לדוגמה: שתה כוס מים לפני כל ארוחה"
            />
          </div>
        </div>
        <div className="p-6 border-t flex gap-3">
          <button
            onClick={onSave}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-medium"
          >
            שמור תבנית
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-medium">
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
