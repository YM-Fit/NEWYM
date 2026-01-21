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
      bg: 'bg-danger/15',
      border: 'border-danger/30',
      text: 'text-danger',
      icon: 'text-danger',
    },
    warning: {
      bg: 'bg-warning/15',
      border: 'border-warning/30',
      text: 'text-warning',
      icon: 'text-warning',
    },
    info: {
      bg: 'bg-info/15',
      border: 'border-info/30',
      text: 'text-info',
      icon: 'text-info',
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
