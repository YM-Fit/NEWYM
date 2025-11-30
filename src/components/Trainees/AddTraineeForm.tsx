import { ArrowRight, Save, User, Users } from 'lucide-react';
import { useState } from 'react';

interface AddTraineeFormProps {
  onBack: () => void;
  onSave: (trainee: any) => void;
}

export default function AddTraineeForm({ onBack, onSave }: AddTraineeFormProps) {
  const [isPair, setIsPair] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
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
    const newErrors: Record<string, string> = {};

    if (isPair) {
      if (!formData.pair_name_1.trim()) newErrors.pair_name_1 = 'שם ראשון נדרש';
      if (!formData.pair_name_2.trim()) newErrors.pair_name_2 = 'שם שני נדרש';
      if (!formData.pair_phone_1.trim()) newErrors.pair_phone_1 = 'טלפון ראשון נדרש';
      if (!formData.pair_phone_2.trim()) newErrors.pair_phone_2 = 'טלפון שני נדרש';
      if (!formData.pair_height_1 || Number(formData.pair_height_1) < 1) newErrors.pair_height_1 = 'גובה תקין נדרש';
      if (!formData.pair_height_2 || Number(formData.pair_height_2) < 1) newErrors.pair_height_2 = 'גובה תקין נדרש';
      if (formData.pair_email_1 && !/\S+@\S+\.\S+/.test(formData.pair_email_1)) {
        newErrors.pair_email_1 = 'כתובת אימייל לא תקינה';
      }
      if (formData.pair_email_2 && !/\S+@\S+\.\S+/.test(formData.pair_email_2)) {
        newErrors.pair_email_2 = 'כתובת אימייל לא תקינה';
      }
    } else {
      if (!formData.full_name.trim()) newErrors.full_name = 'שם מלא נדרש';
      if (!formData.phone.trim()) newErrors.phone = 'מספר טלפון נדרש';
      if (!formData.height || Number(formData.height) < 1) newErrors.height = 'גובה תקין נדרש';
      if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'כתובת אימייל לא תקינה';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
        status: 'new' as const,
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
        status: 'new' as const,
        notes: formData.notes.trim(),
        is_pair: false,
      };
      onSave(newTrainee);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-6">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <button
            onClick={onBack}
            className="p-3 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowRight className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">הוסף מתאמן חדש</h1>
            <p className="text-gray-600">מלא את הפרטים הבסיסיים של המתאמן</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Trainee Type Selection */}
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">סוג מתאמן</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setIsPair(false)}
              className={`p-6 rounded-xl border-2 transition-all ${
                !isPair
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <User className={`h-12 w-12 mx-auto mb-3 ${
                !isPair ? 'text-green-600' : 'text-gray-400'
              }`} />
              <p className={`font-semibold ${
                !isPair ? 'text-green-700' : 'text-gray-600'
              }`}>מתאמן אישי</p>
            </button>
            <button
              type="button"
              onClick={() => setIsPair(true)}
              className={`p-6 rounded-xl border-2 transition-all ${
                isPair
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <Users className={`h-12 w-12 mx-auto mb-3 ${
                isPair ? 'text-green-600' : 'text-gray-400'
              }`} />
              <p className={`font-semibold ${
                isPair ? 'text-green-700' : 'text-gray-600'
              }`}>מתאמן זוגי</p>
            </button>
          </div>
        </div>

        {/* Basic Information */}
        {!isPair && (
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
          <div className="flex items-center space-x-3 rtl:space-x-reverse mb-6">
            <div className="bg-green-50 p-3 rounded-lg">
              <User className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">פרטים אישיים</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                שם מלא *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className={`w-full p-4 text-lg border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.full_name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="הכנס שם מלא"
              />
              {errors.full_name && <p className="text-red-600 text-sm mt-1">{errors.full_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                מספר טלפון *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className={`w-full p-4 text-lg border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.phone ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="050-1234567"
              />
              {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                כתובת אימייל
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className={`w-full p-4 text-lg border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="example@email.com"
              />
              {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                תאריך לידה
              </label>
              <input
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                className="w-full p-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                מין *
              </label>
              <div className="flex space-x-4 rtl:space-x-reverse">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, gender: 'male' }))}
                  className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                    formData.gender === 'male'
                      ? 'border-green-300 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  זכר
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, gender: 'female' }))}
                  className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                    formData.gender === 'female'
                      ? 'border-green-300 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  נקבה
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                גובה (ס״מ) *
              </label>
              <input
                type="number"
                min="1"
                max="250"
                value={formData.height}
                onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
                className={`w-full p-4 text-lg border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.height ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="175"
              />
              {errors.height && <p className="text-red-600 text-sm mt-1">{errors.height}</p>}
            </div>
          </div>
        </div>
        )}

        {/* Pair Information */}
        {isPair && (
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
          <div className="flex items-center space-x-3 rtl:space-x-reverse mb-6">
            <div className="bg-green-50 p-3 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">פרטי הזוג</h3>
          </div>

          <div className="space-y-8">
            {/* Person 1 */}
            <div className="border-b pb-6">
              <h4 className="text-md font-semibold text-gray-700 mb-4">מתאמן/ת ראשון/ה</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">שם מלא *</label>
                  <input
                    type="text"
                    value={formData.pair_name_1}
                    onChange={(e) => setFormData(prev => ({ ...prev, pair_name_1: e.target.value }))}
                    className={`w-full p-4 text-lg border rounded-lg focus:ring-2 focus:ring-green-500 ${
                      errors.pair_name_1 ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="הכנס שם מלא"
                  />
                  {errors.pair_name_1 && <p className="text-red-600 text-sm mt-1">{errors.pair_name_1}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">מספר טלפון *</label>
                  <input
                    type="tel"
                    value={formData.pair_phone_1}
                    onChange={(e) => setFormData(prev => ({ ...prev, pair_phone_1: e.target.value }))}
                    className={`w-full p-4 text-lg border rounded-lg focus:ring-2 focus:ring-green-500 ${
                      errors.pair_phone_1 ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="050-1234567"
                  />
                  {errors.pair_phone_1 && <p className="text-red-600 text-sm mt-1">{errors.pair_phone_1}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">כתובת אימייל</label>
                  <input
                    type="email"
                    value={formData.pair_email_1}
                    onChange={(e) => setFormData(prev => ({ ...prev, pair_email_1: e.target.value }))}
                    className={`w-full p-4 text-lg border rounded-lg focus:ring-2 focus:ring-green-500 ${
                      errors.pair_email_1 ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="example@email.com"
                  />
                  {errors.pair_email_1 && <p className="text-red-600 text-sm mt-1">{errors.pair_email_1}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">תאריך לידה</label>
                  <input
                    type="date"
                    value={formData.pair_birth_date_1}
                    onChange={(e) => setFormData(prev => ({ ...prev, pair_birth_date_1: e.target.value }))}
                    className="w-full p-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">מין *</label>
                  <div className="flex space-x-4 rtl:space-x-reverse">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, pair_gender_1: 'male' }))}
                      className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                        formData.pair_gender_1 === 'male'
                          ? 'border-green-300 bg-green-50 text-green-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      זכר
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, pair_gender_1: 'female' }))}
                      className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                        formData.pair_gender_1 === 'female'
                          ? 'border-green-300 bg-green-50 text-green-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      נקבה
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">גובה (ס״מ) *</label>
                  <input
                    type="number"
                    min="1"
                    max="250"
                    value={formData.pair_height_1}
                    onChange={(e) => setFormData(prev => ({ ...prev, pair_height_1: e.target.value }))}
                    className={`w-full p-4 text-lg border rounded-lg focus:ring-2 focus:ring-green-500 ${
                      errors.pair_height_1 ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="165"
                  />
                  {errors.pair_height_1 && <p className="text-red-600 text-sm mt-1">{errors.pair_height_1}</p>}
                </div>
              </div>
            </div>

            {/* Person 2 */}
            <div>
              <h4 className="text-md font-semibold text-gray-700 mb-4">מתאמן/ת שני/ה</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">שם מלא *</label>
                  <input
                    type="text"
                    value={formData.pair_name_2}
                    onChange={(e) => setFormData(prev => ({ ...prev, pair_name_2: e.target.value }))}
                    className={`w-full p-4 text-lg border rounded-lg focus:ring-2 focus:ring-green-500 ${
                      errors.pair_name_2 ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="הכנס שם מלא"
                  />
                  {errors.pair_name_2 && <p className="text-red-600 text-sm mt-1">{errors.pair_name_2}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">מספר טלפון *</label>
                  <input
                    type="tel"
                    value={formData.pair_phone_2}
                    onChange={(e) => setFormData(prev => ({ ...prev, pair_phone_2: e.target.value }))}
                    className={`w-full p-4 text-lg border rounded-lg focus:ring-2 focus:ring-green-500 ${
                      errors.pair_phone_2 ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="050-1234567"
                  />
                  {errors.pair_phone_2 && <p className="text-red-600 text-sm mt-1">{errors.pair_phone_2}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">כתובת אימייל</label>
                  <input
                    type="email"
                    value={formData.pair_email_2}
                    onChange={(e) => setFormData(prev => ({ ...prev, pair_email_2: e.target.value }))}
                    className={`w-full p-4 text-lg border rounded-lg focus:ring-2 focus:ring-green-500 ${
                      errors.pair_email_2 ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="example@email.com"
                  />
                  {errors.pair_email_2 && <p className="text-red-600 text-sm mt-1">{errors.pair_email_2}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">תאריך לידה</label>
                  <input
                    type="date"
                    value={formData.pair_birth_date_2}
                    onChange={(e) => setFormData(prev => ({ ...prev, pair_birth_date_2: e.target.value }))}
                    className="w-full p-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">מין *</label>
                  <div className="flex space-x-4 rtl:space-x-reverse">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, pair_gender_2: 'male' }))}
                      className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                        formData.pair_gender_2 === 'male'
                          ? 'border-green-300 bg-green-50 text-green-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      זכר
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, pair_gender_2: 'female' }))}
                      className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                        formData.pair_gender_2 === 'female'
                          ? 'border-green-300 bg-green-50 text-green-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      נקבה
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">גובה (ס״מ) *</label>
                  <input
                    type="number"
                    min="1"
                    max="250"
                    value={formData.pair_height_2}
                    onChange={(e) => setFormData(prev => ({ ...prev, pair_height_2: e.target.value }))}
                    className={`w-full p-4 text-lg border rounded-lg focus:ring-2 focus:ring-green-500 ${
                      errors.pair_height_2 ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="170"
                  />
                  {errors.pair_height_2 && <p className="text-red-600 text-sm mt-1">{errors.pair_height_2}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">הערות מאמן</h3>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={4}
            placeholder="הערות כלליות על המתאמן, מטרות, הגבלות רפואיות וכו'..."
          />
        </div>

        {/* Submit Button */}
        <div className="pb-8">
          <button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 text-white py-4 px-6 rounded-xl text-lg font-medium flex items-center justify-center space-x-3 rtl:space-x-reverse transition-colors"
          >
            <Save className="h-6 w-6" />
            <span>{isPair ? 'שמור זוג' : 'שמור מתאמן'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}