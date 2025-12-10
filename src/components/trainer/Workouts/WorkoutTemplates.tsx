import { Plus, Trash2, Edit, Copy, Calendar } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">תבניות אימון</h2>
              <p className="text-blue-100">בחר תבנית קיימת או התחל אימון ריק</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">אין תבניות שמורות</h3>
              <p className="text-gray-500">שמור אימונים כתבניות לשימוש מהיר בעתיד</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Copy className="h-4 w-4 ml-1" />
                          {template.exercises.length} תרגילים
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 ml-1" />
                          נוצר {new Date(template.createdAt).toLocaleDateString('he-IL')}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        שימושים: {template.usageCount}
                      </div>
                    </div>
                  </div>

                  {/* Exercise List */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3 max-h-32 overflow-y-auto">
                    <ul className="space-y-1 text-sm">
                      {template.exercises.map((exercise, idx) => (
                        <li key={idx} className="text-gray-700 flex items-center">
                          <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold ml-2">
                            {idx + 1}
                          </span>
                          <span className="flex-1">{exercise.exerciseName}</span>
                          <span className="text-gray-500 text-xs">
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
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center"
                    >
                      <Plus className="h-4 w-4 ml-1" />
                      השתמש בתבנית
                    </button>
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition-colors"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors"
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
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            התחל אימון ריק
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">ערוך תבנית</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  שם התבנית *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="הוסף תיאור..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveEdit}
                disabled={!editName.trim()}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                שמור
              </button>
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setEditName('');
                  setEditDescription('');
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors"
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
