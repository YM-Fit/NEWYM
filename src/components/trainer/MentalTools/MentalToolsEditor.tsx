import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfirmDialog } from '../../../hooks/useConfirmDialog';
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
  Star,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';
import { MentalTool } from '../../../api/mentalToolsApi';
import {
  useMentalToolsQuery,
  useCreateMentalToolMutation,
  useUpdateMentalToolMutation,
  useDeleteMentalToolMutation,
  useToggleMentalToolCompleteMutation,
} from '../../../hooks/queries/useMentalToolQueries';

interface MentalToolsEditorProps {
  traineeId: string;
  traineeName: string;
  onBack: () => void;
}

const categories = [
  { value: 'motivation', label: 'מוטיבציה', icon: Heart, color: 'rose' },
  { value: 'discipline', label: 'משמעת', icon: Target, color: 'blue' },
  { value: 'patience', label: 'סבלנות', icon: Clock, color: 'amber' },
  { value: 'focus', label: 'מיקוד', icon: Zap, color: 'emerald' },
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
      return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', badge: 'bg-rose-100', gradient: 'from-rose-500 to-pink-600' };
    case 'discipline':
      return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100', gradient: 'from-blue-500 to-blue-600' };
    case 'patience':
      return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100', gradient: 'from-amber-500 to-orange-600' };
    case 'focus':
      return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100', gradient: 'from-emerald-500 to-emerald-700' };
    default:
      return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-100', gradient: 'from-slate-500 to-gray-600' };
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
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const { data: tools = [], isLoading: loading } = useMentalToolsQuery(traineeId);
  const createMutation = useCreateMentalToolMutation();
  const updateMutation = useUpdateMentalToolMutation(traineeId);
  const deleteMutation = useDeleteMentalToolMutation(traineeId);
  const toggleCompleteMutation = useToggleMentalToolCompleteMutation(traineeId);

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

  const resetForm = useCallback(() => {
    setFormData({
      title: '',
      description: '',
      category: 'other',
      priority: 3,
    });
    setEditingTool(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!user || !formData.title.trim()) {
      toast.error('יש להזין כותרת');
      return;
    }

    try {
      if (editingTool) {
        await updateMutation.mutateAsync({
          toolId: editingTool.id,
          updates: {
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            category: formData.category,
            priority: formData.priority,
          },
        });
        toast.success('הכלי עודכן בהצלחה');
        setEditingTool(null);
      } else {
        await createMutation.mutateAsync({
          trainee_id: traineeId,
          trainer_id: user.id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          category: formData.category,
          priority: formData.priority,
        });
        toast.success('הכלי נוסף בהצלחה');
      }
      setShowAddForm(false);
      resetForm();
    } catch (error) {
      logger.error('Error saving mental tool', error, 'MentalToolsEditor');
      toast.error(editingTool ? 'שגיאה בעדכון הכלי' : 'שגיאה בהוספת הכלי');
    }
  }, [user, formData, editingTool, traineeId, createMutation, updateMutation, resetForm]);

  const handleDelete = useCallback(async (toolId: string) => {
    const ok = await confirm({
      title: 'מחיקת כלי',
      message: 'האם אתה בטוח שברצונך למחוק כלי זה?',
      confirmText: 'מחק',
    });
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(toolId);
      toast.success('הכלי נמחק');
      setOpenMenuId(null);
    } catch (error) {
      logger.error('Error deleting mental tool', error, 'MentalToolsEditor');
      toast.error('שגיאה במחיקת הכלי');
    }
  }, [confirm, deleteMutation]);

  const handleToggleComplete = useCallback(async (tool: MentalTool) => {
    try {
      await toggleCompleteMutation.mutateAsync({ toolId: tool.id, isCompleted: !tool.is_completed });
    } catch (error) {
      logger.error('Error toggling mental tool complete', error, 'MentalToolsEditor');
      toast.error('שגיאה בעדכון הסטטוס');
    }
  }, [toggleCompleteMutation]);

  const handleAddFromTemplate = useCallback(async (template: typeof templates[0]) => {
    if (!user) return;
    try {
      await createMutation.mutateAsync({
        trainee_id: traineeId,
        trainer_id: user.id,
        title: template.title,
        category: template.category,
        priority: template.priority,
      });
      toast.success('הכלי נוסף בהצלחה');
    } catch (error) {
      logger.error('Error adding mental tool from template', error, 'MentalToolsEditor');
      toast.error('שגיאה בהוספת הכלי');
    }
  }, [user, traineeId, createMutation]);

  const handleEdit = useCallback((tool: MentalTool) => {
    setEditingTool(tool);
    setFormData({
      title: tool.title,
      description: tool.description || '',
      category: tool.category,
      priority: tool.priority,
    });
    setShowAddForm(true);
    setOpenMenuId(null);
  }, []);

  const filteredTools = useMemo(() => {
    return filterCategory === 'all'
      ? tools
      : tools.filter(t => t.category === filterCategory);
  }, [tools, filterCategory]);

  const activeTools = useMemo(() => filteredTools.filter(t => !t.is_completed), [filteredTools]);
  const completedTools = useMemo(() => filteredTools.filter(t => t.is_completed), [filteredTools]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {ConfirmDialog}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-blue-700 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-300 hover:scale-105"
            >
              <ArrowRight className="h-5 w-5 text-white" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Brain className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">כלים מנטליים</h1>
                <p className="text-emerald-100">{traineeName}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="bg-white text-emerald-700 hover:bg-emerald-50 px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            הוסף כלי
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
            filterCategory === 'all'
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg'
              : 'bg-white text-muted700 hover:bg-surface50 shadow-md hover:shadow-lg border border-border200'
          }`}
        >
          הכל ({tools.length})
        </button>
        {categories.map(cat => {
          const count = tools.filter(t => t.category === cat.value).length;
          const Icon = cat.icon;
          const style = getCategoryStyle(cat.value);
          return (
            <button
              key={cat.value}
              onClick={() => setFilterCategory(cat.value)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                filterCategory === cat.value
                  ? `bg-gradient-to-r ${style.gradient} text-foreground shadow-lg`
                  : 'bg-white text-muted700 hover:bg-surface50 shadow-md hover:shadow-lg border border-border200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {showAddForm && (
        <div className="bg-white rounded-2xl border border-border200 p-6 shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-muted900">
                {editingTool ? 'עריכת כלי מנטלי' : 'הוספת כלי מנטלי חדש'}
              </h3>
            </div>
            <button
              onClick={() => {
                setShowAddForm(false);
                resetForm();
              }}
              className="p-2 hover:bg-surface100 rounded-xl transition-all duration-300"
            >
              <X className="w-5 h-5 text-muted500" />
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-muted700 mb-2">כותרת *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="לדוגמה: לשתות 8 כוסות מים ביום"
                className="w-full p-4 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-muted900 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-muted700 mb-2">תיאור</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="הסבר מפורט מה המתאמן צריך לעשות..."
                rows={3}
                className="w-full p-4 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-muted900 placeholder-gray-400"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-muted700 mb-2">קטגוריה</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as MentalTool['category'] })}
                  className="w-full p-4 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-muted900 bg-white"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-muted700 mb-2">עדיפות (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: num })}
                      className={`flex-1 p-3 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                        formData.priority === num
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md'
                          : 'border-border200 hover:border-border300 hover:bg-surface50'
                      }`}
                    >
                      <Star className={`w-5 h-5 mx-auto ${formData.priority >= num ? 'fill-current text-amber-500' : 'text-muted300'}`} />
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
                className="px-5 py-2.5 text-muted700 hover:bg-surface100 rounded-xl transition-all duration-300 font-medium"
              >
                ביטול
              </button>
              <button
                onClick={handleSave}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
              >
                <Check className="w-5 h-5" />
                {editingTool ? 'עדכן' : 'הוסף'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-border200 overflow-hidden shadow-xl transition-all duration-300 hover:shadow-2xl">
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="w-full p-5 flex items-center justify-between hover:bg-surface50 transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-foreground" />
            </div>
            <div className="text-right">
              <h3 className="font-bold text-muted900 text-lg">תבניות מוכנות</h3>
              <p className="text-sm text-muted500">לחץ להוספה מהירה מרשימת תבניות</p>
            </div>
          </div>
          <div className={`p-2 rounded-lg bg-surface100 transition-transform duration-300 ${showTemplates ? 'rotate-180' : ''}`}>
            <ChevronDown className="w-5 h-5 text-muted600" />
          </div>
        </button>

        {showTemplates && (
          <div className="border-t border-border200 p-5 bg-gradient-to-br from-gray-50 to-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map((template, index) => {
                const style = getCategoryStyle(template.category);
                const isAdded = tools.some(t => t.title === template.title);
                return (
                  <button
                    key={index}
                    onClick={() => !isAdded && handleAddFromTemplate(template)}
                    disabled={isAdded}
                    className={`p-4 rounded-xl text-right flex items-center justify-between transition-all duration-300 ${
                      isAdded
                        ? 'bg-surface100 text-muted400 cursor-not-allowed'
                        : `${style.bg} ${style.border} border-2 hover:shadow-lg hover:scale-[1.02]`
                    }`}
                  >
                    <span className={`font-medium ${isAdded ? 'line-through' : style.text}`}>{template.title}</span>
                    {isAdded ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
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
        <div className="space-y-4">
          <h3 className="font-bold text-muted900 text-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            כלים פעילים ({activeTools.length})
          </h3>
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
        <div className="space-y-4">
          <h3 className="font-bold text-muted500 text-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-muted400" />
            הושלמו ({completedTools.length})
          </h3>
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
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-border200 shadow-lg">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Brain className="w-10 h-10 text-muted400" />
          </div>
          <h3 className="text-xl font-bold text-muted700 mb-2">אין כלים מנטליים</h3>
          <p className="text-muted500 mb-6">הוסף כלים מנטליים כדי לעזור למתאמן להתמקד ביעדים</p>
          <button
            onClick={() => setShowTemplates(true)}
            className="text-emerald-600 hover:text-emerald-700 font-semibold transition-all duration-300 hover:underline"
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
      className={`rounded-2xl border-2 p-5 transition-all duration-300 hover:shadow-xl ${
        tool.is_completed
          ? 'bg-surface50 border-border200 opacity-70'
          : `${style.bg} ${style.border} shadow-lg hover:scale-[1.01]`
      }`}
    >
      <div className="flex items-start gap-4">
        <button
          onClick={() => onToggleComplete(tool)}
          className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${
            tool.is_completed
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg'
              : 'bg-white border-2 border-border300 hover:border-emerald-500 hover:shadow-md'
          }`}
        >
          {tool.is_completed && <Check className="w-5 h-5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={`font-bold text-lg ${tool.is_completed ? 'text-muted500 line-through' : 'text-muted900'}`}>
                {tool.title}
              </h4>
              {tool.description && (
                <p className={`text-sm mt-1 ${tool.is_completed ? 'text-muted400' : 'text-muted600'}`}>
                  {tool.description}
                </p>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setOpenMenuId(openMenuId === tool.id ? null : tool.id)}
                className="p-2 hover:bg-white/70 rounded-xl transition-all duration-300"
              >
                <MoreVertical className="w-5 h-5 text-muted500" />
              </button>

              {openMenuId === tool.id && (
                <div className="absolute left-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-border200 z-10 py-2 min-w-[150px] overflow-hidden">
                  <button
                    onClick={() => onEdit(tool)}
                    className="w-full px-4 py-3 text-right flex items-center gap-3 hover:bg-surface50 transition-all duration-300"
                  >
                    <Edit2 className="w-4 h-4 text-muted500" />
                    <span className="font-medium">עריכה</span>
                  </button>
                  <button
                    onClick={() => onDelete(tool.id)}
                    className="w-full px-4 py-3 text-right flex items-center gap-3 hover:bg-red-50 text-red-600 transition-all duration-300"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="font-medium">מחיקה</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${style.badge} ${style.text}`}>
              <Icon className="w-3.5 h-3.5" />
              {getCategoryLabel(tool.category)}
            </div>

            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(num => (
                <Star
                  key={num}
                  className={`w-4 h-4 transition-all duration-300 ${
                    num <= tool.priority
                      ? 'text-amber-500 fill-current'
                      : 'text-muted300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
