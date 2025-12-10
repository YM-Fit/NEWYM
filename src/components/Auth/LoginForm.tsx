import { useState } from 'react';
import { LogIn, Users, TrendingUp, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface LoginFormProps {
  onToggleMode: () => void;
}

const demoTrainees = [
  { name: 'דני כהן', progress: 'אימון היום: חזה וזרועות', status: 'active' },
  { name: 'מיכל לוי', progress: 'אימון אחרון: לפני יומיים', status: 'active' },
  { name: 'יוסי מזרחי', progress: 'יעד: ירידה ב-5 ק״ג', status: 'active' },
];

export default function LoginForm({ onToggleMode }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError('אימייל או סיסמה שגויים');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">YM Coach</h1>
            <p className="text-gray-600">התחבר למערכת ניהול המתאמנים</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-right">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-right text-sm font-medium text-gray-700 mb-2">
                אימייל
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-right"
                placeholder="your@email.com"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-right text-sm font-medium text-gray-700 mb-2">
                סיסמה
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-right"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'מתחבר...' : 'התחבר'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={onToggleMode}
              className="text-green-600 hover:text-green-700 font-medium"
            >
              אין לך חשבון? הירשם כאן
            </button>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-green-600 to-green-800 p-12 items-center justify-center">
        <div className="max-w-lg text-white">
          <h2 className="text-4xl font-bold mb-6 text-right">נהל את המתאמנים שלך בקלות</h2>
          <p className="text-green-100 mb-8 text-right text-lg">
            מערכת ניהול מתקדמת למאמנים אישיים - תכנון אימונים, מעקב אחר התקדמות, וניהול מדידות
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-right">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">ניהול מתאמנים חכם</h3>
                <p className="text-green-100 text-sm">מעקב אחר כל מתאמן ויעדיו האישיים</p>
              </div>
              <Users className="w-8 h-8" />
            </div>
            <div className="flex items-center gap-3 text-right">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">מעקב התקדמות</h3>
                <p className="text-green-100 text-sm">גרפים ונתונים מפורטים</p>
              </div>
              <TrendingUp className="w-8 h-8" />
            </div>
            <div className="flex items-center gap-3 text-right">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">תכנון אימונים</h3>
                <p className="text-green-100 text-sm">יצירת תוכניות אימון מותאמות אישית</p>
              </div>
              <Calendar className="w-8 h-8" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h3 className="font-semibold mb-4 text-right">המתאמנים שלך</h3>
            <div className="space-y-3">
              {demoTrainees.map((trainee, index) => (
                <div
                  key={index}
                  className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                    <h4 className="font-semibold">{trainee.name}</h4>
                  </div>
                  <p className="text-green-100 text-sm text-right">{trainee.progress}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
