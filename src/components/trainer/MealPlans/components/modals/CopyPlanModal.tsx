import { useState, useEffect } from 'react';
import { X, Copy, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { copyMealPlanToTrainee } from '../../../../../api/nutritionApi';
import { getTrainees } from '../../../../../api/traineeApi';

interface CopyPlanModalProps {
  planId: string;
  planName: string;
  trainerId: string;
  currentTraineeId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CopyPlanModal({
  planId,
  planName,
  trainerId,
  currentTraineeId,
  onClose,
  onSuccess,
}: CopyPlanModalProps) {
  const [trainees, setTrainees] = useState<Array<{ id: string; full_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [targetTraineeId, setTargetTraineeId] = useState('');
  const [newName, setNewName] = useState(`${planName} (עותק)`);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const result = await getTrainees(trainerId);
      if (result.success && result.data) {
        const others = result.data
          .filter((t: { id: string }) => t.id !== currentTraineeId)
          .map((t: { id: string; full_name?: string }) => ({ id: t.id, full_name: t.full_name || '' }));
        setTrainees(others);
        setTargetTraineeId(others.length > 0 ? others[0].id : '');
      }
      setLoading(false);
    };
    load();
  }, [trainerId, currentTraineeId]);

  const handleCopy = async () => {
    if (!targetTraineeId.trim()) return;

    setSaving(true);
    try {
      const newPlan = await copyMealPlanToTrainee(
        planId,
        targetTraineeId,
        trainerId,
        newName.trim() || undefined
      );

      if (newPlan) {
        onSuccess();
        onClose();
      } else {
        toast.error('שגיאה בהעתקת התפריט');
      }
    } catch (error) {
      console.error('Error copying plan:', error);
      toast.error('שגיאה בהעתקת התפריט');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="premium-card-static max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">העתק תפריט למתאמן</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-bg-surface)] rounded-xl transition-all"
            aria-label="סגור"
          >
            <X className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
        </div>

        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          העתקת &quot;{planName}&quot; למתאמן אחר
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
                מתאמן יעד
              </label>
              <select
                value={targetTraineeId}
                onChange={(e) => setTargetTraineeId(e.target.value)}
                className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
              >
                {trainees.length === 0 ? (
                  <option value="">אין מתאמנים נוספים</option>
                ) : (
                  trainees.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
                שם לתפריט החדש
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="glass-input w-full px-4 py-3 text-[var(--color-text-primary)]"
                placeholder={`${planName} (עותק)`}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] rounded-xl font-semibold hover:bg-[var(--color-bg-elevated)] transition-all"
              >
                ביטול
              </button>
              <button
                onClick={handleCopy}
                disabled={saving || !targetTraineeId || trainees.length === 0}
                className="flex-1 px-4 py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    מעתיק...
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    העתק
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
