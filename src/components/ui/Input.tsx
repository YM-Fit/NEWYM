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
              error ? 'text-danger' : success ? 'text-success' : 'text-muted'
            }`}
          >
            {label}
            {required && <span className="text-danger ml-1" aria-label="שדה חובה">*</span>}
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
              w-full px-4 py-2.5 rounded-xl glass-input
              text-foreground placeholder-muted
              transition-all duration-250
              focus:outline-none focus:ring-2
              ${error ? 'border-danger/50 focus:border-danger focus:ring-danger/50' : ''}
              ${success && !error ? 'border-success/50 focus:border-success focus:ring-success/50' : ''}
              ${!error && !success ? 'focus:ring-primary/50 focus:border-primary/50' : ''}
              ${showPasswordToggle ? 'pr-12' : ''}
              ${(error || success) && showPasswordToggle ? 'pl-12' : ''}
              ${isFocused ? 'shadow-md' : ''}
              ${className}
            `}
            {...props}
          />
          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-foreground transition-colors rounded-lg hover:bg-surface/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                <AlertCircle className="w-5 h-5 text-danger" />
              ) : success ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : null}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-2 text-sm text-danger flex items-center gap-1.5 animate-fade-in" role="alert">
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-2 text-sm text-muted flex items-center gap-1.5">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
