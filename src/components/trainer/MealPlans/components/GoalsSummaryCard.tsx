import { Flame, Beef, Wheat, Droplet, Droplets } from 'lucide-react';
import type { MealPlan } from '../types/mealPlanTypes';

interface GoalsSummaryCardProps {
  plan: MealPlan;
  totals: { calories: number; protein: number; carbs: number; fat: number };
  /** Optional: callback for future "Calculate by TDEE" button */
  onCalculateTdee?: () => void;
}

function ProgressBar({
  label,
  current,
  goal,
  colorClass,
  icon: Icon,
}: {
  label: string;
  current: number;
  goal: number;
  colorClass: string;
  icon: React.ElementType;
}) {
  const percent = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const statusClass =
    percent > 110
      ? 'bg-red-500'
      : percent > 100
        ? 'bg-yellow-500'
        : colorClass;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
          {Icon && <Icon className="h-3 w-3" />}
          {label}
        </span>
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">
          {current} / {goal}
        </span>
      </div>
      <div className="w-full bg-[var(--color-bg-surface)] rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${statusClass}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function GoalsSummaryCard({ plan, totals, onCalculateTdee }: GoalsSummaryCardProps) {
  return (
    <div className="premium-card-static p-5 rounded-2xl border border-[var(--color-border)] shadow-sm bg-gradient-to-r from-primary-500/10 to-primary-600/10">
      <div className="flex items-center justify-between mb-4">
        <span className="font-semibold text-[var(--color-text-primary)]">סיכום יומי כולל</span>
        <div className="flex flex-wrap gap-3 sm:gap-6 text-sm">
          <span className="text-[var(--color-text-secondary)]">
            <span className="text-primary-500 font-semibold">{totals.calories}</span>{' '}
            <span className="text-[var(--color-text-muted)]">קלוריות</span>
          </span>
          <span className="text-[var(--color-text-secondary)]">
            <span className="text-red-500 font-semibold">{totals.protein}ג</span>{' '}
            <span className="text-[var(--color-text-muted)]">חלבון</span>
          </span>
          <span className="text-[var(--color-text-secondary)]">
            <span className="text-blue-500 font-semibold">{totals.carbs}ג</span>{' '}
            <span className="text-[var(--color-text-muted)]">פחמימות</span>
          </span>
          <span className="text-[var(--color-text-secondary)]">
            <span className="text-amber-600 font-semibold">{totals.fat}ג</span>{' '}
            <span className="text-[var(--color-text-muted)]">שומן</span>
          </span>
        </div>
      </div>

      {(plan.daily_calories || plan.protein_grams || plan.carbs_grams || plan.fat_grams) && (
        <div className="space-y-3">
          {plan.daily_calories && (
            <ProgressBar
              label="קלוריות"
              current={totals.calories}
              goal={plan.daily_calories}
              colorClass="bg-primary-500"
              icon={Flame}
            />
          )}
          {plan.protein_grams && (
            <ProgressBar
              label="חלבון"
              current={totals.protein}
              goal={plan.protein_grams}
              colorClass="bg-red-400"
              icon={Beef}
            />
          )}
          {plan.carbs_grams && (
            <ProgressBar
              label="פחמימות"
              current={totals.carbs}
              goal={plan.carbs_grams}
              colorClass="bg-blue-400"
              icon={Wheat}
            />
          )}
          {plan.fat_grams && (
            <ProgressBar
              label="שומן"
              current={totals.fat}
              goal={plan.fat_grams}
              colorClass="bg-amber-500"
              icon={Droplet}
            />
          )}
        </div>
      )}

      {plan.daily_water_ml && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)] flex items-center gap-1">
              <Droplets className="h-4 w-4 text-blue-400" />
              יעד מים
            </span>
            <span className="font-semibold text-[var(--color-text-primary)]">
              {plan.daily_water_ml} מ״ל
            </span>
          </div>
        </div>
      )}

      {onCalculateTdee && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <button
            onClick={onCalculateTdee}
            className="w-full px-4 py-2.5 bg-primary-500/20 text-primary-400 rounded-xl text-sm font-semibold hover:bg-primary-500/30 transition-all"
          >
            חשב מאקרו לפי TDEE
          </button>
        </div>
      )}
    </div>
  );
}
