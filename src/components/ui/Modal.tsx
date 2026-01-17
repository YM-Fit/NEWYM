import { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  ariaDescribedBy?: string;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md', 
  showCloseButton = true,
  ariaDescribedBy 
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const modalId = useId();

  // Use focus trap hook
  useFocusTrap(modalRef, {
    enabled: isOpen,
    returnFocusOnDeactivate: true,
    initialFocus: closeButtonRef,
  });

  // Focus management and keyboard handling
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      
      // Add escape handler
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      aria-hidden="true"
    >
      <div
        ref={modalRef}
        id={modalId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        className={`w-full ${sizeStyles[size]} bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 animate-fade-in focus:outline-none`}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-5 border-b border-zinc-800">
            {title && (
              <h2 id={titleId} className="text-xl font-bold text-white">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-xl transition-all text-zinc-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                aria-label="סגור דיאלוג"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
