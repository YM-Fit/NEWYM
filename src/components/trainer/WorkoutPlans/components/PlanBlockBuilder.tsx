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
  start_week?: number | null;
  end_week?: number | null;
  start_month?: number | null;
  end_month?: number | null;
  volume_multiplier?: number;
  exercise_volume_overrides?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface PlanBlockBuilderProps {
  traineeId: string;
  onBack: () => void;
  onSelectBlock: (block: PlanBlock) => void;
  currentDays?: WorkoutDay[]; // Optional: current days from plan to create block from
}

export default function PlanBlockBuilder({ traineeId, onBack, onSelectBlock, currentDays = [] }: PlanBlockBuilderProps) {
  const [blocks, setBlocks] = useState<PlanBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBlockName, setNewBlockName] = useState('');
  const [newBlockDescription, setNewBlockDescription] = useState('');
  const [selectedDays, setSelectedDays] = useState<WorkoutDay[]>([]);
  const [startWeek, setStartWeek] = useState<number | null>(null);
  const [endWeek, setEndWeek] = useState<number | null>(null);
  const [startMonth, setStartMonth] = useState<number | null>(null);
  const [endMonth, setEndMonth] = useState<number | null>(null);
  const [volumeMultiplier, setVolumeMultiplier] = useState<number>(1.0);
  const [timeRangeType, setTimeRangeType] = useState<'weeks' | 'months' | 'none'>('none');

  useEffect(() => {
    loadBlocks();
  }, []);

  const loadBlocks = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // trainers.id equals auth.uid(), so we can use user.id directly
      const { data, error } = await supabase
        .from('workout_plan_blocks')
        .select('*')
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST116' || 
            error.message?.includes('does not exist') || 
            error.message?.includes('relation')) {
          logger.warn('workout_plan_blocks table does not exist yet', error, 'PlanBlockBuilder');
          setBlocks([]);
          setLoading(false);
          return;
        }
        throw error;
      }

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

      // Clean and serialize the days data for JSONB storage
      const cleanedDays = selectedDays.map(day => ({
        day_number: day.day_number,
        day_name: day.day_name || null,
        focus: day.focus || null,
        notes: day.notes || null,
        exercises: day.exercises.map(ex => ({
          exercise_id: ex.exercise?.id || null,
          exercise_name: ex.exercise?.name || null,
          sets: ex.sets.map(set => ({
            set_number: set.set_number,
            weight: set.weight || null,
            reps: set.reps || null,
            rpe: set.rpe || null,
            set_type: set.set_type || 'regular',
            failure: set.failure || false,
            equipment_id: set.equipment_id || null,
            superset_exercise_id: set.superset_exercise_id || null,
            superset_weight: set.superset_weight || null,
            superset_reps: set.superset_reps || null,
            superset_rpe: set.superset_rpe || null,
            superset_equipment_id: set.superset_equipment_id || null,
            superset_dropset_weight: set.superset_dropset_weight || null,
            superset_dropset_reps: set.superset_dropset_reps || null,
            dropset_weight: set.dropset_weight || null,
            dropset_reps: set.dropset_reps || null,
          })),
          rest_seconds: ex.rest_seconds || 90,
          notes: ex.notes || null,
        })),
      }));

      // Prepare block data
      const blockData: any = {
        trainer_id: user.id,
        name: newBlockName,
        description: newBlockDescription || null,
        days: cleanedDays,
        volume_multiplier: volumeMultiplier,
      };

      // Add time range based on type
      if (timeRangeType === 'weeks') {
        blockData.start_week = startWeek;
        blockData.end_week = endWeek;
      } else if (timeRangeType === 'months') {
        blockData.start_month = startMonth;
        blockData.end_month = endMonth;
      }

      // trainers.id equals auth.uid(), so we can use user.id directly
      const { error } = await supabase
        .from('workout_plan_blocks')
        .insert(blockData);

      if (error) throw error;

      toast.success('בלוק נוצר בהצלחה');
      setShowCreateModal(false);
      setNewBlockName('');
      setNewBlockDescription('');
      setSelectedDays([]);
      setStartWeek(null);
      setEndWeek(null);
      setStartMonth(null);
      setEndMonth(null);
      setVolumeMultiplier(1.0);
      setTimeRangeType('none');
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
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
              className="p-3 lg:p-4 hover:bg-surface100 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
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
            className="bg-gradient-to-br from-primary-700 to-primary-800 hover:from-primary-800 hover:to-primary-800 text-white px-6 lg:px-8 py-3 lg:py-4 rounded-xl flex items-center space-x-2 rtl:space-x-reverse transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
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
              className="w-full py-3 bg-gradient-to-br from-primary-700 to-primary-800 hover:from-primary-800 hover:to-primary-800 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              השתמש בבלוק
            </button>
          </div>
        ))}
      </div>

      {blocks.length === 0 && (
        <div className="text-center py-12 premium-card-static">
          <div className="w-16 h-16 bg-primary-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Copy className="w-8 h-8 text-primary-400" />
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
                  className="w-full px-4 py-3 border-2 border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
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
                  className="w-full px-4 py-3 border-2 border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none"
                  rows={3}
                  placeholder="תיאור קצר של הבלוק..."
                />
              </div>

              {/* Time Range */}
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  טווח זמן (אופציונלי)
                </label>
                <select
                  value={timeRangeType}
                  onChange={(e) => {
                    setTimeRangeType(e.target.value as 'weeks' | 'months' | 'none');
                    if (e.target.value === 'none') {
                      setStartWeek(null);
                      setEndWeek(null);
                      setStartMonth(null);
                      setEndMonth(null);
                    }
                  }}
                  className="w-full px-4 py-3 border-2 border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all mb-3"
                >
                  <option value="none">ללא טווח זמן</option>
                  <option value="weeks">שבועות</option>
                  <option value="months">חודשים</option>
                </select>

                {timeRangeType === 'weeks' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[var(--color-text-muted)] mb-1">שבוע התחלה</label>
                      <input
                        type="number"
                        min="1"
                        value={startWeek || ''}
                        onChange={(e) => setStartWeek(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-3 py-2 border-2 border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-text-muted)] mb-1">שבוע סיום</label>
                      <input
                        type="number"
                        min={startWeek || 1}
                        value={endWeek || ''}
                        onChange={(e) => setEndWeek(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-3 py-2 border-2 border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                        placeholder="4"
                      />
                    </div>
                  </div>
                )}

                {timeRangeType === 'months' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[var(--color-text-muted)] mb-1">חודש התחלה</label>
                      <select
                        value={startMonth || ''}
                        onChange={(e) => setStartMonth(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-3 py-2 border-2 border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      >
                        <option value="">בחר חודש</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                          <option key={m} value={m}>חודש {m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-text-muted)] mb-1">חודש סיום</label>
                      <select
                        value={endMonth || ''}
                        onChange={(e) => setEndMonth(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-3 py-2 border-2 border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      >
                        <option value="">בחר חודש</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                          <option key={m} value={m} disabled={startMonth && m < startMonth}>חודש {m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Volume Multiplier */}
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  מכפיל נפח (ברירת מחדל: 1.0)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={volumeMultiplier}
                    onChange={(e) => setVolumeMultiplier(parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-lg font-bold text-[var(--color-text-primary)] min-w-[60px] text-center">
                    {volumeMultiplier.toFixed(1)}x
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {volumeMultiplier > 1 
                    ? `נפח מוגבר ב-${((volumeMultiplier - 1) * 100).toFixed(0)}%`
                    : volumeMultiplier < 1
                    ? `נפח מופחת ב-${((1 - volumeMultiplier) * 100).toFixed(0)}%`
                    : 'נפח רגיל'}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  ימים נבחרים: {selectedDays.length}
                </p>
                {currentDays.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {currentDays.map((day) => {
                      const isSelected = selectedDays.some(d => d.tempId === day.tempId);
                      return (
                        <button
                          key={day.tempId}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedDays(selectedDays.filter(d => d.tempId !== day.tempId));
                            } else {
                              setSelectedDays([...selectedDays, day]);
                            }
                          }}
                          className={`w-full text-right p-3 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-[var(--color-border)] hover:border-primary-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-bold ${isSelected ? 'text-primary-700' : 'text-[var(--color-text-primary)]'}`}>
                              יום {day.day_number}{day.day_name ? ` - ${day.day_name}` : ''}
                            </span>
                            <span className="text-xs text-[var(--color-text-muted)]">
                              {day.exercises.length} תרגילים
                            </span>
                          </div>
                          {day.focus && (
                            <p className="text-xs text-[var(--color-text-muted)] mt-1">{day.focus}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm text-amber-700 font-medium">
                      כדי ליצור בלוק, יש להוסיף ימים לתוכנית הנוכחית קודם.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-[var(--color-bg-base)] border-t border-[var(--color-border)] p-5 flex gap-3">
              <button
                onClick={handleCreateBlock}
                disabled={!newBlockName.trim() || selectedDays.length === 0}
                className="flex-1 py-3 bg-gradient-to-br from-primary-700 to-primary-800 hover:from-primary-800 hover:to-primary-800 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
