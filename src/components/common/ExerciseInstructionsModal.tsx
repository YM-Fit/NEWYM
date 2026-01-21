import { Info } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface ExerciseInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  instructions: string | null | undefined;
}

export default function ExerciseInstructionsModal({
  isOpen,
  onClose,
  exerciseName,
  instructions,
}: ExerciseInstructionsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`איך לבצע: ${exerciseName}`}
      size="lg"
    >
      {instructions ? (
        <div className="space-y-4">
          <div className="bg-accent-bg/10 border border-accent-bg/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <Info className="h-5 w-5 text-primary flex-shrink-0" />
              </div>
              <div className="flex-1">
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                  {instructions}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-surface/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Info className="h-8 w-8 text-muted" />
          </div>
          <p className="text-muted font-medium">
            לא קיימות הוראות ביצוע עבור תרגיל זה
          </p>
        </div>
      )}
    </Modal>
  );
}
