interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
  variant?: 'spinner' | 'dots' | 'pulse' | 'ring' | 'bars';
  className?: string;
}

const sizeStyles = {
  sm: { spinner: 'h-4 w-4 border-2', dots: 'h-2 w-2', ring: 'h-4 w-4', bars: 'h-3 w-1' },
  md: { spinner: 'h-8 w-8 border-3', dots: 'h-3 w-3', ring: 'h-8 w-8', bars: 'h-4 w-1.5' },
  lg: { spinner: 'h-12 w-12 border-4', dots: 'h-4 w-4', ring: 'h-12 w-12', bars: 'h-6 w-2' },
  xl: { spinner: 'h-16 w-16 border-4', dots: 'h-5 w-5', ring: 'h-16 w-16', bars: 'h-8 w-2.5' },
};

export function LoadingSpinner({ 
  size = 'md', 
  text, 
  fullScreen = false,
  variant = 'spinner',
  className = ''
}: LoadingSpinnerProps) {
  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className={`flex items-center gap-2 ${className}`}>
            <div 
              className={`${sizeStyles[size].dots} bg-emerald-500 rounded-full animate-bounce`} 
              style={{ animationDelay: '0ms', animationDuration: '1.4s' }} 
            />
            <div 
              className={`${sizeStyles[size].dots} bg-emerald-500 rounded-full animate-bounce`} 
              style={{ animationDelay: '200ms', animationDuration: '1.4s' }} 
            />
            <div 
              className={`${sizeStyles[size].dots} bg-emerald-500 rounded-full animate-bounce`} 
              style={{ animationDelay: '400ms', animationDuration: '1.4s' }} 
            />
          </div>
        );
      
      case 'pulse':
        return (
          <div className={`${sizeStyles[size].spinner} bg-emerald-500 rounded-full animate-pulse ${className}`} />
        );

      case 'ring':
        return (
          <div className={`relative ${sizeStyles[size].ring} ${className}`}>
            <div className={`absolute inset-0 border-4 border-emerald-500/20 rounded-full`} />
            <div className={`absolute inset-0 border-4 border-t-emerald-500 rounded-full animate-spin`} />
          </div>
        );

      case 'bars':
        return (
          <div className={`flex items-end gap-1 ${className}`}>
            <div 
              className={`${sizeStyles[size].bars} bg-emerald-500 rounded-full animate-pulse`}
              style={{ animationDelay: '0ms', animationDuration: '1s' }}
            />
            <div 
              className={`${sizeStyles[size].bars} bg-emerald-500 rounded-full animate-pulse`}
              style={{ animationDelay: '150ms', animationDuration: '1s' }}
            />
            <div 
              className={`${sizeStyles[size].bars} bg-emerald-500 rounded-full animate-pulse`}
              style={{ animationDelay: '300ms', animationDuration: '1s' }}
            />
            <div 
              className={`${sizeStyles[size].bars} bg-emerald-500 rounded-full animate-pulse`}
              style={{ animationDelay: '450ms', animationDuration: '1s' }}
            />
          </div>
        );
      
      default:
        return (
          <div className="relative">
            <div
              className={`
                ${sizeStyles[size].spinner}
                border-emerald-500 border-t-transparent
                rounded-full animate-spin
                ${className}
              `}
            />
            <div
              className={`
                absolute inset-0
                ${sizeStyles[size].spinner}
                border-emerald-500/20 border-t-transparent
                rounded-full animate-spin
                ${className}
              `}
              style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
            />
          </div>
        );
    }
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4 animate-fade-in">
      <div className="relative">
        {renderLoader()}
        {variant === 'spinner' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1/2 h-1/2 bg-emerald-500/20 rounded-full animate-pulse" />
          </div>
        )}
      </div>
      {text && (
        <p className="text-zinc-400 text-sm font-medium animate-fade-in-up">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center bg-zinc-950/90 backdrop-blur-md z-50 animate-fade-in" 
        dir="rtl"
      >
        {spinner}
      </div>
    );
  }

  return spinner;
}
