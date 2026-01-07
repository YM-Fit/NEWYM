import { useState } from 'react';
import { Activity, User, Dumbbell } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card p-8 w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-lime-500 to-lime-600 mb-4 shadow-glow">
            <Activity className="w-10 h-10 text-dark-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 glow-text">YM Coach</h1>
          <p className="text-gray-400">
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
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
              userType === 'trainer'
                ? 'btn-lime'
                : 'btn-glass'
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
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
              userType === 'trainee'
                ? 'btn-lime'
                : 'btn-glass'
            }`}
          >
            <Dumbbell className="w-5 h-5" />
            מתאמן
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-4 text-right">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-right text-sm font-medium text-gray-300 mb-2">
              {userType === 'trainer' ? 'אימייל' : 'מספר טלפון'}
            </label>
            <input
              type={userType === 'trainer' ? 'email' : 'tel'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl glass-input text-right"
              placeholder={userType === 'trainer' ? 'your@email.com' : '0526492728'}
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-right text-sm font-medium text-gray-300 mb-2">
              סיסמה
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl glass-input text-right"
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-lime py-3 px-4 rounded-xl text-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-dark-500 border-t-transparent rounded-full animate-spin" />
                מתחבר...
              </span>
            ) : (
              'התחבר'
            )}
          </button>
        </form>

        {userType === 'trainer' && (
          <div className="mt-6 text-center">
            <button
              onClick={onToggleMode}
              className="text-lime-500 hover:text-lime-400 font-medium transition-colors"
            >
              אין לך חשבון? הירשם כאן
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
