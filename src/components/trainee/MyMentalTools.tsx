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
        bg: 'bg-gradient-to-br from-rose-50 to-rose-100',
        border: 'border-rose-200',
        text: 'text-rose-700',
        badge: 'bg-rose-200',
        icon: 'bg-rose-500',
      };
    case 'discipline':
      return {
        bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
        border: 'border-blue-200',
        text: 'text-blue-700',
        badge: 'bg-blue-200',
        icon: 'bg-blue-500',
      };
    case 'patience':
      return {
        bg: 'bg-gradient-to-br from-amber-50 to-amber-100',
        border: 'border-amber-200',
        text: 'text-amber-700',
        badge: 'bg-amber-200',
        icon: 'bg-amber-500',
      };
    case 'focus':
      return {
        bg: 'bg-gradient-to-br from-green-50 to-green-100',
        border: 'border-green-200',
        text: 'text-green-700',
        badge: 'bg-green-200',
        icon: 'bg-green-500',
      };
    default:
      return {
        bg: 'bg-gradient-to-br from-slate-50 to-slate-100',
        border: 'border-slate-200',
        text: 'text-slate-700',
        badge: 'bg-slate-200',
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
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-600 border-t-transparent"></div>
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
          <Brain className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-2xl font-bold text-gray-700 mb-2">אין כלים מנטליים</h3>
        <p className="text-sm text-gray-500">המאמן שלך עדיין לא הגדיר כלים מנטליים</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div className="text-white">
            <h2 className="text-2xl font-bold">כלים מנטליים</h2>
            <p className="text-emerald-100">המשימות שלי להצלחה</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border-2 border-emerald-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="text-3xl font-bold text-emerald-600">{activeTools.length}</div>
          <div className="text-sm text-emerald-700 font-medium">פעילים</div>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="text-3xl font-bold text-gray-600">{completedTools.length}</div>
          <div className="text-sm text-gray-500 font-medium">הושלמו</div>
        </div>
      </div>

      {activeTools.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 text-lg">כלים פעילים</h3>
          {activeTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}

      {completedTools.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-gray-500 text-lg flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-200 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
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
      className={`rounded-2xl border-2 p-5 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
        tool.is_completed
          ? 'bg-gray-50 border-gray-200 opacity-70'
          : `${style.bg} ${style.border} shadow-lg`
      }`}
    >
      <div className="flex gap-4">
        <div
          className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
            tool.is_completed ? 'bg-gray-300' : style.icon
          }`}
        >
          {tool.is_completed ? (
            <CheckCircle className="w-7 h-7 text-white" />
          ) : (
            <Icon className="w-7 h-7 text-white" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4
            className={`font-bold text-lg ${
              tool.is_completed ? 'text-gray-500 line-through' : 'text-gray-900'
            }`}
          >
            {tool.title}
          </h4>

          {tool.description && (
            <p
              className={`text-sm mt-1 leading-relaxed ${
                tool.is_completed ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              {tool.description}
            </p>
          )}

          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 shadow-sm ${
                tool.is_completed ? 'bg-gray-200 text-gray-500' : `${style.badge} ${style.text}`
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
                        ? 'text-gray-400 fill-current'
                        : 'text-amber-500 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {tool.is_completed && tool.completed_at && (
            <div className="mt-3 text-xs text-gray-400 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg w-fit">
              <CheckCircle className="w-3 h-3" />
              הושלם: {new Date(tool.completed_at).toLocaleDateString('he-IL')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
