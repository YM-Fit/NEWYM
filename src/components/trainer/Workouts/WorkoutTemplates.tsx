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
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100">
        {/* Premium Header with gradient */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <BookMarked className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">תבניות אימון</h2>
                <p className="text-emerald-100">בחר תבנית קיימת או התחל אימון ריק</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-3 rounded-xl transition-all duration-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-xl border border-gray-100">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">אין תבניות שמורות</h3>
              <p className="text-gray-500">שמור אימונים כתבניות לשימוש מהיר בעתיד</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="bg-white rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-emerald-200 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-emerald-700 transition-all duration-300">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                          <Copy className="h-4 w-4 ml-1" />
                          {template.exercises.length} תרגילים
                        </span>
                        <span className="flex items-center bg-gray-50 text-gray-600 px-2 py-1 rounded-lg">
                          <Calendar className="h-4 w-4 ml-1" />
                          {new Date(template.createdAt).toLocaleDateString('he-IL')}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-2 bg-amber-50 text-amber-700 px-2 py-1 rounded-lg inline-block">
                        שימושים: {template.usageCount}
                      </div>
                    </div>
                  </div>

                  {/* Exercise List */}
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 mb-3 max-h-32 overflow-y-auto border border-gray-100 shadow-inner">
                    <ul className="space-y-1 text-sm">
                      {template.exercises.map((exercise, idx) => (
                        <li key={idx} className="text-gray-700 flex items-center">
                          <span className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-lg flex items-center justify-center text-xs font-bold ml-2 shadow-sm">
                            {idx + 1}
                          </span>
                          <span className="flex-1 font-medium">{exercise.exerciseName}</span>
                          <span className="text-emerald-600 text-xs bg-emerald-50 px-2 py-0.5 rounded-lg">
                            {exercise.setsCount} סטים
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSelectTemplate(template)}
                      className="flex-1 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl"
                    >
                      <Plus className="h-4 w-4 ml-1" />
                      השתמש בתבנית
                    </button>
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-500 p-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-4 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg"
          >
            התחל אימון ריק
          </button>
        </div>
      </div>

      {/* Edit Modal with premium styling */}
      {editingTemplate && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                <Edit className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">ערוך תבנית</h3>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  שם התבנית *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  placeholder="למשל: אימון רגליים מלא"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  תיאור (אופציונלי)
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  placeholder="הוסף תיאור..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveEdit}
                disabled={!editName.trim()}
                className="flex-1 bg-gradient-to-br from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                שמור
              </button>
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setEditName('');
                  setEditDescription('');
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-all duration-300"
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
