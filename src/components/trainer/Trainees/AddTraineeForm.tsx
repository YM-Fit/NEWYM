import { ArrowRight, Save, User, Users, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { validateTraineeForm } from '../../../utils/validation';

interface AddTraineeFormProps {
  onBack: () => void;
  onSave: (trainee: any) => void;
  initialName?: string;
}

export default function AddTraineeForm({ onBack, onSave, initialName }: AddTraineeFormProps) {
  const [isPair, setIsPair] = useState(false);
  const [formData, setFormData] = useState({
    full_name: initialName || '',
    email: '',
    phone: '',
    birth_date: '',
    gender: 'male' as 'male' | 'female',
    height: '',
    notes: '',
    pair_name_1: '',
    pair_name_2: '',
    pair_phone_1: '',
    pair_phone_2: '',
    pair_email_1: '',
    pair_email_2: '',
    pair_gender_1: 'female' as 'male' | 'female',
    pair_gender_2: 'female' as 'male' | 'female',
    pair_birth_date_1: '',
    pair_birth_date_2: '',
    pair_height_1: '',
    pair_height_2: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const { errors, isValid } = validateTraineeForm(formData, isPair, true);
    setErrors(errors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (isPair) {
      const newTrainee = {
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
      };
      onSave(newTrainee);
    } else {
      const newTrainee = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim(),
        gender: formData.gender,
        birth_date: formData.birth_date || null,
        height: formData.height ? Number(formData.height) : null,
        notes: formData.notes.trim(),
        is_pair: false,
      };
      onSave(newTrainee);
    }
  };

  const inputClass = (hasError: boolean) =>
    `w-full p-4 text-base bg-input border rounded-xl text-foreground placeholder-muted focus:outline-none focus:ring-2 transition-all ${
      hasError
        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
        : 'border-border focus:border-emerald-500/50 focus:ring-emerald-500/20'
    }`;

  const labelClass = "block text-sm font-medium text-muted mb-2";

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] transition-colors duration-300 p-4 md:p-6 animate-fade-in">
      <div className="premium-card-static p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="relative flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-3 rounded-xl bg-surface text-muted hover:text-foreground hover:bg-elevated transition-all"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">מתאמן חדש</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">הוסף מתאמן</h1>
            <p className="text-muted">מלא את הפרטים הבסיסיים של המתאמן</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="premium-card-static p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">סוג מתאמן</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setIsPair(false)}
              className={`p-6 rounded-xl border-2 transition-all ${
                !isPair
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-border bg-surface hover:border-border-hover'
              }`}
            >
              <User className={`h-10 w-10 mx-auto mb-3 ${
                !isPair ? 'text-emerald-400' : 'text-muted'
              }`} />
              <p className={`font-semibold ${
                !isPair ? 'text-emerald-400' : 'text-muted'
              }`}>מתאמן אישי</p>
            </button>
            <button
              type="button"
              onClick={() => setIsPair(true)}
              className={`p-6 rounded-xl border-2 transition-all ${
                isPair
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-border bg-surface hover:border-border-hover'
              }`}
            >
              <Users className={`h-10 w-10 mx-auto mb-3 ${
                isPair ? 'text-emerald-400' : 'text-muted'
              }`} />
              <p className={`font-semibold ${
                isPair ? 'text-emerald-400' : 'text-muted'
              }`}>מתאמן זוגי</p>
            </button>
          </div>
        </div>

        {!isPair && (
        <div className="premium-card-static p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-emerald-500/15">
              <User className="h-5 w-5 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">פרטים אישיים</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>שם מלא *</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className={inputClass(!!errors.full_name)}
                placeholder="הכנס שם מלא"
              />
              {errors.full_name && <p className="text-red-400 text-sm mt-1">{errors.full_name}</p>}
            </div>

            <div>
              <label className={labelClass}>מספר טלפון *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className={inputClass(!!errors.phone)}
                placeholder="050-1234567"
              />
              {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className={labelClass}>כתובת אימייל</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className={inputClass(!!errors.email)}
                placeholder="example@email.com"
              />
              {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className={labelClass}>תאריך לידה</label>
              <input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={formData.birth_date}
                onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                className={inputClass(!!errors.birth_date)}
              />
              {errors.birth_date && <p className="text-red-400 text-sm mt-1">{errors.birth_date}</p>}
            </div>

            <div>
              <label className={labelClass}>מין *</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, gender: 'male' }))}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    formData.gender === 'male'
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                      : 'border-border bg-surface text-muted hover:border-border-hover'
                  }`}
                >
                  זכר
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, gender: 'female' }))}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    formData.gender === 'female'
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                      : 'border-border bg-surface text-muted hover:border-border-hover'
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
                value={formData.height}
                onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
                className={inputClass(!!errors.height)}
                placeholder="175"
              />
              {errors.height && <p className="text-red-400 text-sm mt-1">{errors.height}</p>}
            </div>
          </div>
        </div>
        )}

        {isPair && (
        <div className="premium-card-static p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-emerald-500/15">
              <Users className="h-5 w-5 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">פרטי הזוג</h3>
          </div>

          <div className="space-y-8">
            <div className="pb-6 border-b border-border">
              <h4 className="text-base font-semibold text-blue-400 mb-4">מתאמן/ת ראשון/ה</h4>
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
                          : 'border-border bg-surface text-muted hover:border-border-hover'
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
                          : 'border-border bg-surface text-muted hover:border-border-hover'
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
                          : 'border-border bg-surface text-muted hover:border-border-hover'
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
                          : 'border-border bg-surface text-muted hover:border-border-hover'
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
          <h3 className="text-lg font-semibold text-foreground mb-4">הערות מאמן</h3>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full p-4 bg-input border border-border rounded-xl text-foreground placeholder-muted focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            rows={4}
            placeholder="הערות כלליות על המתאמן, מטרות, הגבלות רפואיות וכו'..."
          />
        </div>

        <div className="pb-8">
          <button
            type="submit"
            className="w-full btn-primary py-4 px-6 rounded-xl text-lg font-semibold flex items-center justify-center gap-3"
          >
            <Save className="h-5 w-5" />
            <span>{isPair ? 'שמור זוג' : 'שמור מתאמן'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
