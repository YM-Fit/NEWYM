import { X } from 'lucide-react';

interface CreatePlanModalProps {
  data: any;
  saving: boolean;
  onChange: (data: any) => void;
  onSave: () => void;
  onClose: () => void;
}

export function CreatePlanModal({ data, saving, onChange, onSave, onClose }: CreatePlanModalProps) {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-white/10 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">תפריט חדש</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all duration-300">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">שם התפריט *</label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800/80 border-2 border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
              placeholder="לדוגמה: תפריט הורדה במשקל"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">תיאור</label>
            <input
              type="text"
              value={data.description}
              onChange={(e) => onChange({ ...data, description: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800/80 border-2 border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">יעד קלוריות יומי</label>
              <input
                type="number"
                value={data.daily_calories}
                onChange={(e) => onChange({ ...data, daily_calories: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800/80 border-2 border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">מים יומיים (מ״ל)</label>
              <input
                type="number"
                value={data.daily_water_ml}
                onChange={(e) => onChange({ ...data, daily_water_ml: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800/80 border-2 border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">חלבון (גרם)</label>
              <input
                type="number"
                value={data.protein_grams}
                onChange={(e) => onChange({ ...data, protein_grams: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800/80 border-2 border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">פחמימות (גרם)</label>
              <input
                type="number"
                value={data.carbs_grams}
                onChange={(e) => onChange({ ...data, carbs_grams: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800/80 border-2 border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">שומן (גרם)</label>
              <input
                type="number"
                value={data.fat_grams}
                onChange={(e) => onChange({ ...data, fat_grams: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800/80 border-2 border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">הערות כלליות</label>
            <textarea
              value={data.notes}
              onChange={(e) => onChange({ ...data, notes: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800/80 border-2 border-gray-700/50 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
              rows={3}
            />
          </div>
        </div>
        <div className="p-6 border-t border-white/10 flex gap-4">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-emerald-500/25"
          >
            {saving ? 'יוצר...' : 'צור תפריט'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 bg-gray-700/50 hover:bg-gray-700 text-gray-300 py-3.5 rounded-xl font-semibold transition-all duration-300"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
