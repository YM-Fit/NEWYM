import { Plus, Trash2, Edit, Copy, Calendar, BookMarked, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { WorkoutTemplate } from '../../../types';
import { supabase } from '../../../lib/supabase';

interface WorkoutTemplatesProps {
  onSelectTemplate: (template: WorkoutTemplate) => void;
  onClose: () => void;
}

export default function WorkoutTemplates({ onSelectTemplate, onClose }: WorkoutTemplatesProps) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('workout_templates')
      .select('*')
      .eq('trainer_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const mappedTemplates: WorkoutTemplate[] = data.map(t => ({
        id: t.id,
        trainerId: t.trainer_id,
        traineeId: t.trainee_id || null,
        traineeName: t.trainee_name || null,
        name: t.name,
        description: t.description || '',
        exercises: t.exercises || [],
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        usageCount: t.usage_count || 0,
      }));
      setTemplates(mappedTemplates);
    }
    setLoading(false);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('האם למחוק תבנית זו?')) return;

    const { error } = await supabase
      .from('workout_templates')
      .delete()
      .eq('id', templateId);

    if (!error) {
      setTemplates(templates.filter(t => t.id !== templateId));
    } else {
      alert('שגיאה במחיקת התבנית');
    }
  };

  const handleEditTemplate = (template: WorkoutTemplate) => {
    setEditingTemplate(template);
    setEditName(template.name);
    setEditDescription(template.description || '');
  };

  const handleSaveEdit = async () => {
    if (!editingTemplate || !editName.trim()) return;

    const { error } = await supabase
      .from('workout_templates')
      .update({
        name: editName.trim(),
        description: editDescription.trim() || null,
      })
      .eq('id', editingTemplate.id);

    if (!error) {
      setTemplates(templates.map(t =>
        t.id === editingTemplate.id
          ? { ...t, name: editName.trim(), description: editDescription.trim() }
          : t
      ));
      setEditingTemplate(null);
      setEditName('');
      setEditDescription('');
    } else {
      alert('שגיאה בעדכון התבנית');
    }
  };

  const handleSelectTemplate = async (template: WorkoutTemplate) => {
    await supabase
      .from('workout_templates')
      .update({ usage_count: template.usageCount + 1 })
      .eq('id', template.id);

    onSelectTemplate(template);
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-zinc-800/50 border-b border-zinc-700/50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/15">
                <BookMarked className="h-7 w-7 text-amber-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">תבניות אימון</h2>
                <p className="text-zinc-500">בחר תבנית קיימת או התחל אימון ריק</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:bg-zinc-800 p-3 rounded-xl transition-all"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 bg-zinc-800/30 rounded-2xl border border-zinc-700/30">
              <div className="w-16 h-16 bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-zinc-600" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">אין תבניות שמורות</h3>
              <p className="text-zinc-500">שמור אימונים כתבניות לשימוש מהיר בעתיד</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="bg-zinc-800/30 rounded-2xl p-5 border border-zinc-700/30 hover:border-emerald-500/30 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-400 transition-all">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-zinc-500 mb-2">{template.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-sm flex-wrap">
                        <span className="flex items-center bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded-lg">
                          <Copy className="h-4 w-4 ml-1" />
                          {template.exercises.length} תרגילים
                        </span>
                        <span className="flex items-center bg-zinc-700/50 text-zinc-400 px-2 py-1 rounded-lg">
                          <Calendar className="h-4 w-4 ml-1" />
                          {new Date(template.createdAt).toLocaleDateString('he-IL')}
                        </span>
                        {template.traineeName && (
                          <span className="flex items-center bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg text-xs">
                            מתאמן: {template.traineeName}
                          </span>
                        )}
                      </div>
                      <div className="text-xs mt-2 bg-amber-500/10 text-amber-400 px-2 py-1 rounded-lg inline-block">
                        שימושים: {template.usageCount}
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-800/50 rounded-xl p-3 mb-3 max-h-32 overflow-y-auto border border-zinc-700/30">
                    <ul className="space-y-1 text-sm">
                      {template.exercises.map((exercise, idx) => (
                        <li key={idx} className="text-zinc-400 flex items-center">
                          <span className="w-6 h-6 bg-emerald-500 text-white rounded-lg flex items-center justify-center text-xs font-bold ml-2">
                            {idx + 1}
                          </span>
                          <span className="flex-1 font-medium text-zinc-300">{exercise.exerciseName}</span>
                          <span className="text-emerald-400 text-xs bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                            {exercise.setsCount} סטים
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSelectTemplate(template)}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-center"
                    >
                      <Plus className="h-4 w-4 ml-1" />
                      השתמש בתבנית
                    </button>
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 p-3 rounded-xl transition-all"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-3 rounded-xl transition-all"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-zinc-700/50 p-4 bg-zinc-800/30">
          <button
            onClick={onClose}
            className="w-full bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-300 px-6 py-4 rounded-xl font-semibold transition-all"
          >
            התחל אימון ריק
          </button>
        </div>
      </div>

      {editingTemplate && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-cyan-500/15">
                <Edit className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white">ערוך תבנית</h3>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  שם התבנית *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  placeholder="למשל: אימון רגליים מלא"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  תיאור (אופציונלי)
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  placeholder="הוסף תיאור..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveEdit}
                disabled={!editName.trim()}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:cursor-not-allowed"
              >
                שמור
              </button>
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setEditName('');
                  setEditDescription('');
                }}
                className="flex-1 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-300 px-6 py-3 rounded-xl font-semibold transition-all"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
