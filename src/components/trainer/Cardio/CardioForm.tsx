import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { X, Save, Activity, TrendingUp, Timer, Calendar as CalendarIcon, Target } from 'lucide-react';
import toast from 'react-hot-toast';

interface CardioType {
  id: string;
  name: string;
}

interface CardioFormProps {
  traineeId: string;
  trainerId: string;
  onClose: () => void;
  onSave: () => void;
}

export default function CardioForm({ traineeId, trainerId, onClose, onSave }: CardioFormProps) {
  const [loading, setLoading] = useState(false);
  const [cardioTypes, setCardioTypes] = useState<CardioType[]>([]);
  const [newCardioType, setNewCardioType] = useState('');
  const [showNewType, setShowNewType] = useState(false);

  const [formData, setFormData] = useState({
    cardio_type_id: '',
    date: new Date().toISOString().split('T')[0],
    avg_weekly_steps: 0,
    distance: 0,
    duration: 0,
    frequency: 0,
    weekly_goal_steps: 0,
    notes: ''
  });

  useEffect(() => {
    loadCardioTypes();
  }, [trainerId]);

  const loadCardioTypes = async () => {
    const { data, error } = await supabase
      .from('cardio_types')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('name');

    if (error) {
      toast.error('שגיאה בטעינת סוגי אירובי');
    } else if (data) {
      setCardioTypes(data);
    }
  };

  const handleAddCardioType = async () => {
    if (!newCardioType.trim()) {
      toast.error('נא להזין שם סוג אירובי');
      return;
    }

    const { error } = await supabase
      .from('cardio_types')
      .insert({
        trainer_id: trainerId,
        name: newCardioType.trim()
      });

    if (error) {
      toast.error('שגיאה בהוספת סוג אירובי');
    } else {
      toast.success('סוג אירובי נוסף בהצלחה');
      setNewCardioType('');
      setShowNewType(false);
      loadCardioTypes();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cardio_type_id) {
      toast.error('נא לבחור סוג אירובי');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('cardio_activities')
      .insert({
        trainee_id: traineeId,
        trainer_id: trainerId,
        cardio_type_id: formData.cardio_type_id,
        date: formData.date,
        avg_weekly_steps: formData.avg_weekly_steps,
        distance: formData.distance,
        duration: formData.duration,
        frequency: formData.frequency,
        weekly_goal_steps: formData.weekly_goal_steps,
        notes: formData.notes
      });

    setLoading(false);

    if (error) {
      toast.error('שגיאה בשמירת פעילות אירובית');
    } else {
      toast.success('פעילות אירובית נשמרה בהצלחה');
      onSave();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-sky-400" />
            רישום פעילות אירובית
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
              <Activity className="h-4 w-4 text-sky-400" />
              סוג אירובי
            </label>
            {!showNewType ? (
              <div className="flex gap-2">
                <select
                  value={formData.cardio_type_id}
                  onChange={(e) => setFormData({ ...formData, cardio_type_id: e.target.value })}
                  className="flex-1 px-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                  required
                >
                  <option value="">בחר סוג אירובי</option>
                  {cardioTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewType(true)}
                  className="px-4 py-3 bg-sky-500/15 text-sky-400 rounded-xl hover:bg-sky-500/25 transition-all border border-sky-500/30 font-medium"
                >
                  הוסף חדש
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCardioType}
                  onChange={(e) => setNewCardioType(e.target.value)}
                  placeholder="שם סוג אירובי חדש"
                  className="flex-1 px-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                />
                <button
                  type="button"
                  onClick={handleAddCardioType}
                  className="px-4 py-3 bg-emerald-500/15 text-emerald-400 rounded-xl hover:bg-emerald-500/25 transition-all border border-emerald-500/30 font-medium"
                >
                  שמור
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewType(false);
                    setNewCardioType('');
                  }}
                  className="px-4 py-3 bg-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-700 transition-all"
                >
                  ביטול
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-sky-400" />
              תאריך
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-400" />
                ממוצע צעדים שבועי
              </label>
              <input
                type="number"
                value={formData.avg_weekly_steps || ''}
                onChange={(e) => setFormData({ ...formData, avg_weekly_steps: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-400" />
                יעד צעדים שבועי
              </label>
              <input
                type="number"
                value={formData.weekly_goal_steps || ''}
                onChange={(e) => setFormData({ ...formData, weekly_goal_steps: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                מרחק (ק״מ)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.distance || ''}
                onChange={(e) => setFormData({ ...formData, distance: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                <Timer className="h-4 w-4 text-violet-400" />
                משך זמן (דקות)
              </label>
              <input
                type="number"
                value={formData.duration || ''}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-rose-400" />
                תדירות שבועית
              </label>
              <input
                type="number"
                value={formData.frequency || ''}
                onChange={(e) => setFormData({ ...formData, frequency: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                min="0"
                max="7"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              הערות
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all resize-none"
              rows={3}
              placeholder="הערות נוספות..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-xl font-medium hover:from-sky-600 hover:to-sky-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-glow"
            >
              <Save className="h-5 w-5" />
              {loading ? 'שומר...' : 'שמור פעילות'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium hover:bg-zinc-700 transition-all"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}