import { AlertTriangle, X } from 'lucide-react';
import { Modal } from '../ui/Modal';

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
  const variantStyles = {
    danger: {
      button: 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border-red-500/30',
      icon: 'text-red-400',
    },
    warning: {
      button: 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border-amber-500/30',
      icon: 'text-amber-400',
    },
    info: {
      button: 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border-blue-500/30',
      icon: 'text-blue-400',
    },
  };

  const styles = variantStyles[variant];

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="sm">
      <div className="p-6" dir="rtl">
        <div className="flex items-start gap-4 mb-6">
          <div className={`p-3 rounded-xl flex-shrink-0 ${
            variant === 'danger' ? 'bg-red-500/15' : 
            variant === 'warning' ? 'bg-amber-500/15' : 
            'bg-blue-500/15'
          }`}>
            <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <p className="text-zinc-400 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 border border-zinc-700/50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-6 py-2.5 rounded-xl border transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed ${styles.button}`}
          >
            {isLoading ? 'מעבד...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
