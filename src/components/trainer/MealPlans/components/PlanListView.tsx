import { Plus, Trash2, Flame, Beef, Wheat, Droplet, Droplets } from 'lucide-react';
import type { MealPlan } from '../types/mealPlanTypes';

interface PlanListViewProps {
  plans: MealPlan[];
  activePlan: MealPlan | null;
  onActivate: (planId: string) => void;
  onEdit: (plan: MealPlan) => void;
  onDelete: (planId: string) => void;
  onCreateNew: () => void;
}

export function PlanListView({ plans, activePlan, onActivate, onEdit, onDelete, onCreateNew }: PlanListViewProps) {
  return (
    <div className="space-y-6">
      <button
        onClick={onCreateNew}
        className="w-full bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white py-4 rounded-2xl flex items-center justify-center gap-3 font-semibold transition-all duration-300 shadow-xl shadow-primary-500/25 hover:shadow-2xl hover:shadow-primary-500/30 hover:scale-[1.01]"
      >
        <Plus className="h-5 w-5" />
        צור תפריט חדש
      </button>

      {activePlan && (
        <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-8 text-white shadow-xl shadow-primary-500/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="bg-white/20 text-xs px-3 py-1.5 rounded-xl font-semibold">תפריט פעיל</span>
              <h3 className="text-2xl font-bold mt-3 text-white">{activePlan.name}</h3>
              {activePlan.description && <p className="text-white/70 text-sm mt-2">{activePlan.description}</p>}
            </div>
            <button
              onClick={() => onEdit(activePlan)}
              className="bg-white/20 hover:bg-white/30 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 hover:scale-105 text-white"
            >
              ערוך
            </button>
          </div>

          {(activePlan.daily_calories || activePlan.protein_grams) && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
              {activePlan.daily_calories && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center hover:bg-white/20 transition-all duration-300">
                  <Flame className="h-6 w-6 mx-auto mb-2 text-white" />
                  <p className="text-xl font-bold text-white">{activePlan.daily_calories}</p>
                  <p className="text-xs text-white/60">קלוריות</p>
                </div>
              )}
              {activePlan.protein_grams && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center hover:bg-white/20 transition-all duration-300">
                  <Beef className="h-6 w-6 mx-auto mb-2 text-white" />
                  <p className="text-xl font-bold text-white">{activePlan.protein_grams}ג</p>
                  <p className="text-xs text-white/60">חלבון</p>
                </div>
              )}
              {activePlan.carbs_grams && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center hover:bg-white/20 transition-all duration-300">
                  <Wheat className="h-6 w-6 mx-auto mb-2 text-white" />
                  <p className="text-xl font-bold text-white">{activePlan.carbs_grams}ג</p>
                  <p className="text-xs text-white/60">פחמימות</p>
                </div>
              )}
              {activePlan.fat_grams && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center hover:bg-white/20 transition-all duration-300">
                  <Droplet className="h-6 w-6 mx-auto mb-2 text-white" />
                  <p className="text-xl font-bold text-white">{activePlan.fat_grams}ג</p>
                  <p className="text-xs text-white/60">שומן</p>
                </div>
              )}
              {activePlan.daily_water_ml && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center hover:bg-white/20 transition-all duration-300">
                  <Droplets className="h-6 w-6 mx-auto mb-2 text-white" />
                  <p className="text-xl font-bold text-white">{(activePlan.daily_water_ml / 1000).toFixed(1)} ליטר</p>
                  <p className="text-xs text-white/60">מים</p>
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
                <div key={plan.id} className="p-5 flex items-center justify-between hover:bg-[var(--color-bg-surface)] transition-all duration-300">
                  <div>
                    <h4 className="font-semibold text-[var(--color-text-primary)]">{plan.name}</h4>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {new Date(plan.created_at).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => onActivate(plan.id)}
                      className="px-4 py-2 bg-primary-500/20 text-primary-400 rounded-xl text-sm font-semibold hover:bg-primary-500/30 transition-all duration-300 hover:scale-105"
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
