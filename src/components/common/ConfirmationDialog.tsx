import { AlertTriangle, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useId } from 'react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'אישור',
  cancelText = 'ביטול',
  variant = 'danger',
  isLoading = false,
}: ConfirmationDialogProps) {
  const messageId = useId();
  const variantStyles = {
    danger: {
      button: 'bg-danger/15 hover:bg-danger/25 text-danger border-danger/30',
      icon: 'text-danger',
    },
    warning: {
      button: 'bg-warning/15 hover:bg-warning/25 text-warning border-warning/30',
      icon: 'text-warning',
    },
    info: {
      button: 'bg-info/15 hover:bg-info/25 text-info border-info/30',
      icon: 'text-info',
    },
  };

  const styles = variantStyles[variant];

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={title} 
      size="sm"
      ariaDescribedBy={messageId}
    >
      <div className="p-6" dir="rtl">
        <div className="flex items-start gap-4 mb-6">
          <div 
            className={`p-3 rounded-xl flex-shrink-0 ${
              variant === 'danger' ? 'bg-danger/15' : 
              variant === 'warning' ? 'bg-warning/15' : 
              'bg-info/15'
            }`}
            aria-hidden="true"
          >
            <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />
          </div>
          <div className="flex-1">
            <p id={messageId} className="text-muted leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl bg-surface/60 text-muted hover:bg-surface/80 border border-border/20 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label={cancelText}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-6 py-2.5 rounded-xl border transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/50 ${styles.button}`}
            aria-label={confirmText}
            autoFocus
          >
            {isLoading ? 'מעבד...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
