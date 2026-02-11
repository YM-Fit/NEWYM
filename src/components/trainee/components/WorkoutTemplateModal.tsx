import { X } from 'lucide-react';

interface WorkoutTemplateModalProps {
  isOpen: boolean;
  templateName: string;
  templateDescription: string;
  savingTemplate: boolean;
  exercisesCount: number;
  onClose: () => void;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onSave: () => void;
}

export default function WorkoutTemplateModal({
  isOpen,
  templateName,
  templateDescription,
  savingTemplate,
  exercisesCount,
  onClose,
  onNameChange,
  onDescriptionChange,
  onSave,
}: WorkoutTemplateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
            שמור כתבנית למאמן
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-surface)]"
          >
            <X className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)]">
          התבנית תישמר למאמן שלך ותופיע אצלו ברשימת התבניות עם השם שלך.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              שם התבנית *
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => onNameChange(e.target.value)}
              className="glass-input w-full px-3 py-2.5"
              placeholder="למשל: אימון עליון קצר"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              תיאור (אופציונלי)
            </label>
            <textarea
              value={templateDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={3}
              className="glass-input w-full px-3 py-2.5 resize-none"
              placeholder="למשל: אימון עליון לימים עמוסים..."
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={savingTemplate || !templateName.trim() || exercisesCount === 0}
          className="w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:bg-[var(--color-bg-surface)] disabled:text-[var(--color-text-muted)] text-white font-semibold transition-all"
        >
          {savingTemplate ? 'שומר...' : 'שמור כתבנית'}
        </button>
      </div>
    </div>
  );
}
