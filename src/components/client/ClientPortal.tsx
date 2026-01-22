/**
 * Client Portal Component
 * פורטל לקוח
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  Calendar, 
  DollarSign, 
  FileText,
  MessageSquare,
  TrendingUp,
  Download
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PaymentService } from '../../services/paymentService';
import { DocumentService } from '../../services/documentService';
import { CommunicationService } from '../../services/communicationService';
import { getTrainees } from '../../api/traineeApi';
import toast from 'react-hot-toast';
import { logger } from '../../utils/logger';

export default function ClientPortal() {
  const { user } = useAuth();
  const [trainee, setTrainee] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'documents' | 'messages'>('overview');

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get trainee data
      const traineesResult = await getTrainees(user.id);
      if (traineesResult.success && traineesResult.data && traineesResult.data.length > 0) {
        const traineeData = traineesResult.data[0];
        setTrainee(traineeData);

        // Load related data
        const [paymentsResult, documentsResult, messagesResult] = await Promise.all([
          PaymentService.getPayments(user.id, { traineeId: traineeData.id }),
          DocumentService.getDocuments(traineeData.id),
          CommunicationService.getCommunicationHistory(traineeData.id),
        ]);

        if (paymentsResult.success && paymentsResult.data) {
          setPayments(paymentsResult.data);
        }

        if (documentsResult.success && documentsResult.data) {
          setDocuments(documentsResult.data);
        }

        if (messagesResult.success && messagesResult.data) {
          setMessages(messagesResult.data);
        }
      }
    } catch (error) {
      logger.error('Error loading client portal data', error, 'ClientPortal');
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleDownloadInvoice = async (payment: any) => {
    try {
      const result = await PaymentService.generateInvoicePDF(payment);
      if (result.success && result.data) {
        const url = URL.createObjectURL(result.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${payment.invoice_number || payment.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('חשבונית הורדה');
      }
    } catch (error) {
      logger.error('Error downloading invoice', error, 'ClientPortal');
      toast.error('שגיאה בהורדת חשבונית');
    }
  };

  const handleDownloadDocument = async (document: any) => {
    try {
      const result = await DocumentService.getDocumentUrl(document.id);
      if (result.success && result.data) {
        window.open(result.data, '_blank');
      }
    } catch (error) {
      logger.error('Error downloading document', error, 'ClientPortal');
      toast.error('שגיאה בהורדת מסמך');
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

  if (!trainee) {
    return (
      <div className="premium-card p-6">
        <div className="text-center py-12">
          <p className="text-muted">לא נמצאו נתונים</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="premium-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center">
            <User className="h-8 w-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{trainee.full_name}</h1>
            <p className="text-sm text-muted">פורטל לקוח</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          {[
            { id: 'overview' as const, label: 'סקירה', icon: User },
            { id: 'payments' as const, label: 'תשלומים', icon: DollarSign },
            { id: 'documents' as const, label: 'מסמכים', icon: FileText },
            { id: 'messages' as const, label: 'הודעות', icon: MessageSquare },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'border-b-2 border-emerald-500 text-emerald-400'
                  : 'text-muted hover:text-foreground'
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
          <h2 className="text-xl font-semibold text-foreground mb-4">סקירה כללית</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
              <div className="text-sm text-muted mb-1">תשלומים ממתינים</div>
              <div className="text-2xl font-bold text-emerald-400">
                {payments.filter(p => p.status === 'pending').length}
              </div>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
              <div className="text-sm text-muted mb-1">מסמכים</div>
              <div className="text-2xl font-bold text-blue-400">{documents.length}</div>
            </div>
            <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
              <div className="text-sm text-muted mb-1">הודעות</div>
              <div className="text-2xl font-bold text-purple-400">{messages.length}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="premium-card p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">היסטוריית תשלומים</h2>
          <div className="space-y-3">
            {payments.map((payment) => (
              <div key={payment.id} className="premium-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">
                      ₪{Number(payment.amount).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted">
                      תאריך תשלום: {new Date(payment.due_date).toLocaleDateString('he-IL')}
                    </div>
                    {payment.paid_date && (
                      <div className="text-sm text-emerald-400">
                        שולם ב: {new Date(payment.paid_date).toLocaleDateString('he-IL')}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg text-sm ${
                      payment.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                      payment.status === 'overdue' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {payment.status === 'paid' ? 'שולם' :
                       payment.status === 'overdue' ? 'מעוכב' : 'ממתין'}
                    </span>
                    {payment.invoice_number && (
                      <button
                        onClick={() => handleDownloadInvoice(payment)}
                        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                        aria-label="הורד חשבונית"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <div className="text-center py-12 text-muted">אין תשלומים</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="premium-card p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">מסמכים</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((document) => (
              <div key={document.id} className="premium-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="h-5 w-5 text-emerald-400" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{document.file_name}</h3>
                    <p className="text-xs text-muted">
                      {new Date(document.created_at).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadDocument(document)}
                  className="w-full px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  הורד
                </button>
              </div>
            ))}
            {documents.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted">אין מסמכים</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="premium-card p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">הודעות</h2>
          <div className="space-y-3">
            {messages.map((message) => (
              <div key={message.id} className="premium-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {message.subject && (
                      <h3 className="font-semibold text-foreground mb-2">{message.subject}</h3>
                    )}
                    <p className="text-sm text-muted mb-2">{message.body}</p>
                    <p className="text-xs text-muted">
                      {new Date(message.sent_at).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-center py-12 text-muted">אין הודעות</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
