import { useState, useEffect } from 'react';
import { Activity, User, Dumbbell, Eye, EyeOff, ArrowRight, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { checkRateLimit, recordFailedAttempt, clearRateLimit, getRateLimitMessage } from '../../utils/rateLimit';

interface LoginFormProps {
  onToggleMode: () => void;
}

type UserType = 'trainer' | 'trainee';

export default function LoginForm({ onToggleMode }: LoginFormProps) {
  const [userType, setUserType] = useState<UserType>('trainer');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const { signIn, signInTrainee } = useAuth();

  useEffect(() => {
    if (identifier) {
      const result = checkRateLimit(identifier);
      setIsLocked(!result.allowed);
      if (!result.allowed) {
        setError(getRateLimitMessage(result));
      }
    }
  }, [identifier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setWarning('');

    const rateLimitCheck = checkRateLimit(identifier);
    if (!rateLimitCheck.allowed) {
      setError(getRateLimitMessage(rateLimitCheck));
      setIsLocked(true);
      return;
    }

    setLoading(true);

    try {
      let loginError = null;

      if (userType === 'trainer') {
        const { error } = await signIn(identifier, password);
        loginError = error;
      } else {
        const { error } = await signInTrainee(identifier, password);
        loginError = error;
      }

      if (loginError) {
        const result = recordFailedAttempt(identifier);
        setIsLocked(!result.allowed);

        if (!result.allowed) {
          setError(getRateLimitMessage(result));
        } else {
          setError(userType === 'trainer' ? 'אימייל או סיסמה שגויים' : 'מספר טלפון או סיסמה שגויים');
          const warningMsg = getRateLimitMessage(result);
          if (warningMsg) {
            setWarning(warningMsg);
          }
        }
      } else {
        clearRateLimit(identifier);
      }
    } catch {
      setError('שגיאה בהתחברות');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-radial from-emerald-500/10 via-transparent to-transparent blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-radial from-emerald-500/5 via-transparent to-transparent blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse-soft" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="premium-card-static p-8 md:p-10 animate-scale-in">
          <div className="text-center mb-10 animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 mb-6 shadow-glow-lg animate-float-slow relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
              <Activity className="w-10 h-10 text-white relative z-10" />
              <div className="absolute inset-0 bg-emerald-400/30 blur-xl animate-pulse-soft" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              YM Coach
            </h1>
            <p className="text-zinc-400 text-sm md:text-base animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              {userType === 'trainer' ? 'מערכת ניהול מתאמנים מקצועית' : 'ברוכים הבאים לאזור האישי'}
            </p>
          </div>

          <div className="flex gap-3 mb-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <button
              type="button"
              onClick={() => {
                setUserType('trainer');
                setIdentifier('');
                setError('');
              }}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-semibold transition-all duration-300 relative overflow-hidden group ${
                userType === 'trainer'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-glow-lg scale-105'
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 border border-zinc-700/50 hover:border-zinc-600 hover:scale-[1.02]'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <User className={`w-5 h-5 relative z-10 transition-transform ${userType === 'trainer' ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className="relative z-10">מאמן</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUserType('trainee');
                setIdentifier('');
                setError('');
              }}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-semibold transition-all duration-300 relative overflow-hidden group ${
                userType === 'trainee'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-glow-lg scale-105'
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 border border-zinc-700/50 hover:border-zinc-600 hover:scale-[1.02]'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Dumbbell className={`w-5 h-5 relative z-10 transition-transform ${userType === 'trainee' ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className="relative z-10">מתאמן</span>
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3.5 rounded-xl mb-4 text-right text-sm flex items-center gap-2.5 animate-slide-in-top backdrop-blur-sm shadow-lg shadow-red-500/10">
              <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          {warning && !error && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-3.5 rounded-xl mb-4 text-right text-sm flex items-center gap-2.5 animate-slide-in-top backdrop-blur-sm shadow-lg shadow-amber-500/10">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-pulse" />
              <span className="flex-1">{warning}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="space-y-2">
              <label className="block text-right text-sm font-semibold text-zinc-400 mb-2.5">
                {userType === 'trainer' ? 'אימייל' : 'מספר טלפון'}
              </label>
              <input
                type={userType === 'trainer' ? 'email' : 'tel'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={isLocked}
                className="w-full px-4 py-3.5 rounded-xl glass-input text-right text-white placeholder-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder={userType === 'trainer' ? 'your@email.com' : '0526492728'}
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-right text-sm font-semibold text-zinc-400 mb-2.5">
                סיסמה
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLocked}
                  className="w-full px-4 py-3.5 pl-12 rounded-xl glass-input text-right text-white placeholder-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="הזן סיסמה"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLocked}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-zinc-300 transition-all rounded-lg hover:bg-zinc-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full btn-primary py-4 px-6 rounded-xl text-base font-semibold flex items-center justify-center gap-2 mt-8 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>מתחבר...</span>
                </span>
              ) : (
                <>
                  <span>התחבר</span>
                  <ArrowRight className="w-5 h-5 rotate-180 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {userType === 'trainer' && (
            <div className="mt-8 pt-6 border-t border-zinc-800">
              <p className="text-center text-zinc-500 text-sm">
                אין לך חשבון?{' '}
                <button
                  onClick={onToggleMode}
                  className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                >
                  הירשם כאן
                </button>
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-zinc-600 text-xs mt-6">
          YM Coach - מערכת ניהול אימונים מתקדמת
        </p>
      </div>
    </div>
  );
}
