import { forwardRef, useId } from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id || generatedId;
    const errorId = `${checkboxId}-error`;
    
    return (
      <div className="flex flex-col gap-2" dir="rtl">
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              ref={ref}
              id={checkboxId}
              type="checkbox"
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? errorId : undefined}
              className="sr-only peer"
              {...props}
            />
            <div className="w-5 h-5 rounded border-2 border-border/30 bg-surface/60 peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center peer-focus:ring-2 peer-focus:ring-primary/50 peer-focus:outline-none">
              <Check className="w-3 h-3 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity" aria-hidden="true" />
            </div>
          </div>
          {label && (
            <label
              htmlFor={checkboxId}
              className="text-sm text-secondary cursor-pointer select-none"
            >
              {label}
            </label>
          )}
        </div>
        {error && (
          <p id={errorId} className="text-sm text-danger ml-8" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
