import { forwardRef } from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex items-start gap-3" dir="rtl">
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            className="sr-only peer"
            {...props}
          />
          <div className="w-5 h-5 rounded border-2 border-zinc-700 bg-zinc-800/50 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all flex items-center justify-center peer-focus:ring-2 peer-focus:ring-emerald-500/50">
            <Check className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
          </div>
        </div>
        {label && (
          <label
            htmlFor={props.id}
            className="text-sm text-zinc-300 cursor-pointer select-none"
          >
            {label}
          </label>
        )}
        {error && (
          <p className="text-sm text-red-400 mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
