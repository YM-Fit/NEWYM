/**
 * Communication Center Component
 * מרכז תקשורת עם לקוחות
 */

import { useState, useEffect, useCallback } from 'react';
import { Mail, MessageSquare, Send, History, FileText, Plus } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { CommunicationService, type CommunicationTemplate, type CommunicationMessage } from '../../../../services/communicationService';
import { getTrainees } from '../../../../api/traineeApi';
import toast from 'react-hot-toast';
import { logger } from '../../../../utils/logger';
import { Modal } from '../../../ui/Modal';

interface CommunicationCenterProps {
  traineeId?: string;
  onClose?: () => void;
}

export default function CommunicationCenter({ traineeId, onClose }: CommunicationCenterProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [trainees, setTrainees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [sending, setSending] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [templatesResult, traineesResult] = await Promise.all([
        CommunicationService.getTemplates(user.id),
        getTrainees(user.id),
      ]);

      if (templatesResult.success && templatesResult.data) {
        setTemplates(templatesResult.data);
      }

      if (traineesResult.success && traineesResult.data) {
        setTrainees(traineesResult.data);
      }

      if (traineeId) {
        const messagesResult = await CommunicationService.getCommunicationHistory(traineeId);
        if (messagesResult.success && messagesResult.data) {
          setMessages(messagesResult.data);
        }
      }
    } catch (error) {
      logger.error('Error loading communication data', error, 'CommunicationCenter');
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  }, [user, traineeId]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleSendMessage = async (template: CommunicationTemplate, targetTraineeId: string) => {
    if (!user) return;

    try {
      setSending(true);
      const trainee = trainees.find(t => t.id === targetTraineeId);
      if (!trainee) {
        toast.error('מתאמן לא נמצא');
        return;
      }

      const variables = {
        name: trainee.full_name,
        email: trainee.email || '',
        phone: trainee.phone || '',
      };

      const rendered = CommunicationService.renderTemplate(template, variables);

      if (template.template_type === 'email' && trainee.email) {
        const result = await CommunicationService.sendEmail(
          trainee.email,
          rendered.subject || '',
          rendered.body,
          user.id,
          targetTraineeId
        );
        if (result.success) {
          toast.success('אימייל נשלח בהצלחה');
          await loadData();
        } else {
          toast.error(result.error || 'שגיאה בשליחת אימייל');
        }
      } else if (template.template_type === 'sms' && trainee.phone) {
        const result = await CommunicationService.sendSMS(
          trainee.phone,
          rendered.body,
          user.id,
          targetTraineeId
        );
        if (result.success) {
          toast.success('SMS נשלח בהצלחה');
          await loadData();
        } else {
          toast.error(result.error || 'שגיאה בשליחת SMS');
        }
      } else {
        toast.error('חסר אימייל או טלפון למתאמן');
      }
    } catch (error) {
      logger.error('Error sending message', error, 'CommunicationCenter');
      toast.error('שגיאה בשליחת הודעה');
    } finally {
      setSending(false);
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
              <MessageSquare className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">מרכז תקשורת</h1>
              <p className="text-sm text-zinc-400">שליחת הודעות ללקוחות</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTemplateEditor(true)}
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              תבנית חדשה
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

        {/* Templates */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">תבניות</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="premium-card p-4 cursor-pointer hover:scale-[1.02] transition-all"
                onClick={() => setSelectedTemplate(template)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {template.template_type === 'email' ? (
                      <Mail className="h-5 w-5 text-blue-400" />
                    ) : (
                      <MessageSquare className="h-5 w-5 text-green-400" />
                    )}
                    <h3 className="font-semibold text-white">{template.name}</h3>
                  </div>
                </div>
                <p className="text-sm text-zinc-400 line-clamp-2">{template.body.substring(0, 100)}...</p>
                {template.subject && (
                  <p className="text-xs text-zinc-500 mt-2">נושא: {template.subject}</p>
                )}
              </div>
            ))}
            {templates.length === 0 && (
              <div className="col-span-full text-center py-8 text-zinc-500">
                אין תבניות. צור תבנית חדשה כדי להתחיל.
              </div>
            )}
          </div>
        </div>

        {/* Send Message */}
        {selectedTemplate && traineeId && (
          <div className="premium-card p-4 bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">שלח {selectedTemplate.name}</h3>
                <p className="text-sm text-zinc-400">למתאמן הנוכחי</p>
              </div>
              <button
                onClick={() => handleSendMessage(selectedTemplate, traineeId)}
                disabled={sending}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {sending ? 'שולח...' : 'שלח'}
              </button>
            </div>
          </div>
        )}

        {/* Communication History */}
        {traineeId && messages.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <History className="h-5 w-5 text-emerald-400" />
              היסטוריית תקשורת
            </h2>
            <div className="space-y-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="premium-card p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {message.message_type === 'email' ? (
                          <Mail className="h-4 w-4 text-blue-400" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-green-400" />
                        )}
                        <span className="text-sm font-semibold text-white">
                          {message.message_type === 'email' ? 'אימייל' : 'SMS'}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {new Date(message.sent_at).toLocaleDateString('he-IL')}
                        </span>
                      </div>
                      {message.subject && (
                        <p className="text-sm text-zinc-300 mb-1">{message.subject}</p>
                      )}
                      <p className="text-sm text-zinc-400 line-clamp-2">{message.body}</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      message.status === 'sent' ? 'bg-emerald-500/20 text-emerald-400' :
                      message.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {message.status === 'sent' ? 'נשלח' :
                       message.status === 'failed' ? 'נכשל' : 'ממתין'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Template Editor Modal */}
      {showTemplateEditor && (
        <EmailTemplateEditor
          onClose={() => {
            setShowTemplateEditor(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Email Template Editor Component
function EmailTemplateEditor({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [templateType, setTemplateType] = useState<'email' | 'sms'>('email');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !name || !body) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }

    try {
      setSaving(true);
      const result = await CommunicationService.createTemplate({
        trainer_id: user.id,
        template_type: templateType,
        name,
        subject: templateType === 'email' ? subject : undefined,
        body,
        variables: [],
      });

      if (result.success) {
        toast.success('תבנית נשמרה בהצלחה');
        onClose();
      } else {
        toast.error(result.error || 'שגיאה בשמירת תבנית');
      }
    } catch (error) {
      logger.error('Error saving template', error, 'EmailTemplateEditor');
      toast.error('שגיאה בשמירת תבנית');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="תבנית תקשורת חדשה">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">שם תבנית</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
            placeholder="לדוגמה: תזכורת תשלום"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">סוג תבנית</label>
          <select
            value={templateType}
            onChange={(e) => setTemplateType(e.target.value as 'email' | 'sms')}
            className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
          >
            <option value="email">אימייל</option>
            <option value="sms">SMS</option>
          </select>
        </div>

        {templateType === 'email' && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">נושא</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
              placeholder="לדוגמה: תזכורת לתשלום"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">תוכן</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
            placeholder="השתמש ב-{{name}}, {{email}}, {{phone}} למשתנים"
          />
          <p className="text-xs text-zinc-500 mt-1">
            משתנים זמינים: {'{{name}}'}, {'{{email}}'}, {'{{phone}}'}
          </p>
        </div>

        <div className="flex gap-2 justify-end">
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
