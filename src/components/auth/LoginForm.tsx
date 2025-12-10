import { useState } from 'react';
import { LogIn, User, Dumbbell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface LoginFormProps {
  onToggleMode: () => void;
}

type UserType = 'trainer' | 'trainee';

export default function LoginForm({ onToggleMode }: LoginFormProps) {
  const [userType, setUserType] = useState<UserType>('trainer');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signInTrainee } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (userType === 'trainer') {
        const { error } = await signIn(identifier, password);
        if (error) {
          setError('אימייל או סיסמה שגויים');
        }
      } else {
        const { error } = await signInTrainee(identifier, password);
        if (error) {
          setError(error.message || 'מספר טלפון או סיסמה שגויים');
        }
      }
    } catch (err) {
      setError('שגיאה בהתחברות');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">YM Coach</h1>
          <p className="text-gray-600">
            {userType === 'trainer' ? 'התחבר למערכת ניהול המתאמנים' : 'התחבר לאזור האישי'}
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => {
              setUserType('trainer');
              setIdentifier('');
              setError('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
              userType === 'trainer'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <User className="w-5 h-5" />
            מאמן
          </button>
          <button
            type="button"
            onClick={() => {
              setUserType('trainee');
              setIdentifier('');
              setError('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
              userType === 'trainee'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Dumbbell className="w-5 h-5" />
            מתאמן
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-right">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-right text-sm font-medium text-gray-700 mb-2">
              {userType === 'trainer' ? 'אימייל' : 'מספר טלפון'}
            </label>
            <input
              type={userType === 'trainer' ? 'email' : 'tel'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-right"
              placeholder={userType === 'trainer' ? 'your@email.com' : '0526492728'}
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
              placeholder="********"
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

        {userType === 'trainer' && (
          <div className="mt-6 text-center">
            <button
              onClick={onToggleMode}
              className="text-green-600 hover:text-green-700 font-medium"
            >
              אין לך חשבון? הירשם כאן
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
