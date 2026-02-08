import { useState, useEffect } from 'react';
import { Search, Pin, PinOff, Plus, X, Edit2, Trash2, Save, BookOpen, FileText, Calendar, Target } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import toast from 'react-hot-toast';
import { logger } from '../../../../utils/logger';

export type NoteLevel = 'plan' | 'day' | 'exercise' | 'set';

export interface Note {
  id: string;
  level: NoteLevel;
  plan_id?: string;
  day_id?: string;
  exercise_id?: string;
  set_id?: string;
  note_text: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface NotesManagerProps {
  planId: string | null;
  dayId?: string | null;
  exerciseId?: string | null;
  level: NoteLevel;
  onClose: () => void;
  onNoteAdded?: (note: Note) => void;
  onNoteUpdated?: (note: Note) => void;
  onNoteDeleted?: (noteId: string) => void;
}

export default function NotesManager({
  planId,
  dayId,
  exerciseId,
  level,
  onClose,
  onNoteAdded,
  onNoteUpdated,
  onNoteDeleted,
}: NotesManagerProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [planId, dayId, exerciseId, level]);

  const loadNotes = async () => {
    if (!planId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('workout_plan_notes')
        .select('*')
        .eq('plan_id', planId)
        .eq('level', level)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (level === 'day' && dayId) {
        query = query.eq('day_id', dayId);
      } else if (level === 'exercise' && exerciseId) {
        query = query.eq('exercise_id', exerciseId);
      }

      const { data, error } = await query;

      if (error) {
        // Table might not exist yet
        if (error.code === '42P01' || error.code === 'PGRST116') {
          logger.warn('workout_plan_notes table does not exist yet', error, 'NotesManager');
          setNotes([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      setNotes((data || []) as Note[]);
    } catch (error) {
      logger.error('Error loading notes', error, 'NotesManager');
      toast.error('שגיאה בטעינת הערות');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteText.trim() || !planId) return;

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const noteData: any = {
        plan_id: planId,
        level,
        note_text: newNoteText.trim(),
        is_pinned: false,
      };

      if (level === 'day' && dayId) {
        noteData.day_id = dayId;
      } else if (level === 'exercise' && exerciseId) {
        noteData.exercise_id = exerciseId;
      }

      const { data, error } = await supabase
        .from('workout_plan_notes')
        .insert(noteData)
        .select()
        .single();

      if (error) {
        // If table doesn't exist, we'll create it via migration
        if (error.code === '42P01' || error.code === 'PGRST116') {
          toast.error('טבלת הערות עדיין לא קיימת. יש להריץ מיגרציה.');
          setIsCreating(false);
          return;
        }
        throw error;
      }

      const newNote = data as Note;
      setNotes([newNote, ...notes]);
      setNewNoteText('');
      onNoteAdded?.(newNote);
      toast.success('הערה נוספה בהצלחה');
    } catch (error) {
      logger.error('Error creating note', error, 'NotesManager');
      toast.error('שגיאה ביצירת הערה');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateNote = async (note: Note, newText: string) => {
    if (!newText.trim()) return;

    try {
      const { error } = await supabase
        .from('workout_plan_notes')
        .update({
          note_text: newText.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', note.id);

      if (error) throw error;

      const updatedNote = { ...note, note_text: newText.trim(), updated_at: new Date().toISOString() };
      setNotes(notes.map(n => n.id === note.id ? updatedNote : n));
      setEditingNote(null);
      onNoteUpdated?.(updatedNote);
      toast.success('הערה עודכנה בהצלחה');
    } catch (error) {
      logger.error('Error updating note', error, 'NotesManager');
      toast.error('שגיאה בעדכון הערה');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('האם למחוק את ההערה?')) return;

    try {
      const { error } = await supabase
        .from('workout_plan_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      setNotes(notes.filter(n => n.id !== noteId));
      onNoteDeleted?.(noteId);
      toast.success('הערה נמחקה בהצלחה');
    } catch (error) {
      logger.error('Error deleting note', error, 'NotesManager');
      toast.error('שגיאה במחיקת הערה');
    }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      const { error } = await supabase
        .from('workout_plan_notes')
        .update({
          is_pinned: !note.is_pinned,
          updated_at: new Date().toISOString(),
        })
        .eq('id', note.id);

      if (error) throw error;

      const updatedNote = { ...note, is_pinned: !note.is_pinned, updated_at: new Date().toISOString() };
      setNotes(notes.map(n => n.id === note.id ? updatedNote : n).sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }));
      onNoteUpdated?.(updatedNote);
    } catch (error) {
      logger.error('Error toggling pin', error, 'NotesManager');
      toast.error('שגיאה בעדכון הערה');
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = searchQuery.trim() === '' || 
      note.note_text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPinnedFilter = !showPinnedOnly || note.is_pinned;
    return matchesSearch && matchesPinnedFilter;
  });

  const getLevelIcon = () => {
    switch (level) {
      case 'plan':
        return <FileText className="w-5 h-5" />;
      case 'day':
        return <Calendar className="w-5 h-5" />;
      case 'exercise':
        return <Target className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
    }
  };

  const getLevelLabel = () => {
    switch (level) {
      case 'plan':
        return 'תוכנית';
      case 'day':
        return 'יום';
      case 'exercise':
        return 'תרגיל';
      default:
        return 'הערה';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface0 rounded-2xl p-4 md:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {getLevelIcon()}
            <h2 className="text-2xl lg:text-3xl font-bold text-muted900">
              הערות - {getLevelLabel()}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface100 rounded-xl transition-all duration-300"
            aria-label="סגור"
          >
            <X className="w-6 h-6 text-muted600" />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חפש בהערות..."
              className="w-full px-4 py-3 pr-10 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPinnedOnly}
                onChange={(e) => setShowPinnedOnly(e.target.checked)}
                className="w-4 h-4 rounded border-border200 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-muted700">הצג רק מוצמדות</span>
            </label>
          </div>
        </div>

        {/* Create New Note */}
        <div className="mb-6 p-4 bg-surface50 rounded-xl border-2 border-border200">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder={`הוסף הערה חדשה ל-${getLevelLabel()}...`}
                className="w-full px-4 py-3 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
                rows={3}
              />
            </div>
            <button
              onClick={handleCreateNote}
              disabled={!newNoteText.trim() || isCreating}
              className="px-4 py-3 bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {isCreating ? 'מוסיף...' : 'הוסף'}
            </button>
          </div>
        </div>

        {/* Notes List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-muted600">טוען הערות...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-muted400 mx-auto mb-4" />
            <p className="text-lg font-medium text-muted900">
              {searchQuery ? 'לא נמצאו הערות' : 'אין הערות עדיין'}
            </p>
            <p className="text-sm text-muted600 mt-2">
              {searchQuery ? 'נסה חיפוש אחר' : 'הוסף הערה ראשונה כדי להתחיל'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  note.is_pinned
                    ? 'bg-amber-50 border-amber-300'
                    : 'bg-surface0 border-border200'
                }`}
              >
                {editingNote?.id === note.id ? (
                  <div className="space-y-3">
                    <textarea
                      defaultValue={note.note_text}
                      className="w-full px-4 py-3 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
                      rows={3}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setEditingNote(null);
                        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          const textarea = e.currentTarget;
                          handleUpdateNote(note, textarea.value);
                        }
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const textarea = document.querySelector(`textarea[defaultValue="${note.note_text}"]`) as HTMLTextAreaElement;
                          if (textarea) {
                            handleUpdateNote(note, textarea.value);
                          }
                        }}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        שמור
                      </button>
                      <button
                        onClick={() => setEditingNote(null)}
                        className="px-4 py-2 bg-surface200 hover:bg-surface300 text-muted700 font-bold rounded-xl transition-all"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-muted900 flex-1 whitespace-pre-wrap">{note.note_text}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTogglePin(note)}
                          className={`p-2 rounded-lg transition-all ${
                            note.is_pinned
                              ? 'bg-amber-100 text-amber-700'
                              : 'hover:bg-surface100 text-muted600'
                          }`}
                          title={note.is_pinned ? 'הסר מהצמדה' : 'הצמד'}
                        >
                          {note.is_pinned ? (
                            <Pin className="w-4 h-4" />
                          ) : (
                            <PinOff className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setEditingNote(note)}
                          className="p-2 hover:bg-surface100 text-muted600 rounded-lg transition-all"
                          title="ערוך"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-all"
                          title="מחק"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-muted600 mt-2">
                      {new Date(note.created_at).toLocaleDateString('he-IL', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
