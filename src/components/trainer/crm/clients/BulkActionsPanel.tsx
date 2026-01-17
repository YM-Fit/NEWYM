/**
 * Bulk Actions Panel Component
 * פאנל לפעולות מרובות על לקוחות
 */

import { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  X, 
  Edit, 
  Trash2, 
  Tag, 
  Mail, 
  Download, 
  ArrowUpDown,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { BulkActionsService, type BulkUpdateOptions } from '../../../../services/bulkActionsService';
import { CommunicationService } from '../../../../services/communicationService';
import { CRM_STATUS, CRM_STATUS_LABELS, type CrmStatus } from '../../../../constants/crmConstants';
import { Modal } from '../../../ui/Modal';
import toast from 'react-hot-toast';
import { logger } from '../../../../utils/logger';
import type { CalendarClient } from '../../../../api/crmClientsApi';

interface BulkActionsPanelProps {
  selectedClients: string[];
  clients: CalendarClient[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkActionsPanel({
  selectedClients,
  clients,
  onClose,
  onSuccess,
}: BulkActionsPanelProps) {
  const { user } = useAuth();
  const [action, setAction] = useState<'update' | 'delete' | 'status' | 'export' | 'email' | 'tags' | null>(null);
  const [loading, setLoading] = useState(false);
  const [updateOptions, setUpdateOptions] = useState<BulkUpdateOptions>({});
  const [newStatus, setNewStatus] = useState<CrmStatus>(CRM_STATUS.ACTIVE);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const selectedCount = selectedClients.length;

  // Load templates when email action is selected
  useEffect(() => {
    if (action === 'email' && user) {
      loadTemplates();
    }
  }, [action, user]);

  const loadTemplates = async () => {
    if (!user) return;
    
    try {
      const result = await CommunicationService.getTemplates(user.id);
      if (result.success && result.data) {
        setTemplates(result.data);
      }
    } catch (error) {
      logger.error('Error loading templates', error, 'BulkActionsPanel');
    }
  };

  const handleBulkUpdate = async () => {
    if (!user || !updateOptions || Object.keys(updateOptions).length === 0) {
      toast.error('בחר שדות לעדכון');
      return;
    }

    try {
      setLoading(true);
      const traineeIds = selectedClients.filter(id => {
        const client = clients.find(c => c.id === id);
        return client?.trainee_id;
      }).map(id => {
        const client = clients.find(c => c.id === id);
        return client!.trainee_id!;
      });

      if (traineeIds.length === 0) {
        toast.error('לא נמצאו לקוחות מקושרים לעדכון');
        return;
      }

      const result = await BulkActionsService.bulkUpdate(traineeIds, updateOptions);
      
      if (result.success && result.data) {
        toast.success(`עודכנו ${result.data.success} לקוחות`);
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || 'שגיאה בעדכון');
      }
    } catch (error) {
      logger.error('Error bulk updating', error, 'BulkActionsPanel');
      toast.error('שגיאה בעדכון לקוחות');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!user) return;

    if (!confirm(`האם אתה בטוח שברצונך למחוק ${selectedCount} לקוחות? פעולה זו אינה הפיכה.`)) {
      return;
    }

    try {
      setLoading(true);
      const traineeIds = selectedClients.filter(id => {
        const client = clients.find(c => c.id === id);
        return client?.trainee_id;
      }).map(id => {
        const client = clients.find(c => c.id === id);
        return client!.trainee_id!;
      });

      if (traineeIds.length === 0) {
        toast.error('לא נמצאו לקוחות מקושרים למחיקה');
        return;
      }

      const result = await BulkActionsService.bulkDelete(traineeIds, user.id);
      
      if (result.success && result.data) {
        toast.success(`נמחקו ${result.data.success} לקוחות`);
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || 'שגיאה במחיקה');
      }
    } catch (error) {
      logger.error('Error bulk deleting', error, 'BulkActionsPanel');
      toast.error('שגיאה במחיקת לקוחות');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const traineeIds = selectedClients.filter(id => {
        const client = clients.find(c => c.id === id);
        return client?.trainee_id;
      }).map(id => {
        const client = clients.find(c => c.id === id);
        return client!.trainee_id!;
      });

      if (traineeIds.length === 0) {
        toast.error('לא נמצאו לקוחות מקושרים לעדכון');
        return;
      }

      const result = await BulkActionsService.bulkUpdateStatus(traineeIds, newStatus);
      
      if (result.success && result.data) {
        toast.success(`עודכנו ${result.data.success} לקוחות`);
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || 'שגיאה בעדכון סטטוס');
      }
    } catch (error) {
      logger.error('Error bulk updating status', error, 'BulkActionsPanel');
      toast.error('שגיאה בעדכון סטטוסים');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkExport = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const traineeIds = selectedClients.filter(id => {
        const client = clients.find(c => c.id === id);
        return client?.trainee_id;
      }).map(id => {
        const client = clients.find(c => c.id === id);
        return client!.trainee_id!;
      });

      const result = await BulkActionsService.bulkExport(
        traineeIds,
        user.id,
        exportFormat
      );
      
      if (result.success) {
        toast.success('הייצוא הושלם בהצלחה');
        onClose();
      } else {
        toast.error(result.error || 'שגיאה בייצוא');
      }
    } catch (error) {
      logger.error('Error bulk exporting', error, 'BulkActionsPanel');
      toast.error('שגיאה בייצוא');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSendEmails = async () => {
    if (!user || !selectedTemplate) {
      toast.error('בחר תבנית אימייל');
      return;
    }

    try {
      setLoading(true);
      const traineeIds = selectedClients.filter(id => {
        const client = clients.find(c => c.id === id);
        return client?.trainee_id;
      }).map(id => {
        const client = clients.find(c => c.id === id);
        return client!.trainee_id!;
      });

      if (traineeIds.length === 0) {
        toast.error('לא נמצאו לקוחות מקושרים לשליחה');
        return;
      }

      const result = await BulkActionsService.bulkSendEmails(
        traineeIds,
        selectedTemplate,
        user.id
      );
      
      if (result.success && result.data) {
        toast.success(`נשלחו ${result.data.success} אימיילים`);
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || 'שגיאה בשליחת אימיילים');
      }
    } catch (error) {
      logger.error('Error bulk sending emails', error, 'BulkActionsPanel');
      toast.error('שגיאה בשליחת אימיילים');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleBulkAddTags = async () => {
    if (!user || tags.length === 0) {
      toast.error('הוסף תגיות');
      return;
    }

    try {
      setLoading(true);
      const traineeIds = selectedClients.filter(id => {
        const client = clients.find(c => c.id === id);
        return client?.trainee_id;
      }).map(id => {
        const client = clients.find(c => c.id === id);
        return client!.trainee_id!;
      });

      if (traineeIds.length === 0) {
        toast.error('לא נמצאו לקוחות מקושרים');
        return;
      }

      const result = await BulkActionsService.bulkAddTags(traineeIds, tags);
      
      if (result.success && result.data) {
        toast.success(`נוספו תגיות ל-${result.data.success} לקוחות`);
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || 'שגיאה בהוספת תגיות');
      }
    } catch (error) {
      logger.error('Error bulk adding tags', error, 'BulkActionsPanel');
      toast.error('שגיאה בהוספת תגיות');
    } finally {
      setLoading(false);
    }
  };

  const renderActionContent = () => {
    switch (action) {
      case 'update':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">עדכון לקוחות</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">סטטוס CRM</label>
                <select
                  value={updateOptions.crm_status || ''}
                  onChange={(e) => setUpdateOptions({
                    ...updateOptions,
                    crm_status: e.target.value as CrmStatus || undefined,
                  })}
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
                >
                  <option value="">-- לא לשנות --</option>
                  {Object.entries(CRM_STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">סטטוס תשלום</label>
                <select
                  value={updateOptions.payment_status || ''}
                  onChange={(e) => setUpdateOptions({
                    ...updateOptions,
                    payment_status: e.target.value || undefined,
                  })}
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
                >
                  <option value="">-- לא לשנות --</option>
                  <option value="paid">שולם</option>
                  <option value="pending">ממתין</option>
                  <option value="overdue">מעוכב</option>
                  <option value="free">חינם</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleBulkUpdate}
              disabled={loading}
              className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4" />}
              עדכן {selectedCount} לקוחות
            </button>
          </div>
        );

      case 'delete':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">מחיקת לקוחות</h3>
            <p className="text-zinc-400 mb-4">
              האם אתה בטוח שברצונך למחוק {selectedCount} לקוחות? פעולה זו אינה הפיכה.
            </p>
            <button
              onClick={handleBulkDelete}
              disabled={loading}
              className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              מחק {selectedCount} לקוחות
            </button>
          </div>
        );

      case 'status':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">עדכון סטטוס</h3>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">סטטוס חדש</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as CrmStatus)}
                className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
              >
                {Object.entries(CRM_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleBulkStatusUpdate}
              disabled={loading}
              className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpDown className="h-4 w-4" />}
              עדכן סטטוס ל-{selectedCount} לקוחות
            </button>
          </div>
        );

      case 'export':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">ייצוא לקוחות</h3>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">פורמט</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'csv' | 'pdf')}
                className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
              >
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            <button
              onClick={handleBulkExport}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              ייצא {selectedCount} לקוחות
            </button>
          </div>
        );

      case 'email':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">שליחת אימיילים</h3>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">תבנית אימייל</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
              >
                <option value="">בחר תבנית</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleBulkSendEmails}
              disabled={loading || !selectedTemplate}
              className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              שלח ל-{selectedCount} לקוחות
            </button>
          </div>
        );

      case 'tags':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">הוספת תגיות</h3>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">תגיות</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  className="flex-1 px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
                  placeholder="הזן תגית וללחץ Enter"
                />
                <button
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all"
                >
                  הוסף
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-emerald-400 hover:text-emerald-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={handleBulkAddTags}
              disabled={loading || tags.length === 0}
              className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
              הוסף תגיות ל-{selectedCount} לקוחות
            </button>
          </div>
        );

      default:
        return (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setAction('update')}
              className="p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-all text-left"
            >
              <Edit className="h-5 w-5 text-emerald-400 mb-2" />
              <div className="text-white font-medium">עדכון</div>
              <div className="text-xs text-zinc-400">עדכן פרטי לקוחות</div>
            </button>
            <button
              onClick={() => setAction('status')}
              className="p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-all text-left"
            >
              <ArrowUpDown className="h-5 w-5 text-blue-400 mb-2" />
              <div className="text-white font-medium">שינוי סטטוס</div>
              <div className="text-xs text-zinc-400">עדכן סטטוס CRM</div>
            </button>
            <button
              onClick={() => setAction('export')}
              className="p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-all text-left"
            >
              <Download className="h-5 w-5 text-purple-400 mb-2" />
              <div className="text-white font-medium">ייצוא</div>
              <div className="text-xs text-zinc-400">ייצא לק CSV/PDF</div>
            </button>
            <button
              onClick={() => setAction('email')}
              className="p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-all text-left"
            >
              <Mail className="h-5 w-5 text-yellow-400 mb-2" />
              <div className="text-white font-medium">שליחת אימייל</div>
              <div className="text-xs text-zinc-400">שלח תבנית אימייל</div>
            </button>
            <button
              onClick={() => setAction('tags')}
              className="p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-all text-left"
            >
              <Tag className="h-5 w-5 text-pink-400 mb-2" />
              <div className="text-white font-medium">תגיות</div>
              <div className="text-xs text-zinc-400">הוסף תגיות</div>
            </button>
            <button
              onClick={() => setAction('delete')}
              className="p-4 bg-zinc-800/50 hover:bg-red-500/20 rounded-lg transition-all text-left border border-red-500/30"
            >
              <Trash2 className="h-5 w-5 text-red-400 mb-2" />
              <div className="text-white font-medium">מחיקה</div>
              <div className="text-xs text-zinc-400">מחק לקוחות</div>
            </button>
          </div>
        );
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`פעולות מרובות - ${selectedCount} לקוחות נבחרו`}
      size="lg"
    >
      <div className="space-y-4">
        {action && (
          <button
            onClick={() => setAction(null)}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-4"
          >
            <X className="h-4 w-4" />
            חזור לתפריט
          </button>
        )}
        {renderActionContent()}
      </div>
    </Modal>
  );
}
