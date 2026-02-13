import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Brain,
  Target,
  Clock,
  Zap,
  Heart,
  Star,
  CheckCircle,
  Sparkles,
} from 'lucide-react';

interface MyMentalToolsProps {
  traineeId: string | null;
}

interface MentalTool {
  id: string;
  title: string;
  description: string | null;
  category: 'motivation' | 'discipline' | 'patience' | 'focus' | 'other';
  priority: number;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
}

const categories = [
  { value: 'motivation', label: 'מוטיבציה', icon: Heart, color: 'rose' },
  { value: 'discipline', label: 'משמעת', icon: Target, color: 'blue' },
  { value: 'patience', label: 'סבלנות', icon: Clock, color: 'amber' },
  { value: 'focus', label: 'מיקוד', icon: Zap, color: 'green' },
  { value: 'other', label: 'אחר', icon: Brain, color: 'slate' },
] as const;

const getCategoryStyle = (category: string) => {
  switch (category) {
    case 'motivation':
      return {
        bg: 'bg-gradient-to-br from-rose-500/15 to-rose-500/8',
        border: 'border-rose-500/30',
        text: 'text-rose-400',
        badge: 'bg-rose-500/20',
        icon: 'bg-rose-500',
      };
    case 'discipline':
      return {
        bg: 'bg-gradient-to-br from-blue-500/15 to-blue-500/8',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        badge: 'bg-blue-500/20',
        icon: 'bg-blue-500',
      };
    case 'patience':
      return {
        bg: 'bg-gradient-to-br from-amber-500/15 to-amber-500/8',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        badge: 'bg-amber-500/20',
        icon: 'bg-amber-500',
      };
    case 'focus':
      return {
        bg: 'bg-gradient-to-br from-emerald-500/15 to-emerald-500/8',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        badge: 'bg-emerald-500/20',
        icon: 'bg-emerald-500',
      };
    default:
      return {
        bg: 'bg-gradient-to-br from-slate-500/15 to-slate-500/8',
        border: 'border-slate-500/30',
        text: 'text-slate-400',
        badge: 'bg-slate-500/20',
        icon: 'bg-slate-500',
      };
  }
};

const getCategoryIcon = (category: string) => {
  const found = categories.find((c) => c.value === category);
  return found?.icon || Brain;
};

const getCategoryLabel = (category: string) => {
  const found = categories.find((c) => c.value === category);
  return found?.label || 'אחר';
};

export default function MyMentalTools({ traineeId }: MyMentalToolsProps) {
  const [tools, setTools] = useState<MentalTool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (traineeId) {
      loadTools();
    }
  }, [traineeId]);

  const loadTools = async () => {
    if (!traineeId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('mental_tools')
      .select('*')
      .eq('trainee_id', traineeId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTools(data);
    }
    setLoading(false);
  };

  const activeTools = tools.filter((t) => !t.is_completed);
  const completedTools = tools.filter((t) => t.is_completed);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 flex items-center justify-center shadow-glow animate-float border border-white/10">
          <Brain className="w-8 h-8 text-foreground" />
        </div>
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-emerald-500/20">
          <Brain className="w-10 h-10 text-emerald-400" />
        </div>
        <h3 className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)] mb-2">אין כלים מנטליים</h3>
        <p className="text-sm text-[var(--color-text-muted)]">המאמן שלך עדיין לא הגדיר כלים מנטליים</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-7 h-7 text-foreground" />
          </div>
          <div className="text-foreground">
            <h2 className="text-2xl font-bold">כלים מנטליים</h2>
            <p className="text-emerald-100">המשימות שלי להצלחה</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card p-4 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 hover:shadow-card-hover transition-all duration-300">
          <div className="text-3xl font-bold text-emerald-400">{activeTools.length}</div>
          <div className="text-sm text-[var(--color-text-secondary)] font-medium">פעילים</div>
        </div>
        <div className="stat-card p-4 bg-gradient-to-br from-[var(--color-bg-surface)] to-[var(--color-bg-elevated)] border border-[var(--color-border)] hover:shadow-card-hover transition-all duration-300">
          <div className="text-3xl font-bold text-[var(--color-text-muted)]">{completedTools.length}</div>
          <div className="text-sm text-[var(--color-text-muted)] font-medium">הושלמו</div>
        </div>
      </div>

      {activeTools.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-[var(--color-text-primary)] text-lg">כלים פעילים</h3>
          {activeTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}

      {completedTools.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-[var(--color-text-muted)] text-lg flex items-center gap-2">
            <div className="w-6 h-6 bg-[var(--color-bg-surface)] rounded-lg flex items-center justify-center border border-[var(--color-border)]">
              <CheckCircle className="w-4 h-4 text-[var(--color-text-muted)]" />
            </div>
            הושלמו
          </h3>
          {completedTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ToolCardProps {
  tool: MentalTool;
}

function ToolCard({ tool }: ToolCardProps) {
  const style = getCategoryStyle(tool.category);
  const Icon = getCategoryIcon(tool.category);

  return (
    <div
      className={`premium-card-static rounded-2xl border-2 p-5 transition-all duration-300 hover:shadow-card-hover ${
        tool.is_completed
          ? 'bg-[var(--color-bg-surface)] border-[var(--color-border)] opacity-70'
          : `${style.bg} ${style.border}`
      }`}
    >
      <div className="flex gap-4">
        <div
          className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
            tool.is_completed ? 'bg-[var(--color-bg-elevated)]' : style.icon
          }`}
        >
          {tool.is_completed ? (
            <CheckCircle className="w-7 h-7 text-[var(--color-text-muted)]" />
          ) : (
            <Icon className="w-7 h-7 text-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4
            className={`font-bold text-lg ${
              tool.is_completed ? 'text-[var(--color-text-muted)] line-through' : 'text-[var(--color-text-primary)]'
            }`}
          >
            {tool.title}
          </h4>

          {tool.description && (
            <p
              className={`text-sm mt-1 leading-relaxed ${
                tool.is_completed ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-secondary)]'
              }`}
            >
              {tool.description}
            </p>
          )}

          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 shadow-sm ${
                tool.is_completed ? 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]' : `${style.badge} ${style.text}`
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {getCategoryLabel(tool.category)}
            </div>

            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((num) => (
                <Star
                  key={num}
                  className={`w-4 h-4 transition-all duration-300 ${
                    num <= tool.priority
                      ? tool.is_completed
                        ? 'text-[var(--color-text-muted)] fill-current'
                        : 'text-amber-400 fill-current'
                      : 'text-[var(--color-text-muted)]'
                  }`}
                />
              ))}
            </div>
          </div>

          {tool.is_completed && tool.completed_at && (
            <div className="mt-3 text-xs text-[var(--color-text-muted)] flex items-center gap-1 bg-[var(--color-bg-surface)] px-2 py-1 rounded-lg w-fit border border-[var(--color-border)]">
              <CheckCircle className="w-3 h-3" />
              הושלם: {new Date(tool.completed_at).toLocaleDateString('he-IL')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
