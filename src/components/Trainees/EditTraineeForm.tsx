import { ArrowRight, Save } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

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
    notes: trainee.notes || '',
    status: trainee.status || 'active'
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
        status: formData.status,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 rtl:space-x-reverse">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowRight className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">עריכת פרופיל</h1>
          <p className="text-gray-600">{trainee.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              שם מלא <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                errors.full_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="שם מלא"
            />
            {errors.full_name && (
              <p className="text-red-500 text-sm mt-1">{errors.full_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              טלפון <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="050-1234567"
            />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">אימייל</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="example@email.com"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              גובה (ס״מ) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                errors.height ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="175"
            />
            {errors.height && <p className="text-red-500 text-sm mt-1">{errors.height}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">תאריך לידה</label>
            <input
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">מגדר</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="male">זכר</option>
              <option value="female">נקבה</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">סטטוס</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="active">פעיל</option>
              <option value="inactive">לא פעיל</option>
              <option value="vacation">חופשה</option>
              <option value="new">חדש</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">הערות</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={4}
            placeholder="הערות על המתאמן..."
          />
        </div>

        <div className="flex items-center justify-end space-x-3 rtl:space-x-reverse pt-4 border-t">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg flex items-center space-x-2 rtl:space-x-reverse transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'שומר...' : 'שמור שינויים'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
