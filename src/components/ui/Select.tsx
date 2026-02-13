import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, fullWidth = false, className = '', id, required, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const errorId = `${selectId}-error`;
    
    return (
      <div className={fullWidth ? 'w-full' : ''} dir="rtl">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-muted mb-2">
            {label}
            {required && <span className="text-danger ml-1" aria-label="שדה חובה">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? errorId : undefined}
            aria-required={required}
            required={required}
            className={`
              w-full px-4 py-3 pr-10
              bg-input/70 border rounded-xl
              text-foreground placeholder-muted
              focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
              transition-all
              appearance-none cursor-pointer
              ${error ? 'border-danger/50 focus:ring-danger/50' : 'border-border/15'}
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
            <ChevronDown className="w-5 h-5 text-muted" />
          </div>
        </div>
        {error && (
          <p id={errorId} className="mt-1 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
