import { useState, useEffect } from 'react';
import { Plus, Save, X, Trash2, Copy, ArrowRight } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import toast from 'react-hot-toast';
import { logger } from '../../../../utils/logger';
import type { WorkoutDay } from '../types';

interface PlanBlock {
  id: string;
  trainer_id: string;
  name: string;
  description: string | null;
  days: WorkoutDay[];
  created_at: string;
  updated_at: string;
}

interface PlanBlockBuilderProps {
  traineeId: string;
  onBack: () => void;
  onSelectBlock: (block: PlanBlock) => void;
  currentDays?: WorkoutDay[]; // Optional: current days from plan to create block from
}

export default function PlanBlockBuilder({ traineeId, onBack, onSelectBlock }: PlanBlockBuilderProps) {
  const [blocks, setBlocks] = useState<PlanBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBlockName, setNewBlockName] = useState('');
  const [newBlockDescription, setNewBlockDescription] = useState('');
  const [selectedDays, setSelectedDays] = useState<WorkoutDay[]>([]);

  useEffect(() => {
    loadBlocks();
  }, []);

  const loadBlocks = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get trainer_id from user
      const { data: trainerData } = await supabase
        .from('trainers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!trainerData) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('workout_plan_blocks')
        .select('*')
        .eq('trainer_id', trainerData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setBlocks(data.map(block => ({
          ...block,
          days: (block.days as any) || [],
        })));
      }
    } catch (error) {
      logger.error('Error loading blocks', error, 'PlanBlockBuilder');
      toast.error('שגיאה בטעינת בלוקים');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBlock = async () => {
    if (!newBlockName.trim()) {
      toast.error('נא להזין שם לבלוק');
      return;
    }

    if (selectedDays.length === 0) {
      toast.error('נא לבחור ימים לבלוק');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: trainerData } = await supabase
        .from('trainers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!trainerData) {
        toast.error('מאמן לא נמצא');
        return;
      }

      const { error } = await supabase
        .from('workout_plan_blocks')
        .insert({
          trainer_id: trainerData.id,
          name: newBlockName,
          description: newBlockDescription || null,
          days: selectedDays.map(day => ({
            day_number: day.day_number,
            day_name: day.day_name,
            focus: day.focus,
            notes: day.notes,
            exercises: day.exercises,
          })),
        } as any);

      if (error) throw error;

      toast.success('בלוק נוצר בהצלחה');
      setShowCreateModal(false);
      setNewBlockName('');
      setNewBlockDescription('');
      setSelectedDays([]);
      await loadBlocks();
    } catch (error) {
      logger.error('Error creating block', error, 'PlanBlockBuilder');
      toast.error('שגיאה ביצירת בלוק');
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('האם למחוק את הבלוק?')) return;

    try {
      const { error } = await supabase
        .from('workout_plan_blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      toast.success('בלוק נמחק בהצלחה');
      await loadBlocks();
    } catch (error) {
      logger.error('Error deleting block', error, 'PlanBlockBuilder');
      toast.error('שגיאה במחיקת בלוק');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 lg:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-muted600">טוען בלוקים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 lg:p-6">
      {/* Header */}
      <div className="premium-card-static p-4 lg:p-6 mb-4 lg:mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <button
              onClick={onBack}
              className="p-3 lg:p-4 hover:bg-surface100 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              aria-label="חזור"
            >
              <ArrowRight className="h-6 w-6 lg:h-7 lg:w-7 text-muted600" />
            </button>
            <div>
              <h1 className="text-xl lg:text-3xl font-bold text-muted900">בלוקי תוכנית</h1>
              <p className="text-base lg:text-lg text-muted600">צור ושמור בלוקים לשימוש חוזר</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-foreground px-6 lg:px-8 py-3 lg:py-4 rounded-xl flex items-center space-x-2 rtl:space-x-reverse transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            aria-label="צור בלוק חדש"
          >
            <Plus className="h-5 w-5 lg:h-6 lg:w-6" />
            <span className="font-bold text-base lg:text-lg">צור בלוק חדש</span>
          </button>
        </div>
      </div>

      {/* Blocks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {blocks.map((block) => (
          <div
            key={block.id}
            className="premium-card-static p-5 lg:p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">{block.name}</h3>
                {block.description && (
                  <p className="text-sm text-[var(--color-text-muted)] mb-3">{block.description}</p>
                )}
                <p className="text-sm text-[var(--color-text-muted)]">
                  {Array.isArray(block.days) ? block.days.length : 0} ימים
                </p>
              </div>
              <button
                onClick={() => handleDeleteBlock(block.id)}
                className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                aria-label="מחק בלוק"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => onSelectBlock(block)}
              className="w-full py-3 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-foreground font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              השתמש בבלוק
            </button>
          </div>
        ))}
      </div>

      {blocks.length === 0 && (
        <div className="text-center py-12 premium-card-static">
          <div className="w-16 h-16 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Copy className="w-8 h-8 text-emerald-400" />
          </div>
          <p className="text-[var(--color-text-primary)] font-bold text-lg">אין בלוקים שמורים</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-2">צור בלוק ראשון כדי להתחיל</p>
        </div>
      )}

      {/* Create Block Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="premium-card-static max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[var(--color-bg-base)] border-b border-[var(--color-border)] p-5 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">צור בלוק חדש</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewBlockName('');
                  setNewBlockDescription('');
                  setSelectedDays([]);
                }}
                className="p-2 hover:bg-[var(--color-bg-surface)] rounded-xl transition-all"
                aria-label="סגור"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  שם הבלוק
                </label>
                <input
                  type="text"
                  value={newBlockName}
                  onChange={(e) => setNewBlockName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  placeholder="לדוגמה: בלוק כוח בסיסי"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  תיאור (אופציונלי)
                </label>
                <textarea
                  value={newBlockDescription}
                  onChange={(e) => setNewBlockDescription(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
                  rows={3}
                  placeholder="תיאור קצר של הבלוק..."
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  ימים נבחרים: {selectedDays.length}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mb-3">
                  הערה: יש לבחור ימים מתוכנית קיימת או ליצור ימים חדשים
                </p>
                <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-4">
                  <p className="text-sm text-amber-400 font-medium">
                    💡 טיפ: כדי ליצור בלוק, בחר ימים מתוכנית קיימת או צור ימים חדשים בתוכנית הנוכחית ואז שמור אותם כבלוק.
                  </p>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-[var(--color-bg-base)] border-t border-[var(--color-border)] p-5 flex gap-3">
              <button
                onClick={handleCreateBlock}
                disabled={!newBlockName.trim() || selectedDays.length === 0}
                className="flex-1 py-3 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-foreground font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                title={selectedDays.length === 0 ? 'יש לבחור ימים לבלוק' : 'שמור בלוק'}
              >
                <Save className="w-5 h-5" />
                שמור בלוק
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewBlockName('');
                  setNewBlockDescription('');
                  setSelectedDays([]);
                }}
                className="px-6 py-3 bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] font-bold rounded-xl transition-all"
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
