/**
 * Client Detail View Component
 * תצוגה מפורטת של לקוח
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  DollarSign,
  MessageSquare,
  FileText,
  History,
  Edit,
  X
} from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { getTrainees } from '../../../../api/traineeApi';
import { CommunicationService } from '../../../../services/communicationService';
import { PaymentService } from '../../../../services/paymentService';
import { DocumentService } from '../../../../services/documentService';
import { CrmService } from '../../../../services/crmService';
import CommunicationCenter from '../shared/CommunicationCenter';
import PaymentTracker from '../shared/PaymentTracker';
import ContractManager from '../shared/ContractManager';
import DocumentManager from '../shared/DocumentManager';
import toast from 'react-hot-toast';
import { logger } from '../../../../utils/logger';
import type { Trainee } from '../../../../types';
import { CRM_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../../../../constants/crmConstants';

interface ClientDetailViewProps {
  trainee: Trainee;
  onClose: () => void;
  onEdit?: (trainee: Trainee) => void;
}

export default function ClientDetailView({ trainee, onClose, onEdit }: ClientDetailViewProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'communication' | 'payments' | 'contracts' | 'documents'>('overview');
  const [interactions, setInteractions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [interactionsResult, paymentsResult, documentsResult] = await Promise.all([
        CrmService.getInteractions(trainee.id),
        PaymentService.getPayments(user.id, { traineeId: trainee.id }),
        DocumentService.getDocuments(trainee.id),
      ]);

      if (interactionsResult.success && interactionsResult.data) {
        setInteractions(interactionsResult.data);
      }

      if (paymentsResult.success && paymentsResult.data) {
        setPayments(paymentsResult.data);
      }

      if (documentsResult.success && documentsResult.data) {
        setDocuments(documentsResult.data);
      }
    } catch (error) {
      logger.error('Error loading client details', error, 'ClientDetailView');
      toast.error('שגיאה בטעינת פרטי לקוח');
    } finally {
      setLoading(false);
    }
  }, [user, trainee.id]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="premium-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center">
              <User className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{trainee.full_name}</h1>
              <div className="flex items-center gap-4 mt-2">
                {trainee.crm_status && (
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm">
                    {CRM_STATUS_LABELS[trainee.crm_status as keyof typeof CRM_STATUS_LABELS]}
                  </span>
                )}
                {trainee.payment_status && (
                  <span className={`px-3 py-1 rounded-lg text-sm ${
                    trainee.payment_status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                    trainee.payment_status === 'overdue' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {PAYMENT_STATUS_LABELS[trainee.payment_status as keyof typeof PAYMENT_STATUS_LABELS]}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(trainee)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                aria-label="ערוך"
              >
                <Edit className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              aria-label="סגור"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {trainee.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-zinc-400" />
              <div>
                <div className="text-xs text-zinc-400">אימייל</div>
                <div className="text-white">{trainee.email}</div>
              </div>
            </div>
          )}
          {trainee.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-zinc-400" />
              <div>
                <div className="text-xs text-zinc-400">טלפון</div>
                <div className="text-white">{trainee.phone}</div>
              </div>
            </div>
          )}
          {trainee.contract_value && (
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-zinc-400" />
              <div>
                <div className="text-xs text-zinc-400">ערך חוזה</div>
                <div className="text-emerald-400 font-semibold">
                  ₪{Number(trainee.contract_value).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-zinc-800">
          {[
            { id: 'overview' as const, label: 'סקירה', icon: User },
            { id: 'communication' as const, label: 'תקשורת', icon: MessageSquare },
            { id: 'payments' as const, label: 'תשלומים', icon: DollarSign },
            { id: 'contracts' as const, label: 'חוזים', icon: FileText },
            { id: 'documents' as const, label: 'מסמכים', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'border-b-2 border-emerald-500 text-emerald-400'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="premium-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4">סקירה כללית</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <History className="h-5 w-5 text-emerald-400" />
                אינטראקציות אחרונות
              </h3>
              <div className="space-y-2">
                {interactions.slice(0, 5).map((interaction) => (
                  <div key={interaction.id} className="premium-card p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">{interaction.subject || 'ללא נושא'}</div>
                        <div className="text-sm text-zinc-400">
                          {new Date(interaction.interaction_date).toLocaleDateString('he-IL')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {interactions.length === 0 && (
                  <div className="text-center py-4 text-zinc-500">אין אינטראקציות</div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-400" />
                תשלומים אחרונים
              </h3>
              <div className="space-y-2">
                {payments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="premium-card p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">
                          ₪{Number(payment.amount).toLocaleString()}
                        </div>
                        <div className="text-sm text-zinc-400">
                          {new Date(payment.due_date).toLocaleDateString('he-IL')}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        payment.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                        payment.status === 'overdue' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {payment.status === 'paid' ? 'שולם' :
                         payment.status === 'overdue' ? 'מעוכב' : 'ממתין'}
                      </span>
                    </div>
                  </div>
                ))}
                {payments.length === 0 && (
                  <div className="text-center py-4 text-zinc-500">אין תשלומים</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'communication' && (
        <CommunicationCenter traineeId={trainee.id} onClose={onClose} />
      )}

      {activeTab === 'payments' && (
        <PaymentTracker traineeId={trainee.id} onClose={onClose} />
      )}

      {activeTab === 'contracts' && (
        <ContractManager traineeId={trainee.id} onClose={onClose} />
      )}

      {activeTab === 'documents' && (
        <DocumentManager traineeId={trainee.id} onClose={onClose} />
      )}
    </div>
  );
}
