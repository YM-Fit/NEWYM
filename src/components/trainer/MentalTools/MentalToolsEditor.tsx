import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import {
  ArrowRight,
  Plus,
  Brain,
  Target,
  Clock,
  Zap,
  Heart,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Star,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface MentalToolsEditorProps {
  traineeId: string;
  traineeName: string;
  onBack: () => void;
}

interface MentalTool {
  id: string;
  trainee_id: string;
  trainer_id: string;
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

const templates = [
  { title: 'לשתות 8 כוסות מים ביום', category: 'discipline' as const, priority: 4 },
  { title: 'לישון 7-8 שעות בלילה', category: 'discipline' as const, priority: 5 },
  { title: 'להכין אוכל מראש ליום למחרת', category: 'discipline' as const, priority: 4 },
  { title: 'לא לאכול מול מסכים', category: 'focus' as const, priority: 3 },
  { title: 'לנשום עמוק לפני ארוחה', category: 'patience' as const, priority: 3 },
  { title: 'לרשום את כל הארוחות ביומן', category: 'discipline' as const, priority: 4 },
  { title: 'ללכת 10,000 צעדים ביום', category: 'motivation' as const, priority: 4 },
  { title: 'לאכול לאט ולהנות מהאוכל', category: 'patience' as const, priority: 3 },
  { title: 'להימנע מחטיפים בין הארוחות', category: 'discipline' as const, priority: 4 },
  { title: 'לתכנן את הארוחות לשבוע מראש', category: 'focus' as const, priority: 5 },
  { title: 'לצפות בסרטון מוטיבציה בבוקר', category: 'motivation' as const, priority: 2 },
  { title: 'לכתוב 3 דברים שעשיתי נכון היום', category: 'motivation' as const, priority: 3 },
];

const getCategoryStyle = (category: string) => {
  switch (category) {
    case 'motivation':
      return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', badge: 'bg-rose-100' };
    case 'discipline':
      return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100' };
    case 'patience':
      return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100' };
    case 'focus':
      return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100' };
    default:
      return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-100' };
  }
};

const getCategoryIcon = (category: string) => {
  const found = categories.find(c => c.value === category);
  return found?.icon || Brain;
};

const getCategoryLabel = (category: string) => {
  const found = categories.find(c => c.value === category);
  return found?.label || 'אחר';
};

export default function MentalToolsEditor({ traineeId, traineeName, onBack }: MentalToolsEditorProps) {
  const { user } = useAuth();
  const [tools, setTools] = useState<MentalTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingTool, setEditingTool] = useState<MentalTool | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other' as MentalTool['category'],
    priority: 3,
  });

  useEffect(() => {
    loadTools();
  }, [traineeId]);

  const loadTools = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('mental_tools')
      .select('*')
      .eq('trainee_id', traineeId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('שגיאה בטעינת הכלים');
    } else {
      setTools(data || []);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user || !formData.title.trim()) {
      toast.error('יש להזין כותרת');
      return;
    }

    if (editingTool) {
      const { error } = await supabase
        .from('mental_tools')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          category: formData.category,
          priority: formData.priority,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingTool.id);

      if (error) {
        toast.error('שגיאה בעדכון הכלי');
      } else {
        toast.success('הכלי עודכן בהצלחה');
        setEditingTool(null);
        setShowAddForm(false);
        resetForm();
        await loadTools();
      }
    } else {
      const { error } = await supabase.from('mental_tools').insert([
        {
          trainee_id: traineeId,
          trainer_id: user.id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          category: formData.category,
          priority: formData.priority,
        },
      ]);

      if (error) {
        toast.error('שגיאה בהוספת הכלי');
      } else {
        toast.success('הכלי נוסף בהצלחה');
        setShowAddForm(false);
        resetForm();
        await loadTools();
      }
    }
  };

  const handleDelete = async (toolId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק כלי זה?')) return;

    const { error } = await supabase.from('mental_tools').delete().eq('id', toolId);

    if (error) {
      toast.error('שגיאה במחיקת הכלי');
    } else {
      toast.success('הכלי נמחק');
      setOpenMenuId(null);
      await loadTools();
    }
  };

  const handleToggleComplete = async (tool: MentalTool) => {
    const { error } = await supabase
      .from('mental_tools')
      .update({
        is_completed: !tool.is_completed,
        completed_at: !tool.is_completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tool.id);

    if (error) {
      toast.error('שגיאה בעדכון הסטטוס');
    } else {
      await loadTools();
    }
  };

  const handleAddFromTemplate = async (template: typeof templates[0]) => {
    if (!user) return;

    const { error } = await supabase.from('mental_tools').insert([
      {
        trainee_id: traineeId,
        trainer_id: user.id,
        title: template.title,
        category: template.category,
        priority: template.priority,
      },
    ]);

    if (error) {
      toast.error('שגיאה בהוספת הכלי');
    } else {
      toast.success('הכלי נוסף בהצלחה');
      await loadTools();
    }
  };

  const handleEdit = (tool: MentalTool) => {
    setEditingTool(tool);
    setFormData({
      title: tool.title,
      description: tool.description || '',
      category: tool.category,
      priority: tool.priority,
    });
    setShowAddForm(true);
    setOpenMenuId(null);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'other',
      priority: 3,
    });
    setEditingTool(null);
  };

  const filteredTools = filterCategory === 'all'
    ? tools
    : tools.filter(t => t.category === filterCategory);

  const activeTools = filteredTools.filter(t => !t.is_completed);
  const completedTools = filteredTools.filter(t => t.is_completed);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowRight className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">כלים מנטליים</h1>
            <p className="text-gray-600">{traineeName}</p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(true);
          }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          הוסף כלי
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            filterCategory === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          הכל ({tools.length})
        </button>
        {categories.map(cat => {
          const count = tools.filter(t => t.category === cat.value).length;
          const Icon = cat.icon;
          return (
            <button
              key={cat.value}
              onClick={() => setFilterCategory(cat.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                filterCategory === cat.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {editingTool ? 'עריכת כלי מנטלי' : 'הוספת כלי מנטלי חדש'}
            </h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                resetForm();
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">כותרת *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="לדוגמה: לשתות 8 כוסות מים ביום"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תיאור</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="הסבר מפורט מה המתאמן צריך לעשות..."
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">קטגוריה</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as MentalTool['category'] })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">עדיפות (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: num })}
                      className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                        formData.priority === num
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Star className={`w-5 h-5 mx-auto ${formData.priority >= num ? 'fill-current' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Check className="w-5 h-5" />
                {editingTool ? 'עדכן' : 'הוסף'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-right">
              <h3 className="font-bold text-gray-900">תבניות מוכנות</h3>
              <p className="text-sm text-gray-500">לחץ להוספה מהירה מרשימת תבניות</p>
            </div>
          </div>
          {showTemplates ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showTemplates && (
          <div className="border-t p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {templates.map((template, index) => {
                const style = getCategoryStyle(template.category);
                const isAdded = tools.some(t => t.title === template.title);
                return (
                  <button
                    key={index}
                    onClick={() => !isAdded && handleAddFromTemplate(template)}
                    disabled={isAdded}
                    className={`p-3 rounded-lg text-right flex items-center justify-between transition-all ${
                      isAdded
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : `${style.bg} ${style.border} border hover:shadow-md`
                    }`}
                  >
                    <span className={isAdded ? 'line-through' : style.text}>{template.title}</span>
                    {isAdded ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Plus className={`w-5 h-5 ${style.text} flex-shrink-0`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {activeTools.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-gray-900">כלים פעילים ({activeTools.length})</h3>
          {activeTools.map(tool => (
            <ToolCard
              key={tool.id}
              tool={tool}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleComplete={handleToggleComplete}
            />
          ))}
        </div>
      )}

      {completedTools.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-gray-500">הושלמו ({completedTools.length})</h3>
          {completedTools.map(tool => (
            <ToolCard
              key={tool.id}
              tool={tool}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleComplete={handleToggleComplete}
            />
          ))}
        </div>
      )}

      {tools.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-700 mb-2">אין כלים מנטליים</h3>
          <p className="text-gray-500 mb-4">הוסף כלים מנטליים כדי לעזור למתאמן להתמקד ביעדים</p>
          <button
            onClick={() => setShowTemplates(true)}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            עיין בתבניות המוכנות
          </button>
        </div>
      )}
    </div>
  );
}

interface ToolCardProps {
  tool: MentalTool;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onEdit: (tool: MentalTool) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (tool: MentalTool) => void;
}

function ToolCard({ tool, openMenuId, setOpenMenuId, onEdit, onDelete, onToggleComplete }: ToolCardProps) {
  const style = getCategoryStyle(tool.category);
  const Icon = getCategoryIcon(tool.category);

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        tool.is_completed
          ? 'bg-gray-50 border-gray-200 opacity-60'
          : `${style.bg} ${style.border}`
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggleComplete(tool)}
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            tool.is_completed
              ? 'bg-green-500 text-white'
              : 'bg-white border-2 border-gray-300 hover:border-green-500'
          }`}
        >
          {tool.is_completed && <Check className="w-5 h-5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={`font-bold ${tool.is_completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                {tool.title}
              </h4>
              {tool.description && (
                <p className={`text-sm mt-1 ${tool.is_completed ? 'text-gray-400' : 'text-gray-600'}`}>
                  {tool.description}
                </p>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setOpenMenuId(openMenuId === tool.id ? null : tool.id)}
                className="p-2 hover:bg-white/50 rounded-lg"
              >
                <MoreVertical className="w-5 h-5 text-gray-500" />
              </button>

              {openMenuId === tool.id && (
                <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border z-10 py-1 min-w-[140px]">
                  <button
                    onClick={() => onEdit(tool)}
                    className="w-full px-4 py-2 text-right flex items-center gap-2 hover:bg-gray-50"
                  >
                    <Edit2 className="w-4 h-4" />
                    עריכה
                  </button>
                  <button
                    onClick={() => onDelete(tool.id)}
                    className="w-full px-4 py-2 text-right flex items-center gap-2 hover:bg-gray-50 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                    מחיקה
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${style.badge} ${style.text}`}>
              <Icon className="w-3 h-3" />
              {getCategoryLabel(tool.category)}
            </div>

            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(num => (
                <Star
                  key={num}
                  className={`w-3 h-3 ${
                    num <= tool.priority
                      ? 'text-amber-500 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>

            {tool.is_completed && tool.completed_at && (
              <span className="text-xs text-gray-400">
                הושלם: {new Date(tool.completed_at).toLocaleDateString('he-IL')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
