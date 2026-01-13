import { AlertCircle, X } from 'lucide-react';
import { useState } from 'react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
  variant?: 'error' | 'warning' | 'info';
  className?: string;
}

export function ErrorMessage({ 
  title, 
  message, 
  onDismiss,
  variant = 'error',
  className = ''
}: ErrorMessageProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const variantStyles = {
    error: {
      bg: 'bg-red-500/15',
      border: 'border-red-500/30',
      text: 'text-red-400',
      icon: 'text-red-400',
    },
    warning: {
      bg: 'bg-amber-500/15',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      icon: 'text-amber-400',
    },
    info: {
      bg: 'bg-blue-500/15',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      icon: 'text-blue-400',
    },
  };

  const styles = variantStyles[variant];

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className={`premium-card-static p-4 border ${styles.border} ${styles.bg} ${className}`} dir="rtl">
      <div className="flex items-start gap-3">
        <AlertCircle className={`w-5 h-5 ${styles.icon} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          {title && (
            <h4 className={`font-semibold mb-1 ${styles.text}`}>{title}</h4>
          )}
          <p className={`text-sm ${styles.text} opacity-90`}>{message}</p>
        </div>
        {(onDismiss || true) && (
          <button
            onClick={handleDismiss}
            className={`${styles.text} hover:opacity-70 transition-opacity flex-shrink-0`}
            aria-label="סגור"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
