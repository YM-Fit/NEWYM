import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface RegisterFormProps {
  onToggleMode: () => void;
}

export default function RegisterForm({ onToggleMode }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }

    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, fullName);

    if (error) {
      setError('שגיאה ביצירת חשבון. אנא נסה שוב');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 w-full max-w-md overflow-hidden">
        {/* Premium gradient header */}
        <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-4 shadow-lg">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">YM Coach</h1>
          <p className="text-emerald-100">הרשם למערכת ניהול המתאמנים</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-gradient-to-br from-red-50 to-rose-100 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-right shadow-md transition-all duration-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-right text-sm font-semibold text-gray-700 mb-2">
                שם מלא
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-right transition-all duration-300 hover:border-emerald-300 bg-gray-50 hover:bg-white focus:bg-white"
                placeholder="שם מלא"
              />
            </div>

            <div>
              <label className="block text-right text-sm font-semibold text-gray-700 mb-2">
                אימייל
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-right transition-all duration-300 hover:border-emerald-300 bg-gray-50 hover:bg-white focus:bg-white"
                placeholder="your@email.com"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-right text-sm font-semibold text-gray-700 mb-2">
                סיסמה
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-right transition-all duration-300 hover:border-emerald-300 bg-gray-50 hover:bg-white focus:bg-white"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-right text-sm font-semibold text-gray-700 mb-2">
                אימות סיסמה
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-right transition-all duration-300 hover:border-emerald-300 bg-gray-50 hover:bg-white focus:bg-white"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:shadow-md mt-2"
            >
              {loading ? 'יוצר חשבון...' : 'הרשם'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={onToggleMode}
              className="text-emerald-600 hover:text-teal-700 font-semibold transition-all duration-300 hover:underline"
            >
              כבר יש לך חשבון? התחבר כאן
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
