import { ArrowRight, Save, Sparkles, User } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';

interface EditTraineeFormProps {
  trainee: any;
  onBack: () => void;
  onSave: () => void;
}

export default function EditTraineeForm({ trainee, onBack, onSave }: EditTraineeFormProps) {
  const [formData, setFormData] = useState({
    full_name: trainee.name || '',
    email: trainee.email || '',
    phone: trainee.phone || '',
    birth_date: trainee.birthDate || '',
    gender: trainee.gender || 'male',
    height: trainee.height || '',
    notes: trainee.notes || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) newErrors.full_name = 'שם מלא נדרש';
    if (!formData.phone.trim()) newErrors.phone = 'מספר טלפון נדרש';
    if (!formData.height || Number(formData.height) < 1) newErrors.height = 'גובה תקין נדרש';
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'כתובת אימייל לא תקינה';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);

    const { error } = await supabase
      .from('trainees')
      .update({
        full_name: formData.full_name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim(),
        gender: formData.gender,
        birth_date: formData.birth_date || null,
        height: formData.height ? Number(formData.height) : null,
        notes: formData.notes.trim(),
      })
      .eq('id', trainee.id);

    setSaving(false);

    if (!error) {
      onSave();
    } else {
      alert('שגיאה בשמירת הפרטים');
    }
  };

  const inputClass = (hasError: boolean) =>
    `w-full p-4 text-base bg-zinc-800/50 border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 transition-all ${
      hasError
        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
        : 'border-zinc-700/50 focus:border-emerald-500/50 focus:ring-emerald-500/20'
    }`;

  const labelClass = "block text-sm font-medium text-zinc-400 mb-2";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="premium-card-static p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="relative flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-3 rounded-xl bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-all"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">עריכה</span>
            </div>
            <h1 className="text-2xl font-bold text-white">עריכת פרופיל</h1>
            <p className="text-zinc-500">{trainee.name}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="premium-card-static p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-emerald-500/15">
            <User className="h-5 w-5 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">פרטים אישיים</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>שם מלא *</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className={inputClass(!!errors.full_name)}
              placeholder="שם מלא"
            />
            {errors.full_name && <p className="text-red-400 text-sm mt-1">{errors.full_name}</p>}
          </div>

          <div>
            <label className={labelClass}>טלפון *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={inputClass(!!errors.phone)}
              placeholder="050-1234567"
            />
            {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className={labelClass}>אימייל</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={inputClass(!!errors.email)}
              placeholder="example@email.com"
            />
            {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className={labelClass}>גובה (ס״מ) *</label>
            <input
              type="number"
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              className={inputClass(!!errors.height)}
              placeholder="175"
            />
            {errors.height && <p className="text-red-400 text-sm mt-1">{errors.height}</p>}
          </div>

          <div>
            <label className={labelClass}>תאריך לידה</label>
            <input
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              className={inputClass(false)}
            />
          </div>

          <div>
            <label className={labelClass}>מגדר</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: 'male' })}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  formData.gender === 'male'
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                    : 'border-zinc-700/50 bg-zinc-800/30 text-zinc-400 hover:border-zinc-600/50'
                }`}
              >
                זכר
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: 'female' })}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  formData.gender === 'female'
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                    : 'border-zinc-700/50 bg-zinc-800/30 text-zinc-400 hover:border-zinc-600/50'
                }`}
              >
                נקבה
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass}>הערות</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            rows={4}
            placeholder="הערות על המתאמן..."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800/50">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 rounded-xl border border-zinc-700/50 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-5 w-5" />
            <span>{saving ? 'שומר...' : 'שמור שינויים'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
