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
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <Info className="h-5 w-5 text-emerald-400 flex-shrink-0" />
              </div>
              <div className="flex-1">
                <p className="text-white whitespace-pre-wrap leading-relaxed">
                  {instructions}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Info className="h-8 w-8 text-zinc-600" />
          </div>
          <p className="text-zinc-400 font-medium">
            לא קיימות הוראות ביצוע עבור תרגיל זה
          </p>
        </div>
      )}
    </Modal>
  );
}
