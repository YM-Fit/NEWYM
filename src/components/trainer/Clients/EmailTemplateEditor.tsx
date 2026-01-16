/**
 * Email Template Editor Component
 * עורך תבניות תקשורת
 */

import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { CommunicationService, type CommunicationTemplate } from '../../../services/communicationService';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';
import Modal from '../../ui/Modal';

interface EmailTemplateEditorProps {
  template?: CommunicationTemplate;
  onClose: () => void;
  onSave?: () => void;
}

export default function EmailTemplateEditor({ template, onClose, onSave }: EmailTemplateEditorProps) {
  const { user } = useAuth();
  const [name, setName] = useState(template?.name || '');
  const [templateType, setTemplateType] = useState<'email' | 'sms' | 'whatsapp'>(template?.template_type || 'email');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;

    if (!name || !body) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }

    try {
      setSaving(true);

      if (template) {
        // Update existing template
        const result = await CommunicationService.updateTemplate(template.id, {
          name,
          template_type: templateType,
          subject: templateType === 'email' ? subject : undefined,
          body,
        });

        if (result.success) {
          toast.success('תבנית עודכנה בהצלחה');
          onSave?.();
          onClose();
        } else {
          toast.error(result.error || 'שגיאה בעדכון תבנית');
        }
      } else {
        // Create new template
        const result = await CommunicationService.createTemplate({
          trainer_id: user.id,
          template_type: templateType,
          name,
          subject: templateType === 'email' ? subject : undefined,
          body,
          variables: [],
        });

        if (result.success) {
          toast.success('תבנית נוצרה בהצלחה');
          onSave?.();
          onClose();
        } else {
          toast.error(result.error || 'שגיאה ביצירת תבנית');
        }
      }
    } catch (error) {
      logger.error('Error saving template', error, 'EmailTemplateEditor');
      toast.error('שגיאה בשמירת תבנית');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={template ? 'ערוך תבנית' : 'תבנית תקשורת חדשה'}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">שם תבנית</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="לדוגמה: תזכורת תשלום"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">סוג תבנית</label>
          <select
            value={templateType}
            onChange={(e) => setTemplateType(e.target.value as 'email' | 'sms' | 'whatsapp')}
            className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="email">אימייל</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>

        {templateType === 'email' && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">נושא</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="לדוגמה: תזכורת לתשלום"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">תוכן</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
            placeholder="שלום {{name}},&#10;&#10;זהו תזכורת לתשלום.&#10;&#10;תודה,&#10;{{trainer_name}}"
          />
          <div className="mt-2 p-3 bg-zinc-800/30 rounded-lg">
            <p className="text-xs text-zinc-400 mb-1">משתנים זמינים:</p>
            <div className="flex flex-wrap gap-2">
              {['name', 'email', 'phone', 'trainer_name'].map((varName) => (
                <code key={varName} className="text-xs bg-zinc-700 px-2 py-1 rounded">
                  {'{{' + varName + '}}'}
                </code>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 rounded-lg transition-all flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'שומר...' : 'שמור'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
