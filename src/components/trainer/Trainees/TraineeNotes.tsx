import { useState, useEffect } from 'react';
import { X, FileText, Plus, Pin, Trash2, Edit2 } from 'lucide-react';
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
  general: { label: 'כללי', bg: 'bg-zinc-500/15', text: 'text-zinc-400', border: 'border-zinc-500/30' },
  health: { label: 'בריאות', bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  nutrition: { label: 'תזונה', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  training: { label: 'אימון', bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  personal: { label: 'אישי', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
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

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="premium-card-static max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/15">
              <FileText className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">הערות פנימיות</h2>
              <p className="text-sm text-zinc-500">{traineeName} (רק המאמן רואה)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-2 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                filter === 'all' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/30'
              }`}
            >
              הכל
            </button>
            {Object.entries(CATEGORIES).map(([key, { label, bg, text, border }]) => (
              <button
                key={key}
                onClick={() => setFilter(key as Note['category'])}
                className={`px-3 py-2 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                  filter === key ? `${bg} ${text} border ${border}` : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/30'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 btn-primary text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            הערה חדשה
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-zinc-600" />
              </div>
              <p className="text-zinc-500">אין הערות להצגה</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-4 text-emerald-400 font-medium hover:text-emerald-300 transition-colors"
              >
                הוסף הערה ראשונה
              </button>
            </div>
          ) : (
            filteredNotes.map(note => {
              const catStyle = CATEGORIES[note.category];
              return (
                <div
                  key={note.id}
                  className={`bg-zinc-800/30 rounded-xl border p-5 transition-all ${
                    note.is_pinned ? 'border-amber-500/30 bg-amber-500/5' : 'border-zinc-700/30 hover:border-zinc-600/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {note.is_pinned && (
                        <Pin className="w-4 h-4 text-amber-400 fill-amber-400" />
                      )}
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}>
                        {catStyle.label}
                      </span>
                      <span className="text-xs text-zinc-600">
                        {new Date(note.created_at).toLocaleDateString('he-IL')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTogglePin(note)}
                        className={`p-2 rounded-lg transition-all ${
                          note.is_pinned ? 'text-amber-400 hover:bg-amber-500/10' : 'text-zinc-500 hover:bg-zinc-700/50'
                        }`}
                        title={note.is_pinned ? 'בטל הצמדה' : 'הצמד'}
                      >
                        <Pin className={`w-4 h-4 ${note.is_pinned ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleEdit(note)}
                        className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed">{note.note_text}</p>
                </div>
              );
            })
          )}
        </div>

        {showAddForm && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-[60] p-4">
            <div className="premium-card-static max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-white mb-4">
                {editingNote ? 'עריכת הערה' : 'הערה חדשה'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">קטגוריה</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as Note['category'] })}
                    className="w-full glass-input px-4 py-3"
                  >
                    {Object.entries(CATEGORIES).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">תוכן ההערה *</label>
                  <textarea
                    value={formData.note_text}
                    onChange={(e) => setFormData({ ...formData, note_text: e.target.value })}
                    className="w-full glass-input px-4 py-3"
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
                    className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                  />
                  <span className="text-sm font-medium text-zinc-300">הצמד הערה</span>
                </label>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 btn-primary px-6 py-3 font-semibold"
                  >
                    {editingNote ? 'עדכן' : 'הוסף'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 btn-secondary px-6 py-3 font-semibold"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="p-6 border-t border-zinc-800/50">
          <button
            onClick={onClose}
            className="w-full btn-primary px-6 py-4 text-lg font-bold"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
