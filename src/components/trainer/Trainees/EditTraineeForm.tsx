import { ArrowRight, Save, Sparkles, User, Users } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { validateTraineeForm } from '../../../utils/validation';
import { useAuth } from '../../../contexts/AuthContext';

interface EditTraineeFormProps {
  trainee: any;
  onBack: () => void;
  onSave: () => void;
}

export default function EditTraineeForm({ trainee, onBack, onSave }: EditTraineeFormProps) {
  const { user } = useAuth();
  const isPair = trainee.isPair || false;
  const originalName = !isPair ? (trainee.name || '') : `${trainee.pairName1 || ''} ו${trainee.pairName2 || ''}`;

  const [formData, setFormData] = useState({
    // Regular trainee fields
    full_name: !isPair ? (trainee.name || '') : '',
    email: !isPair ? (trainee.email || '') : '',
    phone: !isPair ? (trainee.phone || '') : '',
    birth_date: !isPair ? (trainee.birthDate || '') : '',
    gender: !isPair ? (trainee.gender || 'male') : 'male',
    height: !isPair ? (trainee.height || '') : '',
    notes: trainee.notes || '',
    // Pair trainee fields
    pair_name_1: isPair ? (trainee.pairName1 || '') : '',
    pair_name_2: isPair ? (trainee.pairName2 || '') : '',
    pair_phone_1: isPair ? (trainee.pairPhone1 || '') : '',
    pair_phone_2: isPair ? (trainee.pairPhone2 || '') : '',
    pair_email_1: isPair ? (trainee.pairEmail1 || '') : '',
    pair_email_2: isPair ? (trainee.pairEmail2 || '') : '',
    pair_gender_1: isPair ? (trainee.pairGender1 || 'female') : 'female',
    pair_gender_2: isPair ? (trainee.pairGender2 || 'female') : 'female',
    pair_birth_date_1: isPair ? (trainee.pairBirthDate1 || '') : '',
    pair_birth_date_2: isPair ? (trainee.pairBirthDate2 || '') : '',
    pair_height_1: isPair ? (trainee.pairHeight1 || '') : '',
    pair_height_2: isPair ? (trainee.pairHeight2 || '') : '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validateForm = () => {
    const { errors, isValid } = validateTraineeForm(formData, isPair, false);
    setErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);

    try {
      if (isPair) {
        const { error } = await supabase
          .from('trainees')
          .update({
            full_name: `${formData.pair_name_1.trim()} ו${formData.pair_name_2.trim()}`,
            email: null,
            phone: null,
            gender: null,
            birth_date: null,
            height: null,
            notes: formData.notes.trim(),
            is_pair: true,
            pair_name_1: formData.pair_name_1.trim(),
            pair_name_2: formData.pair_name_2.trim(),
            pair_phone_1: formData.pair_phone_1.trim(),
            pair_phone_2: formData.pair_phone_2.trim(),
            pair_email_1: formData.pair_email_1.trim() || null,
            pair_email_2: formData.pair_email_2.trim() || null,
            pair_gender_1: formData.pair_gender_1,
            pair_gender_2: formData.pair_gender_2,
            pair_birth_date_1: formData.pair_birth_date_1 || null,
            pair_birth_date_2: formData.pair_birth_date_2 || null,
            pair_height_1: formData.pair_height_1 ? Number(formData.pair_height_1) : null,
            pair_height_2: formData.pair_height_2 ? Number(formData.pair_height_2) : null,
          })
          .eq('id', trainee.id);

        if (error) throw error;
      } else {
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
            is_pair: false,
            // Clear pair fields if converting from pair to regular
            pair_name_1: null,
            pair_name_2: null,
            pair_phone_1: null,
            pair_phone_2: null,
            pair_email_1: null,
            pair_email_2: null,
            pair_gender_1: null,
            pair_gender_2: null,
            pair_birth_date_1: null,
            pair_birth_date_2: null,
            pair_height_1: null,
            pair_height_2: null,
          })
          .eq('id', trainee.id);

        if (error) throw error;
      }

      // Check if name changed - if so, sync to Google Calendar automatically
      const newName = isPair 
        ? `${formData.pair_name_1.trim()} ו${formData.pair_name_2.trim()}`
        : formData.full_name.trim();
      
      if (newName !== originalName && user) {
        // Trigger calendar sync in the background (non-blocking)
        import('../../../services/traineeCalendarSyncService').then(({ syncTraineeEventsToCalendar }) => {
          syncTraineeEventsToCalendar(trainee.id, user.id, 'current_month_and_future')
            .then(result => {
              if (result.data && result.data.updated > 0) {
                console.log(`Calendar sync: updated ${result.data.updated} events`);
              }
            })
            .catch(err => console.error('Calendar sync failed:', err));
        }).catch(err => console.error('Failed to load calendar sync service:', err));
      }

      onSave();
    } catch (error: any) {
      alert('שגיאה בשמירת הפרטים: ' + (error.message || 'שגיאה לא ידועה'));
    } finally {
      setSaving(false);
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {!isPair ? (
          <div className="premium-card-static p-6">
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
                  min="1"
                  max="250"
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
                  max={new Date().toISOString().split('T')[0]}
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className={inputClass(!!errors.birth_date)}
                />
                {errors.birth_date && <p className="text-red-400 text-sm mt-1">{errors.birth_date}</p>}
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
          </div>
        ) : (
          <div className="premium-card-static p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-emerald-500/15">
                <Users className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">פרטי הזוג</h3>
            </div>

            <div className="space-y-8">
              <div className="pb-6 border-b border-zinc-800/50">
                <h4 className="text-base font-semibold text-cyan-400 mb-4">מתאמן/ת ראשון/ה</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>שם מלא *</label>
                    <input
                      type="text"
                      value={formData.pair_name_1}
                      onChange={(e) => setFormData(prev => ({ ...prev, pair_name_1: e.target.value }))}
                      className={inputClass(!!errors.pair_name_1)}
                      placeholder="הכנס שם מלא"
                    />
                    {errors.pair_name_1 && <p className="text-red-400 text-sm mt-1">{errors.pair_name_1}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>מספר טלפון *</label>
                    <input
                      type="tel"
                      value={formData.pair_phone_1}
                      onChange={(e) => setFormData(prev => ({ ...prev, pair_phone_1: e.target.value }))}
                      className={inputClass(!!errors.pair_phone_1)}
                      placeholder="050-1234567"
                    />
                    {errors.pair_phone_1 && <p className="text-red-400 text-sm mt-1">{errors.pair_phone_1}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>כתובת אימייל</label>
                    <input
                      type="email"
                      value={formData.pair_email_1}
                      onChange={(e) => setFormData(prev => ({ ...prev, pair_email_1: e.target.value }))}
                      className={inputClass(!!errors.pair_email_1)}
                      placeholder="example@email.com"
                    />
                    {errors.pair_email_1 && <p className="text-red-400 text-sm mt-1">{errors.pair_email_1}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>תאריך לידה</label>
                    <input
                      type="date"
                      max={new Date().toISOString().split('T')[0]}
                      value={formData.pair_birth_date_1}
                      onChange={(e) => setFormData(prev => ({ ...prev, pair_birth_date_1: e.target.value }))}
                      className={inputClass(!!errors.pair_birth_date_1)}
                    />
                    {errors.pair_birth_date_1 && <p className="text-red-400 text-sm mt-1">{errors.pair_birth_date_1}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>מין *</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, pair_gender_1: 'male' }))}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                          formData.pair_gender_1 === 'male'
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                            : 'border-zinc-700/50 bg-zinc-800/30 text-zinc-400 hover:border-zinc-600/50'
                        }`}
                      >
                        זכר
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, pair_gender_1: 'female' }))}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                          formData.pair_gender_1 === 'female'
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                            : 'border-zinc-700/50 bg-zinc-800/30 text-zinc-400 hover:border-zinc-600/50'
                        }`}
                      >
                        נקבה
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>גובה (ס״מ) *</label>
                    <input
                      type="number"
                      min="1"
                      max="250"
                      value={formData.pair_height_1}
                      onChange={(e) => setFormData(prev => ({ ...prev, pair_height_1: e.target.value }))}
                      className={inputClass(!!errors.pair_height_1)}
                      placeholder="165"
                    />
                    {errors.pair_height_1 && <p className="text-red-400 text-sm mt-1">{errors.pair_height_1}</p>}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-base font-semibold text-amber-400 mb-4">מתאמן/ת שני/ה</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>שם מלא *</label>
                    <input
                      type="text"
                      value={formData.pair_name_2}
                      onChange={(e) => setFormData(prev => ({ ...prev, pair_name_2: e.target.value }))}
                      className={inputClass(!!errors.pair_name_2)}
                      placeholder="הכנס שם מלא"
                    />
                    {errors.pair_name_2 && <p className="text-red-400 text-sm mt-1">{errors.pair_name_2}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>מספר טלפון *</label>
                    <input
                      type="tel"
                      value={formData.pair_phone_2}
                      onChange={(e) => setFormData(prev => ({ ...prev, pair_phone_2: e.target.value }))}
                      className={inputClass(!!errors.pair_phone_2)}
                      placeholder="050-1234567"
                    />
                    {errors.pair_phone_2 && <p className="text-red-400 text-sm mt-1">{errors.pair_phone_2}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>כתובת אימייל</label>
                    <input
                      type="email"
                      value={formData.pair_email_2}
                      onChange={(e) => setFormData(prev => ({ ...prev, pair_email_2: e.target.value }))}
                      className={inputClass(!!errors.pair_email_2)}
                      placeholder="example@email.com"
                    />
                    {errors.pair_email_2 && <p className="text-red-400 text-sm mt-1">{errors.pair_email_2}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>תאריך לידה</label>
                    <input
                      type="date"
                      max={new Date().toISOString().split('T')[0]}
                      value={formData.pair_birth_date_2}
                      onChange={(e) => setFormData(prev => ({ ...prev, pair_birth_date_2: e.target.value }))}
                      className={inputClass(!!errors.pair_birth_date_2)}
                    />
                    {errors.pair_birth_date_2 && <p className="text-red-400 text-sm mt-1">{errors.pair_birth_date_2}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>מין *</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, pair_gender_2: 'male' }))}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                          formData.pair_gender_2 === 'male'
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                            : 'border-zinc-700/50 bg-zinc-800/30 text-zinc-400 hover:border-zinc-600/50'
                        }`}
                      >
                        זכר
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, pair_gender_2: 'female' }))}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                          formData.pair_gender_2 === 'female'
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                            : 'border-zinc-700/50 bg-zinc-800/30 text-zinc-400 hover:border-zinc-600/50'
                        }`}
                      >
                        נקבה
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>גובה (ס״מ) *</label>
                    <input
                      type="number"
                      min="1"
                      max="250"
                      value={formData.pair_height_2}
                      onChange={(e) => setFormData(prev => ({ ...prev, pair_height_2: e.target.value }))}
                      className={inputClass(!!errors.pair_height_2)}
                      placeholder="170"
                    />
                    {errors.pair_height_2 && <p className="text-red-400 text-sm mt-1">{errors.pair_height_2}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="premium-card-static p-6">
          <h3 className="text-lg font-semibold text-white mb-4">הערות מאמן</h3>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            rows={4}
            placeholder="הערות כלליות על המתאמן, מטרות, הגבלות רפואיות וכו'..."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
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
