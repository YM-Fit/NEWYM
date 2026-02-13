import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import type { WorkoutDay } from '../types';

interface BulkEditModalProps {
  isOpen: boolean;
  day: WorkoutDay;
  onClose: () => void;
  onApply: (updates: {
    setsCount?: number;
    reps?: number;
    restSeconds?: number;
    weight?: number;
    rpe?: number | null;
  }) => void;
}

export default function BulkEditModal({
  isOpen,
  day,
  onClose,
  onApply,
}: BulkEditModalProps) {
  const [setsCount, setSetsCount] = useState<number | ''>('');
  const [reps, setReps] = useState<number | ''>('');
  const [restSeconds, setRestSeconds] = useState<number | ''>('');
  const [weight, setWeight] = useState<number | ''>('');
  const [rpe, setRpe] = useState<number | '' | null>('');

  if (!isOpen) return null;

  const handleApply = () => {
    const updates: any = {};
    
    if (setsCount !== '') updates.setsCount = Number(setsCount);
    if (reps !== '') updates.reps = Number(reps);
    if (restSeconds !== '') updates.restSeconds = Number(restSeconds);
    if (weight !== '') updates.weight = Number(weight);
    if (rpe !== '' && rpe !== null) updates.rpe = Number(rpe);
    
    if (Object.keys(updates).length === 0) {
      return;
    }
    
    onApply(updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-muted900">עריכה קולקטיבית</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface100 rounded-xl transition-all duration-300"
          >
            <X className="w-5 h-5 text-muted600" />
          </button>
        </div>

        <p className="text-sm text-muted600 mb-6">
          החלף ערכים לכל התרגילים ביום {day.day_number}. השאר ריק כדי לא לשנות.
        </p>

        <div className="space-y-4">
          {/* Sets Count */}
          <div>
            <label className="block text-sm font-semibold text-muted700 mb-2">
              כמות סטים
            </label>
            <input
              type="number"
              value={setsCount}
              onChange={(e) => setSetsCount(e.target.value === '' ? '' : parseInt(e.target.value) || '')}
              className="w-full px-4 py-3 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"
              placeholder="השאר ריק כדי לא לשנות"
              min="1"
              max="10"
            />
          </div>

          {/* Reps */}
          <div>
            <label className="block text-sm font-semibold text-muted700 mb-2">
              חזרות
            </label>
            <input
              type="number"
              value={reps}
              onChange={(e) => setReps(e.target.value === '' ? '' : parseInt(e.target.value) || '')}
              className="w-full px-4 py-3 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"
              placeholder="השאר ריק כדי לא לשנות"
              min="1"
              max="100"
            />
          </div>

          {/* Rest Seconds */}
          <div>
            <label className="block text-sm font-semibold text-muted700 mb-2">
              מנוחה (שניות)
            </label>
            <input
              type="number"
              value={restSeconds}
              onChange={(e) => setRestSeconds(e.target.value === '' ? '' : parseInt(e.target.value) || '')}
              className="w-full px-4 py-3 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"
              placeholder="השאר ריק כדי לא לשנות"
              min="0"
              max="600"
            />
          </div>

          {/* Weight */}
          <div>
            <label className="block text-sm font-semibold text-muted700 mb-2">
              משקל (ק"ג)
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value === '' ? '' : parseFloat(e.target.value) || '')}
              className="w-full px-4 py-3 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"
              placeholder="השאר ריק כדי לא לשנות"
              min="0"
              step="0.5"
            />
          </div>

          {/* RPE */}
          <div>
            <label className="block text-sm font-semibold text-muted700 mb-2">
              RPE (1-10)
            </label>
            <input
              type="number"
              value={rpe === null ? '' : rpe}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setRpe('');
                } else {
                  const num = parseInt(val);
                  if (num >= 1 && num <= 10) {
                    setRpe(num);
                  }
                }
              }}
              className="w-full px-4 py-3 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"
              placeholder="השאר ריק כדי לא לשנות"
              min="1"
              max="10"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-surface200 hover:bg-surface300 text-muted700 font-bold rounded-xl transition-all duration-300"
          >
            ביטול
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-foreground font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            החל על כל התרגילים
          </button>
        </div>
      </div>
    </div>
  );
}
