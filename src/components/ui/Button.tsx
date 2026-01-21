import { ButtonHTMLAttributes, forwardRef, useState } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  ripple?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg min-h-[36px]',
  md: 'px-4 py-2.5 text-base rounded-xl min-h-[44px]',
  lg: 'px-6 py-3.5 text-lg rounded-xl min-h-[52px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ripple = true, onClick, 'aria-label': ariaLabel, ...props }, ref) => {
    const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (ripple && !disabled && !loading) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();
        
        setRipples(prev => [...prev, { x, y, id }]);
        setTimeout(() => {
          setRipples(prev => prev.filter(r => r.id !== id));
        }, 600);
      }
      onClick?.(e);
    };

    // Determine ARIA label
    const finalAriaLabel = ariaLabel || (loading ? `${children || 'טוען'}...` : undefined);

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        onClick={handleClick}
        aria-label={finalAriaLabel}
        aria-busy={loading}
        aria-disabled={disabled || loading}
        className={`
          relative inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300
          disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
          active:scale-[0.98]
          focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2 focus:ring-offset-base
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {ripples.map(ripple => (
          <span
            key={ripple.id}
            className="absolute rounded-full bg-inverse/30 animate-ripple pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 20,
              height: 20,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
        {loading ? (
          <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : icon}
        {children && <span className="relative z-10">{children}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
