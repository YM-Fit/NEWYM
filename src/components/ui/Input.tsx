import { InputHTMLAttributes, forwardRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  success?: boolean;
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, success, showPasswordToggle, className = '', id, type, ...props }, ref) => {
    const inputId = id || label?.replace(/\s+/g, '-').toLowerCase();
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputType = showPasswordToggle && type === 'password' ? (showPassword ? 'text' : 'password') : type;

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
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`
              w-full px-4 py-3.5 rounded-xl glass-input
              text-white placeholder-zinc-500
              transition-all duration-300
              ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' : ''}
              ${success && !error ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/30' : ''}
              ${showPasswordToggle ? 'pr-12' : ''}
              ${isFocused ? 'shadow-lg' : ''}
              ${className}
            `}
            {...props}
          />
          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors rounded-lg hover:bg-zinc-800/50"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          )}
          {(error || success) && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {error ? (
                <AlertCircle className="w-5 h-5 text-red-400" />
              ) : success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : null}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-400 flex items-center gap-1.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="mt-2 text-sm text-zinc-500 flex items-center gap-1.5">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
