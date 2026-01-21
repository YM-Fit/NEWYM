import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'bordered' | 'premium';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const variantStyles = {
  default: 'bg-card border border-border/10',
  glass: 'glass-card',
  bordered: 'bg-transparent border-2 border-border/20',
  premium: 'premium-card',
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', hover = false, className = '', children, ...props }, ref) => {
    const hoverClass = hover && variant !== 'premium'
      ? 'transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-border-hover/40'
      : '';
    
    return (
      <div
        ref={ref}
        className={`
          rounded-2xl shadow-xl
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${hoverClass}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
