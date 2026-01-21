import { forwardRef } from 'react';

interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex items-center gap-3" dir="rtl">
        <div className="relative flex-shrink-0">
          <input
            ref={ref}
            type="radio"
            className="sr-only peer"
            {...props}
          />
          <div className="w-5 h-5 rounded-full border-2 border-border/30 bg-surface/60 peer-checked:border-primary transition-all flex items-center justify-center peer-focus:ring-2 peer-focus:ring-primary/50">
            <div className="w-2.5 h-2.5 rounded-full bg-primary opacity-0 peer-checked:opacity-100 transition-opacity" />
          </div>
        </div>
        <label
          htmlFor={props.id}
          className="text-sm text-secondary cursor-pointer select-none"
        >
          {label}
        </label>
        {error && (
          <p className="text-sm text-danger">{error}</p>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';
