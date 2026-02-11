import { AlertCircle, FileText, Trash2 } from 'lucide-react';
import { useEffect, useRef, useId } from 'react';

interface DraftModalProps {
  title: string;
  message: string;
  onRestore: () => void;
  onDiscard: () => void;
}

export default function DraftModal({ title, message, onRestore, onDiscard }: DraftModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const messageId = useId();

  // Focus management and keyboard handling
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Prevent closing on Escape - user must choose an action
        e.preventDefault();
      }
    };

    // Store the previously focused element
    previousActiveElementRef.current = document.activeElement as HTMLElement;
    
    // Lock body scroll
    document.body.style.overflow = 'hidden';
    
    // Add escape handler
    document.addEventListener('keydown', handleEscape);
    
    // Focus the modal when it opens
    setTimeout(() => {
      const firstButton = modalRef.current?.querySelector<HTMLElement>('button');
      if (firstButton) {
        firstButton.focus();
      } else if (modalRef.current) {
        modalRef.current.focus();
      }
    }, 0);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      
      // Return focus to the previously focused element
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, []);

  // Focus trap: keep focus within modal
  useEffect(() => {
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, []);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 backdrop-blur-sm bg-overlay/70 flex items-center justify-center z-50 p-4 transition-all"
      aria-hidden="true"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        tabIndex={-1}
        className="bg-elevated border border-border/20 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden focus:outline-none"
      >
        <div className="bg-info p-6">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="bg-inverse/20 backdrop-blur-sm p-3 rounded-xl" aria-hidden="true">
              <FileText className="h-6 w-6 text-inverse" />
            </div>
            <h2 id={titleId} className="text-2xl font-bold text-inverse">
              {title}
            </h2>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-2 rtl:space-x-reverse">
              <div className="bg-warning p-1.5 rounded-lg flex-shrink-0" aria-hidden="true">
                <AlertCircle className="h-4 w-4 text-inverse" />
              </div>
              <p id={messageId} className="text-secondary text-base leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onDiscard}
              className="flex items-center justify-center space-x-2 rtl:space-x-reverse px-6 py-4 rounded-xl border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20 active:bg-danger/30 transition-all font-semibold group focus:outline-none focus:ring-2 focus:ring-danger/50"
              aria-label="התחל מחדש - תמחק את הטיוטה"
            >
              <Trash2 className="h-5 w-5 group-hover:scale-110 transition-transform" aria-hidden="true" />
              <span>התחל מחדש</span>
            </button>
            <button
              onClick={onRestore}
              className="flex items-center justify-center space-x-2 rtl:space-x-reverse px-6 py-4 rounded-xl bg-primary hover:bg-primary/90 active:bg-primary/80 text-inverse font-semibold transition-all group focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label="טען טיוטה - שחזר את הטיוטה השמורה"
              autoFocus
            >
              <FileText className="h-5 w-5 group-hover:scale-110 transition-transform" aria-hidden="true" />
              <span>טען טיוטה</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
