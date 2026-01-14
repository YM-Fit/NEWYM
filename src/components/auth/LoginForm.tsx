import { useState, useEffect } from 'react';
import { Activity, User, Dumbbell, Eye, EyeOff, ArrowRight, AlertTriangle, Mail, Phone, Lock, Star } from 'lucide-react';
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
  const [focusedField, setFocusedField] = useState<string | null>(null);
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950/20">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated gradient orbs */}
        <div className="absolute -top-1/2 -right-1/2 w-[800px] h-[800px] bg-gradient-radial from-emerald-500/15 via-emerald-500/5 to-transparent blur-3xl animate-pulse-soft" />
        <div className="absolute -bottom-1/2 -left-1/2 w-[700px] h-[700px] bg-gradient-radial from-emerald-400/10 via-transparent to-transparent blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-emerald-400/6 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '2s' }} />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="relative w-full max-w-md z-10">
        {/* Main Card */}
        <div className="premium-card-static p-8 md:p-10 animate-scale-in relative overflow-hidden">
          {/* Card glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
          
          {/* Header Section */}
          <div className="text-center mb-10 animate-fade-in-up relative z-10">
            {/* Logo with enhanced effects */}
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 mb-6 shadow-2xl shadow-emerald-500/30 animate-float-slow relative overflow-hidden group">
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-emerald-400/20 to-emerald-300/30 animate-gradient-x" />
              
              {/* Icon */}
              <Activity className="w-12 h-12 text-white relative z-10 drop-shadow-lg transition-transform group-hover:scale-110" />
              
              {/* Glow effect */}
              <div className="absolute inset-0 bg-emerald-400/40 blur-2xl animate-pulse-soft" />
              
              {/* Sparkle effects */}
              <Star className="absolute top-2 right-2 w-4 h-4 text-white/60 animate-pulse fill-white/40" style={{ animationDelay: '0.5s' }} />
            </div>
            
            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-400 bg-clip-text text-transparent animate-gradient-x bg-[length:200%_auto]">
                YM Coach
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-zinc-400 text-base md:text-lg animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              {userType === 'trainer' ? 'מערכת ניהול מתאמנים מקצועית' : 'ברוכים הבאים לאזור האישי'}
            </p>
          </div>

          {/* User Type Selector */}
          <div className="flex gap-3 mb-8 animate-fade-in-up relative z-10" style={{ animationDelay: '0.3s' }}>
            <button
              type="button"
              onClick={() => {
                setUserType('trainer');
                setIdentifier('');
                setError('');
                setWarning('');
              }}
              className={`flex-1 flex items-center justify-center gap-2.5 py-4 px-5 rounded-xl font-semibold transition-all duration-300 relative overflow-hidden group ${
                userType === 'trainer'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-105'
                  : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-300 border border-zinc-700/50 hover:border-emerald-500/30 hover:scale-[1.02] backdrop-blur-sm'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <User className={`w-5 h-5 relative z-10 transition-all ${userType === 'trainer' ? 'scale-110 drop-shadow-lg' : 'group-hover:scale-110'}`} />
              <span className="relative z-10">מאמן</span>
              {userType === 'trainer' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-500" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setUserType('trainee');
                setIdentifier('');
                setError('');
                setWarning('');
              }}
              className={`flex-1 flex items-center justify-center gap-2.5 py-4 px-5 rounded-xl font-semibold transition-all duration-300 relative overflow-hidden group ${
                userType === 'trainee'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-105'
                  : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-300 border border-zinc-700/50 hover:border-emerald-500/30 hover:scale-[1.02] backdrop-blur-sm'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Dumbbell className={`w-5 h-5 relative z-10 transition-all ${userType === 'trainee' ? 'scale-110 drop-shadow-lg' : 'group-hover:scale-110'}`} />
              <span className="relative z-10">מתאמן</span>
              {userType === 'trainee' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-500" />
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 animate-slide-in-top relative z-10">
              <div className="bg-gradient-to-r from-red-500/15 via-red-500/10 to-red-500/15 border border-red-500/40 text-red-300 px-5 py-4 rounded-xl text-right text-sm flex items-start gap-3 backdrop-blur-sm shadow-xl shadow-red-500/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/5 to-transparent animate-shimmer" />
                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0 mt-1 shadow-lg shadow-red-400/50" />
                <span className="flex-1 font-medium leading-relaxed">{error}</span>
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-400/80" />
              </div>
            </div>
          )}

          {/* Warning Message */}
          {warning && !error && (
            <div className="mb-6 animate-slide-in-top relative z-10">
              <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/15 border border-amber-500/40 text-amber-300 px-5 py-4 rounded-xl text-right text-sm flex items-start gap-3 backdrop-blur-sm shadow-xl shadow-amber-500/20">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400 animate-pulse" />
                <span className="flex-1 font-medium leading-relaxed">{warning}</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up relative z-10" style={{ animationDelay: '0.4s' }}>
            {/* Email/Phone Input */}
            <div className="space-y-2.5">
              <label className="block text-right text-sm font-semibold text-zinc-400 mb-2.5 flex items-center gap-2 justify-end">
                <span>{userType === 'trainer' ? 'אימייל' : 'מספר טלפון'}</span>
                {userType === 'trainer' ? (
                  <Mail className="w-4 h-4 text-zinc-500" />
                ) : (
                  <Phone className="w-4 h-4 text-zinc-500" />
                )}
              </label>
              <div className="relative group">
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-all duration-300 ${focusedField === 'identifier' ? 'text-emerald-400 scale-110' : 'group-hover:text-zinc-400'}`}>
                  {userType === 'trainer' ? <Mail className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                </div>
                <input
                  type={userType === 'trainer' ? 'email' : 'tel'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onFocus={() => setFocusedField('identifier')}
                  onBlur={() => setFocusedField(null)}
                  required
                  disabled={isLocked}
                  className="w-full px-4 py-4 pr-12 rounded-xl glass-input text-right text-white placeholder-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  placeholder={userType === 'trainer' ? 'your@email.com' : '0526492728'}
                  dir="ltr"
                />
                {focusedField === 'identifier' && (
                  <div className="absolute inset-0 rounded-xl border-2 border-emerald-500/50 pointer-events-none animate-pulse-soft" />
                )}
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2.5">
              <label className="block text-right text-sm font-semibold text-zinc-400 mb-2.5 flex items-center gap-2 justify-end">
                <span>סיסמה</span>
                <Lock className="w-4 h-4 text-zinc-500" />
              </label>
              <div className="relative group">
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-all duration-300 ${focusedField === 'password' ? 'text-emerald-400 scale-110' : 'group-hover:text-zinc-400'}`}>
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  required
                  disabled={isLocked}
                  className="w-full px-4 py-4 pr-12 pl-12 rounded-xl glass-input text-right text-white placeholder-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  placeholder="הזן סיסמה"
                />
                {focusedField === 'password' && (
                  <div className="absolute inset-0 rounded-xl border-2 border-emerald-500/50 pointer-events-none animate-pulse-soft" />
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLocked}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-emerald-400 transition-all rounded-lg hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed group/eye"
                  aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 transition-transform group-hover/eye:scale-110" />
                  ) : (
                    <Eye className="w-5 h-5 transition-transform group-hover/eye:scale-110" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full btn-primary py-4.5 px-6 rounded-xl text-base font-semibold flex items-center justify-center gap-3 mt-8 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2.5 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>מתחבר...</span>
                </>
              ) : (
                <>
                  <span className="relative z-10">התחבר</span>
                  <ArrowRight className="w-5 h-5 rotate-180 transition-all duration-300 group-hover:translate-x-1 group-hover:scale-110 relative z-10" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          {userType === 'trainer' && (
            <div className="mt-8 pt-6 border-t border-zinc-800/50 relative z-10 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
              <p className="text-center text-zinc-500 text-sm">
                אין לך חשבון?{' '}
                <button
                  onClick={onToggleMode}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold transition-all duration-300 hover:underline underline-offset-2 relative group"
                >
                  <span className="relative z-10">הירשם כאן</span>
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400/30 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-right" />
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-600 text-xs mt-6 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          YM Coach - מערכת ניהול אימונים מתקדמת
        </p>
      </div>
    </div>
  );
}
