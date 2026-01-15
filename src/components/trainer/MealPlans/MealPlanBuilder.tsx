import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ArrowRight, History, UtensilsCrossed } from 'lucide-react';
import type { MealPlanBuilderProps } from './types/mealPlanTypes';
import type { MealPlanTemplate, NoteTemplate } from './types/mealPlanTypes';
import { useMealPlan } from './hooks/useMealPlan';
import { useMealPlanTemplates } from './hooks/useMealPlanTemplates';
import { useMealPlanHistory } from './hooks/useMealPlanHistory';
import { useMealPlanFoodItems } from './hooks/useMealPlanFoodItems';
import { PlanListView } from './components/PlanListView';
import { PlanEditorView } from './components/PlanEditorView';
import { HistoryView } from './components/HistoryView';
import { CreatePlanModal } from './components/CreatePlanModal';
import { SaveTemplateModal } from './components/SaveTemplateModal';
import { LoadTemplateModal } from './components/LoadTemplateModal';
import { NoteTemplateModal } from './components/NoteTemplateModal';
import { CreateNoteTemplateModal } from './components/CreateNoteTemplateModal';

export default function MealPlanBuilder({
  traineeId,
  traineeName,
  trainerId,
  onBack,
}: MealPlanBuilderProps) {
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

  const {
    plans,
    activePlan,
    meals,
    loading,
    setLoading,
    setActivePlan,
    setMeals,
    loadPlans,
    loadMeals,
    createPlan,
    updatePlan,
    activatePlan,
    deletePlan,
    addMeal,
    updateMeal,
    deleteMeal,
    saveMeals,
    getMealLabel,
    calculateTotalMacros,
  } = useMealPlan(traineeId, trainerId);

  const {
    templates,
    noteTemplates,
    loadTemplates,
    loadNoteTemplates,
    saveTemplate,
    createNoteTemplate,
  } = useMealPlanTemplates(trainerId);

  const { history, loadHistory, saveToHistory } = useMealPlanHistory(traineeId);

  const { debouncedUpdateFoodItem } = useMealPlanFoodItems(meals, setMeals);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadPlans(),
        loadTemplates(),
        loadNoteTemplates(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [traineeId, loadPlans, loadTemplates, loadNoteTemplates, setLoading]);

  const handleCreatePlan = async () => {
    if (!newPlanData.name.trim()) {
      toast.error('נא להזין שם לתפריט');
      return;
    }

    const planData = {
      name: newPlanData.name,
      description: newPlanData.description || null,
      daily_calories: newPlanData.daily_calories ? parseInt(newPlanData.daily_calories) : null,
      daily_water_ml: newPlanData.daily_water_ml ? parseInt(newPlanData.daily_water_ml) : null,
      protein_grams: newPlanData.protein_grams ? parseInt(newPlanData.protein_grams) : null,
      carbs_grams: newPlanData.carbs_grams ? parseInt(newPlanData.carbs_grams) : null,
      fat_grams: newPlanData.fat_grams ? parseInt(newPlanData.fat_grams) : null,
      notes: newPlanData.notes || null,
    };

    const created = await createPlan(planData);
    if (created) {
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
      setView('editor');
    }
  };

  const handleSaveMeals = async () => {
    if (!activePlan) return;

    const saved = await saveMeals(activePlan.id, async (description: string) => {
      const snapshot = {
        plan: activePlan,
        meals: meals,
      };
      await saveToHistory(activePlan.id, description, snapshot);
    });

    if (saved) {
      // Meals already saved and reloaded in saveMeals
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!activePlan) return;

    const saved = await saveTemplate(templateName, activePlan, meals);
    if (saved) {
      setShowTemplateModal(false);
      setTemplateName('');
    }
  };

  const handleLoadFromTemplate = async (template: MealPlanTemplate) => {
    if (!activePlan) return;

    await updatePlan(activePlan.id, {
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
    updatePlan(activePlan.id, { notes: newNotes });
    setShowNoteTemplateModal(false);
    toast.success('Note added');
  };

  const handleCreateNoteTemplate = async () => {
    const created = await createNoteTemplate(newNoteTemplate.title, newNoteTemplate.content);
    if (created) {
      setShowNewNoteTemplateModal(false);
      setNewNoteTemplate({ title: '', content: '' });
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

  const handleActivatePlan = async (planId: string) => {
    await activatePlan(planId);
  };

  const handleDeletePlan = async (planId: string) => {
    const deleted = await deletePlan(planId);
    if (deleted && activePlan?.id === planId) {
      setView('list');
    }
  };

  const handleEditPlan = (plan: typeof activePlan) => {
    if (!plan) return;
    setActivePlan(plan);
    loadMeals(plan.id);
    setView('editor');
  };

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
          onEdit={handleEditPlan}
          onDelete={handleDeletePlan}
          onCreateNew={() => setShowCreateForm(true)}
        />
      )}

      {view === 'editor' && activePlan && (
        <PlanEditorView
          plan={activePlan}
          meals={meals}
          expandedMeals={expandedMeals}
          saving={false}
          onUpdatePlan={(updates) => updatePlan(activePlan.id, updates)}
          onAddMeal={addMeal}
          onUpdateMeal={updateMeal}
          onDeleteMeal={deleteMeal}
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
          saving={false}
          onChange={setNewPlanData}
          onSave={handleCreatePlan}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {showTemplateModal && (
        <SaveTemplateModal
          templateName={templateName}
          saving={false}
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
