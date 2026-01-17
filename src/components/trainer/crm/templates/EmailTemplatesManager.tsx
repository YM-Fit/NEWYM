/**
 * Email Templates Manager Component
 * ניהול תבניות אימייל מלא עם editor, preview, ו-send
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Mail, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Save,
  Code
} from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { EmailTemplateService, type EmailTemplatePreview } from '../../../../services/emailTemplateService';
import { CommunicationService, type CommunicationTemplate } from '../../../../services/communicationService';
import toast from 'react-hot-toast';
import { logger } from '../../../../utils/logger';
import { Modal } from '../../../ui/Modal';

export default function EmailTemplatesManager() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplatePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null);
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});

  const loadTemplates = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const result = await EmailTemplateService.getTemplatesWithPreview(user.id);
      
      if (result.success && result.data) {
        setTemplates(result.data);
        // Initialize preview variables with default values
        if (result.data.length > 0 && result.data[0].preview) {
          setPreviewVariables(result.data[0].preview.variables);
        }
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      logger.error('Error loading templates', error, 'EmailTemplatesManager');
      toast.error('שגיאה בטעינת תבניות');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleDelete = async (templateId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את התבנית הזו?')) {
      return;
    }

    try {
      const result = await CommunicationService.deleteTemplate(templateId);
      if (result.success) {
        toast.success('תבנית נמחקה בהצלחה');
        loadTemplates();
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      logger.error('Error deleting template', error, 'EmailTemplatesManager');
      toast.error('שגיאה במחיקת תבנית');
    }
  };

  const handlePreview = (template: CommunicationTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleEdit = (template: CommunicationTemplate) => {
    setSelectedTemplate(template);
    setShowEditor(true);
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setShowEditor(true);
  };

  const availableVariables = EmailTemplateService.getAvailableVariables();

  if (loading) {
    return (
      <div className="premium-card p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto"></div>
        <p className="mt-4 text-zinc-400">טוען תבניות...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mail className="h-6 w-6 text-emerald-400" />
            ניהול תבניות אימייל
          </h2>
          <p className="text-zinc-400 mt-1">צור, ערוך וצפה בתבניות אימייל</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          תבנית חדשה
        </button>
      </div>

      {/* Available Variables */}
      <div className="premium-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Code className="h-5 w-5 text-blue-400" />
          משתנים זמינים
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {availableVariables.map((variable) => (
            <div key={variable.key} className="p-3 bg-zinc-800 rounded-lg">
              <div className="font-mono text-sm text-emerald-400 mb-1">
                {`{{${variable.key}}}`}
              </div>
              <div className="text-xs text-zinc-400">{variable.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="premium-card p-12 text-center">
          <Mail className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">אין תבניות</h3>
          <p className="text-zinc-400 mb-6">צור תבנית חדשה כדי להתחיל</p>
          <button
            onClick={handleCreateNew}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            צור תבנית חדשה
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((templatePreview) => {
            const template = templatePreview.template;
            return (
              <div key={template.id} className="premium-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-zinc-400 mb-2">{template.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="px-2 py-1 bg-zinc-800 rounded">
                        {template.template_type === 'email' ? 'אימייל' : 'SMS'}
                      </span>
                      {template.category && (
                        <span className="px-2 py-1 bg-zinc-800 rounded">{template.category}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preview */}
                {templatePreview.preview && (
                  <div className="mb-4 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                    {templatePreview.preview.subject && (
                      <div className="mb-2">
                        <div className="text-xs text-zinc-500 mb-1">נושא:</div>
                        <div className="text-sm text-white">{templatePreview.preview.subject}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">תוכן:</div>
                      <div className="text-sm text-zinc-300 line-clamp-3">
                        {templatePreview.preview.body}
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePreview(template)}
                    className="flex-1 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Eye className="h-4 w-4" />
                    תצוגה מקדימה
                  </button>
                  <button
                    onClick={() => handleEdit(template)}
                    className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors"
                    title="ערוך"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    title="מחק"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <EmailTemplateEditorModal
          template={selectedTemplate}
          onClose={() => {
            setShowEditor(false);
            setSelectedTemplate(null);
          }}
          onSave={() => {
            setShowEditor(false);
            setSelectedTemplate(null);
            loadTemplates();
          }}
        />
      )}

      {/* Preview Modal */}
      {showPreview && selectedTemplate && (
        <EmailTemplatePreviewModal
          template={selectedTemplate}
          variables={previewVariables}
          onClose={() => {
            setShowPreview(false);
            setSelectedTemplate(null);
          }}
          onVariablesChange={setPreviewVariables}
        />
      )}
    </div>
  );
}

// Email Template Editor Modal
function EmailTemplateEditorModal({
  template,
  onClose,
  onSave,
}: {
  template: CommunicationTemplate | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');
  const [category, setCategory] = useState(template?.category || '');
  const [templateType, setTemplateType] = useState<'email' | 'sms'>(
    template?.template_type === 'whatsapp' ? 'email' : (template?.template_type || 'email')
  );
  const [saving, setSaving] = useState(false);

  const availableVariables = EmailTemplateService.getAvailableVariables();

  const handleSave = async () => {
    if (!user || !name || !body) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }

    try {
      setSaving(true);
      if (template) {
        // Update existing template
        const result = await CommunicationService.updateTemplate(template.id, {
          name,
          description,
          subject: templateType === 'email' ? subject : undefined,
          body,
          category,
          template_type: templateType,
        });
        if (result.success) {
          toast.success('תבנית עודכנה בהצלחה');
          onSave();
        } else if (result.error) {
          toast.error(result.error);
        }
      } else {
        // Create new template
        const result = await CommunicationService.createTemplate({
          trainer_id: user.id,
          name,
          description,
          subject: templateType === 'email' ? subject : undefined,
          body,
          category,
          template_type: templateType,
          variables: [],
        });
        if (result.success) {
          toast.success('תבנית נוצרה בהצלחה');
          onSave();
        } else if (result.error) {
          toast.error(result.error);
        }
      }
    } catch (error) {
      logger.error('Error saving template', error, 'EmailTemplateEditorModal');
      toast.error('שגיאה בשמירת תבנית');
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variableKey: string) => {
    const variable = `{{${variableKey}}}`;
    setBody(body + variable);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={template ? 'ערוך תבנית' : 'תבנית חדשה'} size="xl">
      <div className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">שם תבנית *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full premium-input"
              placeholder="לדוגמה: אימייל מעקב"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">קטגוריה</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full premium-input"
              placeholder="לדוגמה: מעקב"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">תיאור</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full premium-input"
            placeholder="תיאור קצר של התבנית"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">סוג תבנית</label>
          <select
            value={templateType}
            onChange={(e) => setTemplateType(e.target.value as 'email' | 'sms')}
            className="w-full premium-input"
          >
            <option value="email">אימייל</option>
            <option value="sms">SMS</option>
          </select>
        </div>

        {/* Subject (only for email) */}
        {templateType === 'email' && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">נושא *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full premium-input"
              placeholder="נושא האימייל"
            />
          </div>
        )}

        {/* Body */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-zinc-300">תוכן *</label>
            <div className="flex flex-wrap gap-2">
              {availableVariables.map((variable) => (
                <button
                  key={variable.key}
                  onClick={() => insertVariable(variable.key)}
                  className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-emerald-400 rounded transition-colors"
                  title={variable.description}
                >
                  {`{{${variable.key}}}`}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="w-full premium-input font-mono text-sm"
            placeholder="תוכן התבנית. השתמש ב-{{variable}} להכנסת משתנים."
          />
        </div>

        {/* Actions */}
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

// Email Template Preview Modal
function EmailTemplatePreviewModal({
  template,
  variables,
  onClose,
  onVariablesChange,
}: {
  template: CommunicationTemplate;
  variables: Record<string, string>;
  onClose: () => void;
  onVariablesChange: (vars: Record<string, string>) => void;
}) {
  const preview = EmailTemplateService.previewTemplate(template, variables);
  const availableVariables = EmailTemplateService.getAvailableVariables();

  return (
    <Modal isOpen={true} onClose={onClose} title="תצוגה מקדימה" size="xl">
      <div className="space-y-6">
        {/* Variable Editor */}
        <div className="premium-card p-4">
          <h3 className="text-sm font-semibold text-white mb-3">ערוך משתנים</h3>
          <div className="grid grid-cols-2 gap-3">
            {availableVariables.map((variable) => (
              <div key={variable.key}>
                <label className="block text-xs text-zinc-400 mb-1">{variable.description}</label>
                <input
                  type="text"
                  value={variables[variable.key] || ''}
                  onChange={(e) =>
                    onVariablesChange({ ...variables, [variable.key]: e.target.value })
                  }
                  className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-sm"
                  placeholder={variable.example}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="premium-card p-6">
          <h3 className="text-sm font-semibold text-white mb-4">תצוגה מקדימה</h3>
          {preview.subject && (
            <div className="mb-4 p-3 bg-zinc-800 rounded border border-zinc-700">
              <div className="text-xs text-zinc-500 mb-1">נושא:</div>
              <div className="text-white">{preview.subject}</div>
            </div>
          )}
          <div className="p-4 bg-white text-black rounded border border-zinc-700 whitespace-pre-wrap">
            {preview.body}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 rounded-lg transition-all"
          >
            סגור
          </button>
        </div>
      </div>
    </Modal>
  );
}
