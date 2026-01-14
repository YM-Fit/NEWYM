import { InputHTMLAttributes, forwardRef, useState, useId } from 'react';
import { CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  success?: boolean;
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, success, showPasswordToggle, className = '', id, type, required, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputType = showPasswordToggle && type === 'password' ? (showPassword ? 'text' : 'password') : type;
    
    const ariaDescribedBy = [
      error ? errorId : null,
      hint && !error ? hintId : null,
    ].filter(Boolean).join(' ') || undefined;

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId} 
            className={`block text-sm font-semibold mb-2.5 transition-colors ${
              error ? 'text-red-400' : success ? 'text-emerald-400' : 'text-zinc-400'
            }`}
          >
            {label}
            {required && <span className="text-red-400 ml-1" aria-label="שדה חובה">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={ariaDescribedBy}
            aria-required={required}
            required={required}
            className={`
              w-full px-4 py-3.5 rounded-xl glass-input
              text-white placeholder-zinc-500
              transition-all duration-300
              focus:outline-none focus:ring-2
              ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' : ''}
              ${success && !error ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/50' : ''}
              ${!error && !success ? 'focus:ring-emerald-500/50 focus:border-emerald-500/50' : ''}
              ${showPasswordToggle ? 'pr-12' : ''}
              ${(error || success) && showPasswordToggle ? 'pl-12' : ''}
              ${isFocused ? 'shadow-lg' : ''}
              ${className}
            `}
            {...props}
          />
          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors rounded-lg hover:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
              aria-pressed={showPassword}
              tabIndex={0}
            >
              {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
            </button>
          )}
          {(error || success) && !showPasswordToggle && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
              {error ? (
                <AlertCircle className="w-5 h-5 text-red-400" />
              ) : success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : null}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-2 text-sm text-red-400 flex items-center gap-1.5 animate-fade-in" role="alert">
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-2 text-sm text-zinc-500 flex items-center gap-1.5">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
