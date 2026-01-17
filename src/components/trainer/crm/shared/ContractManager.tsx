/**
 * Contract Manager Component
 * ניהול חוזים
 */

import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Edit, Trash2, Calendar, DollarSign } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { PaymentService, type Contract } from '../../../../services/paymentService';
import { getTrainees } from '../../../../api/traineeApi';
import toast from 'react-hot-toast';
import { logger } from '../../../../utils/logger';
import { Modal } from '../../../ui/Modal';
import { CONTRACT_TYPE, CONTRACT_TYPE_LABELS } from '../../../../constants/crmConstants';

interface ContractManagerProps {
  traineeId?: string;
  onClose?: () => void;
}

export default function ContractManager({ traineeId, onClose }: ContractManagerProps) {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [trainees, setTrainees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [contractsResult, traineesResult] = await Promise.all([
        PaymentService.getContracts(user.id),
        getTrainees(user.id),
      ]);

      if (contractsResult.success && contractsResult.data) {
        const filtered = traineeId
          ? contractsResult.data.filter(c => c.trainee_id === traineeId)
          : contractsResult.data;
        setContracts(filtered);
      }

      if (traineesResult.success && traineesResult.data) {
        setTrainees(traineesResult.data);
      }
    } catch (error) {
      logger.error('Error loading contracts', error, 'ContractManager');
      toast.error('שגיאה בטעינת חוזים');
    } finally {
      setLoading(false);
    }
  }, [user, traineeId]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleDelete = async (contractId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את החוזה?')) return;

    try {
      const result = await PaymentService.updateContract(contractId, { status: 'cancelled' });
      if (result.success) {
        toast.success('חוזה בוטל בהצלחה');
        await loadData();
      } else {
        toast.error(result.error || 'שגיאה במחיקת חוזה');
      }
    } catch (error) {
      logger.error('Error deleting contract', error, 'ContractManager');
      toast.error('שגיאה במחיקת חוזה');
    }
  };

  if (loading) {
    return (
      <div className="premium-card p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="premium-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <FileText className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">ניהול חוזים</h1>
              <p className="text-sm text-zinc-400">ניהול חוזים ותשלומים</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditingContract(null);
                setShowEditor(true);
              }}
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              חוזה חדש
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 rounded-lg transition-all"
              >
                סגור
              </button>
            )}
          </div>
        </div>

        {/* Contracts List */}
        <div className="space-y-4">
          {contracts.map((contract) => {
            const trainee = trainees.find(t => t.id === contract.trainee_id);
            return (
              <div
                key={contract.id}
                className="premium-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-white">
                        {trainee ? trainee.full_name : 'מתאמן לא נמצא'}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs ${
                        contract.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                        contract.status === 'expired' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {contract.status === 'active' ? 'פעיל' :
                         contract.status === 'expired' ? 'פג תוקף' : 'בוטל'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-zinc-400 mb-1">סוג חוזה</div>
                        <div className="text-white">
                          {CONTRACT_TYPE_LABELS[contract.contract_type as keyof typeof CONTRACT_TYPE_LABELS]}
                        </div>
                      </div>
                      <div>
                        <div className="text-zinc-400 mb-1">ערך</div>
                        <div className="text-emerald-400 font-semibold">
                          ₪{Number(contract.value).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-zinc-400 mb-1">תאריך התחלה</div>
                        <div className="text-white">
                          {new Date(contract.start_date).toLocaleDateString('he-IL')}
                        </div>
                      </div>
                      {contract.end_date && (
                        <div>
                          <div className="text-zinc-400 mb-1">תאריך סיום</div>
                          <div className="text-white">
                            {new Date(contract.end_date).toLocaleDateString('he-IL')}
                          </div>
                        </div>
                      )}
                    </div>
                    {contract.terms && (
                      <div className="mt-3 text-sm text-zinc-400">
                        {contract.terms}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => {
                        setEditingContract(contract);
                        setShowEditor(true);
                      }}
                      className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                      aria-label="ערוך"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(contract.id)}
                      className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      aria-label="מחק"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {contracts.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              אין חוזים. צור חוזה חדש כדי להתחיל.
            </div>
          )}
        </div>
      </div>

      {/* Contract Editor Modal */}
      {showEditor && (
        <ContractEditor
          contract={editingContract}
          traineeId={traineeId}
          trainees={trainees}
          onClose={() => {
            setShowEditor(false);
            setEditingContract(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Contract Editor Component
function ContractEditor({
  contract,
  traineeId,
  trainees,
  onClose,
}: {
  contract: Contract | null;
  traineeId?: string;
  trainees: any[];
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [selectedTraineeId, setSelectedTraineeId] = useState(traineeId || contract?.trainee_id || '');
  const [contractType, setContractType] = useState<typeof CONTRACT_TYPE[keyof typeof CONTRACT_TYPE]>(
    contract?.contract_type || CONTRACT_TYPE.MONTHLY
  );
  const [startDate, setStartDate] = useState(contract?.start_date || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(contract?.end_date || '');
  const [value, setValue] = useState(contract?.value?.toString() || '');
  const [terms, setTerms] = useState(contract?.terms || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !selectedTraineeId || !value) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }

    try {
      setSaving(true);

      if (contract) {
        const result = await PaymentService.updateContract(contract.id, {
          contract_type: contractType,
          start_date: startDate,
          end_date: endDate || undefined,
          value: Number(value),
          terms,
        });

        if (result.success) {
          toast.success('חוזה עודכן בהצלחה');
          onClose();
        } else {
          toast.error(result.error || 'שגיאה בעדכון חוזה');
        }
      } else {
        const result = await PaymentService.createContract({
          trainee_id: selectedTraineeId,
          trainer_id: user.id,
          contract_type: contractType,
          start_date: startDate,
          end_date: endDate || undefined,
          value: Number(value),
          terms,
          status: 'active',
        });

        if (result.success) {
          toast.success('חוזה נוצר בהצלחה');
          onClose();
        } else {
          toast.error(result.error || 'שגיאה ביצירת חוזה');
        }
      }
    } catch (error) {
      logger.error('Error saving contract', error, 'ContractEditor');
      toast.error('שגיאה בשמירת חוזה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={contract ? 'ערוך חוזה' : 'חוזה חדש'} size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">מתאמן</label>
          <select
            value={selectedTraineeId}
            onChange={(e) => setSelectedTraineeId(e.target.value)}
            disabled={!!traineeId}
            className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">בחר מתאמן</option>
            {trainees.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">סוג חוזה</label>
          <select
            value={contractType}
            onChange={(e) => setContractType(e.target.value as typeof CONTRACT_TYPE[keyof typeof CONTRACT_TYPE])}
            className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {Object.entries(CONTRACT_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">תאריך התחלה</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">תאריך סיום (אופציונלי)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">ערך (₪)</label>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">תנאים (אופציונלי)</label>
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="תנאי החוזה..."
          />
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 rounded-lg transition-all"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all disabled:opacity-50"
          >
            {saving ? 'שומר...' : 'שמור'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
