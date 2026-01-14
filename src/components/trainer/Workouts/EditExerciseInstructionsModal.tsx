import { useState, useEffect } from 'react';
import { Edit2, Loader2 } from 'lucide-react';
import { Modal } from '../../ui/Modal';

interface EditExerciseInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseId: string;
  exerciseName: string;
  currentInstructions: string | null;
  onSave: (instructions: string) => Promise<void>;
}

export default function EditExerciseInstructionsModal({
  isOpen,
  onClose,
  exerciseId,
  exerciseName,
  currentInstructions,
  onSave,
}: EditExerciseInstructionsModalProps) {
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // עדכון ה-state כאשר המודאל נפתח או שההסבר הנוכחי משתנה
  useEffect(() => {
    if (isOpen) {
      setInstructions(currentInstructions || '');
      setError(null);
    }
  }, [isOpen, currentInstructions]);

  const handleSave = async () => {
    setError(null);
    setSaving(true);

    try {
      await onSave(instructions.trim() || '');
      onClose();
    } catch (err) {
      setError('שגיאה בשמירת ההסבר. נסה שוב.');
      console.error('Error saving exercise instructions:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setInstructions(currentInstructions || '');
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={`עריכת הסבר: ${exerciseName}`}
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <Edit2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
          </div>
          <div className="flex-1">
            <label
              htmlFor="instructions-textarea"
              className="block text-sm font-medium text-zinc-300 mb-2"
            >
              הוראות ביצוע
            </label>
            <textarea
              id="instructions-textarea"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
              placeholder="הזן הוראות ביצוע מפורטות לתרגיל..."
              rows={8}
              disabled={saving}
            />
            <p className="mt-2 text-xs text-zinc-500">
              הזן הסבר מפורט ומדויק כיצד לבצע את התרגיל
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-6 py-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                שומר...
              </>
            ) : (
              'שמור'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
