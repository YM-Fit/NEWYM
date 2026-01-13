interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
  variant?: 'spinner' | 'dots' | 'pulse';
  className?: string;
}

const sizeStyles = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-3',
  lg: 'h-12 w-12 border-4',
  xl: 'h-16 w-16 border-4',
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
            <div className={`${sizeStyles[size]} bg-emerald-500 rounded-full animate-bounce`} style={{ animationDelay: '0ms' }} />
            <div className={`${sizeStyles[size]} bg-emerald-500 rounded-full animate-bounce`} style={{ animationDelay: '150ms' }} />
            <div className={`${sizeStyles[size]} bg-emerald-500 rounded-full animate-bounce`} style={{ animationDelay: '300ms' }} />
          </div>
        );
      
      case 'pulse':
        return (
          <div className={`${sizeStyles[size]} bg-emerald-500 rounded-full animate-pulse ${className}`} />
        );
      
      default:
        return (
          <div
            className={`
              ${sizeStyles[size]}
              border-emerald-500 border-t-transparent
              rounded-full animate-spin
              ${className}
            `}
          />
        );
    }
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      {renderLoader()}
      {text && <p className="text-zinc-400 text-sm font-medium">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-50" dir="rtl">
        {spinner}
      </div>
    );
  }

  return spinner;
}
