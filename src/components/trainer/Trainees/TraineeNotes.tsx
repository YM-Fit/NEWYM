import { useState, useEffect } from 'react';
import { X, FileText, Plus, Pin, Trash2, Edit2, Check, Tag } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Note {
  id: string;
  trainee_id: string;
  trainer_id: string;
  note_text: string;
  is_pinned: boolean;
  category: 'general' | 'health' | 'nutrition' | 'training' | 'personal';
  created_at: string;
  updated_at: string;
}

interface TraineeNotesProps {
  traineeId: string;
  traineeName: string;
  onClose: () => void;
}

const CATEGORIES = {
  general: { label: 'כללי', color: 'gray' },
  health: { label: 'בריאות', color: 'red' },
  nutrition: { label: 'תזונה', color: 'emerald' },
  training: { label: 'אימון', color: 'blue' },
  personal: { label: 'אישי', color: 'amber' },
};

export default function TraineeNotes({ traineeId, traineeName, onClose }: TraineeNotesProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [filter, setFilter] = useState<'all' | Note['category']>('all');

  const [formData, setFormData] = useState({
    note_text: '',
    category: 'general' as Note['category'],
    is_pinned: false,
  });

  useEffect(() => {
    loadNotes();
  }, [traineeId]);

  const loadNotes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('trainer_notes')
      .select('*')
      .eq('trainee_id', traineeId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('שגיאה בטעינת ההערות');
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const noteData = {
      trainee_id: traineeId,
      trainer_id: user.id,
      note_text: formData.note_text,
      category: formData.category,
      is_pinned: formData.is_pinned,
    };

    if (editingNote) {
      const { error } = await supabase
        .from('trainer_notes')
        .update({ ...noteData, updated_at: new Date().toISOString() })
        .eq('id', editingNote.id);

      if (error) {
        toast.error('שגיאה בעדכון ההערה');
      } else {
        toast.success('ההערה עודכנה');
        loadNotes();
        resetForm();
      }
    } else {
      const { error } = await supabase.from('trainer_notes').insert(noteData);

      if (error) {
        toast.error('שגיאה בהוספת ההערה');
      } else {
        toast.success('ההערה נוספה');
        loadNotes();
        resetForm();
      }
    }
  };

  const resetForm = () => {
    setFormData({ note_text: '', category: 'general', is_pinned: false });
    setShowAddForm(false);
    setEditingNote(null);
  };

  const handleEdit = (note: Note) => {
    setFormData({
      note_text: note.note_text,
      category: note.category,
      is_pinned: note.is_pinned,
    });
    setEditingNote(note);
    setShowAddForm(true);
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק הערה זו?')) return;

    const { error } = await supabase.from('trainer_notes').delete().eq('id', noteId);
    if (error) {
      toast.error('שגיאה במחיקת ההערה');
    } else {
      toast.success('ההערה נמחקה');
      loadNotes();
    }
  };

  const handleTogglePin = async (note: Note) => {
    const { error } = await supabase
      .from('trainer_notes')
      .update({ is_pinned: !note.is_pinned, updated_at: new Date().toISOString() })
      .eq('id', note.id);

    if (error) {
      toast.error('שגיאה בעדכון ההערה');
    } else {
      loadNotes();
    }
  };

  const filteredNotes = filter === 'all' ? notes : notes.filter(n => n.category === filter);

  const getCategoryStyle = (category: string) => {
    const cat = CATEGORIES[category as keyof typeof CATEGORIES] || CATEGORIES.general;
    return {
      bg: `bg-${cat.color}-100`,
      text: `text-${cat.color}-700`,
      border: `border-${cat.color}-200`,
    };
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <FileText className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">הערות פנימיות</h2>
              <p className="text-sm text-amber-100">{traineeName} (רק המאמן רואה)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-300 hover:scale-105"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                filter === 'all' ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              הכל
            </button>
            {Object.entries(CATEGORIES).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setFilter(key as Note['category'])}
                className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
                  filter === key ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-sm transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            הערה חדשה
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">אין הערות להצגה</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-4 text-amber-600 font-semibold hover:text-amber-700"
              >
                הוסף הערה ראשונה
              </button>
            </div>
          ) : (
            filteredNotes.map(note => {
              const catStyle = getCategoryStyle(note.category);
              return (
                <div
                  key={note.id}
                  className={`bg-white rounded-xl border-2 p-5 transition-all duration-300 ${
                    note.is_pinned ? 'border-amber-300 bg-amber-50' : 'border-gray-200 hover:border-amber-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {note.is_pinned && (
                        <Pin className="w-4 h-4 text-amber-500 fill-amber-500" />
                      )}
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold bg-${CATEGORIES[note.category].color}-100 text-${CATEGORIES[note.category].color}-700`}>
                        {CATEGORIES[note.category].label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(note.created_at).toLocaleDateString('he-IL')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTogglePin(note)}
                        className={`p-2 rounded-lg transition-all ${
                          note.is_pinned ? 'text-amber-500 hover:bg-amber-100' : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={note.is_pinned ? 'בטל הצמדה' : 'הצמד'}
                      >
                        <Pin className={`w-4 h-4 ${note.is_pinned ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleEdit(note)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{note.note_text}</p>
                </div>
              );
            })
          )}
        </div>

        {showAddForm && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/40 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {editingNote ? 'עריכת הערה' : 'הערה חדשה'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">קטגוריה</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as Note['category'] })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    {Object.entries(CATEGORIES).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">תוכן ההערה *</label>
                  <textarea
                    value={formData.note_text}
                    onChange={(e) => setFormData({ ...formData, note_text: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    rows={5}
                    placeholder="כתוב את ההערה כאן..."
                    required
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_pinned}
                    onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-gray-700">הצמד הערה</span>
                </label>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300"
                  >
                    {editingNote ? 'עדכן' : 'הוסף'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-all duration-300"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 bg-gradient-to-br from-gray-50 to-white border-t border-gray-200 p-6 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02]"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
