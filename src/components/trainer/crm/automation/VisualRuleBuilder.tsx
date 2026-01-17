/**
 * Visual Rule Builder Component
 * בונה כללי אוטומציה ויזואלי עם conditional logic
 */

import { useState, useEffect } from 'react';
import { Save, X, Plus, Trash2, Clock, AlertCircle, Zap } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { 
  type AutomationRule,
  type AutomationCondition,
  type AutomationAction,
  type AutomationSchedule
} from '../../../../services/crmAutomationService';
import { Modal } from '../../../ui/Modal';
import toast from 'react-hot-toast';

interface VisualRuleBuilderProps {
  rule?: AutomationRule | null;
  onSave: (ruleData: Omit<AutomationRule, 'id' | 'created_at' | 'updated_at'>) => void;
  onClose: () => void;
}

export default function VisualRuleBuilder({ rule, onSave, onClose }: VisualRuleBuilderProps) {
  const { user } = useAuth();
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [ruleType, setRuleType] = useState<AutomationRule['rule_type']>(rule?.rule_type || 'reminder');
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [conditions, setConditions] = useState<AutomationCondition[]>(
    rule?.conditions || [{ field: 'crm_status', operator: 'equals', value: '' }]
  );
  const [actions, setActions] = useState<AutomationAction[]>(
    rule?.actions || [{ type: 'send_email', params: {} }]
  );
  const [schedule, setSchedule] = useState<AutomationSchedule | undefined>(rule?.schedule);
  const [showSchedule, setShowSchedule] = useState(false);

  const fieldOptions = [
    { value: 'crm_status', label: 'סטטוס CRM' },
    { value: 'payment_status', label: 'סטטוס תשלום' },
    { value: 'contract_value', label: 'ערך חוזה' },
    { value: 'last_contact_date', label: 'תאריך קשר אחרון' },
    { value: 'next_followup_date', label: 'תאריך מעקב הבא' },
    { value: 'total_events_count', label: 'מספר אירועים' },
  ];

  const operatorOptions = [
    { value: 'equals', label: 'שווה ל' },
    { value: 'not_equals', label: 'לא שווה ל' },
    { value: 'greater_than', label: 'גדול מ' },
    { value: 'less_than', label: 'קטן מ' },
    { value: 'contains', label: 'מכיל' },
    { value: 'is_empty', label: 'ריק' },
    { value: 'is_not_empty', label: 'לא ריק' },
  ];

  const actionTypes = [
    { value: 'send_email', label: 'שלח אימייל' },
    { value: 'send_sms', label: 'שלח SMS' },
    { value: 'create_task', label: 'צור משימה' },
    { value: 'update_status', label: 'עדכן סטטוס' },
    { value: 'create_interaction', label: 'צור אינטראקציה' },
    { value: 'send_notification', label: 'שלח התראה' },
  ];

  const handleAddCondition = () => {
    setConditions([...conditions, { field: 'crm_status', operator: 'equals', value: '' }]);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleUpdateCondition = (index: number, updates: Partial<AutomationCondition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setConditions(newConditions);
  };

  const handleAddAction = () => {
    setActions([...actions, { type: 'send_email', params: {} }]);
  };

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleUpdateAction = (index: number, updates: Partial<AutomationAction>) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], ...updates };
    setActions(newActions);
  };

  const handleUpdateActionParams = (index: number, paramKey: string, paramValue: any) => {
    const newActions = [...actions];
    newActions[index] = {
      ...newActions[index],
      params: {
        ...newActions[index].params,
        [paramKey]: paramValue,
      },
    };
    setActions(newActions);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('נא להזין שם לכלל');
      return;
    }

    if (conditions.length === 0) {
      toast.error('נא להוסיף לפחות תנאי אחד');
      return;
    }

    if (actions.length === 0) {
      toast.error('נא להוסיף לפחות פעולה אחת');
      return;
    }

    const ruleData: Omit<AutomationRule, 'id' | 'created_at' | 'updated_at'> = {
      trainer_id: user?.id || '',
      rule_type: ruleType,
      name: name.trim(),
      description: description.trim() || undefined,
      enabled,
      conditions,
      actions,
      schedule,
    };

    onSave(ruleData);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={rule ? 'ערוך כלל אוטומציה' : 'כלל אוטומציה חדש'}
      size="xl"
    >
      <div className="space-y-6 max-h-[80vh] overflow-y-auto">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">שם כלל</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="לדוגמה: תזכורת תשלום מעוכב"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">תיאור</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="תיאור קצר של הכלל"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">סוג כלל</label>
              <select
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value as AutomationRule['rule_type'])}
                className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="reminder">תזכורת</option>
                <option value="alert">התראה</option>
                <option value="workflow">זרימת עבודה</option>
                <option value="notification">הודעה</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 text-emerald-500 bg-zinc-800 border-zinc-700 rounded"
                />
                <span className="text-sm text-zinc-300">פעיל</span>
              </label>
            </div>
          </div>
        </div>

        {/* Conditions */}
        <div className="space-y-4 border-t border-zinc-800 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-400" />
              תנאים (אם)
            </h3>
            <button
              onClick={handleAddCondition}
              className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all flex items-center gap-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              הוסף תנאי
            </button>
          </div>

          <div className="space-y-3">
            {conditions.map((condition, index) => (
              <div key={index} className="premium-card p-4">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4">
                    <select
                      value={condition.field}
                      onChange={(e) => handleUpdateCondition(index, { field: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white text-sm"
                    >
                      {fieldOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <select
                      value={condition.operator}
                      onChange={(e) => handleUpdateCondition(index, { operator: e.target.value as any })}
                      className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white text-sm"
                    >
                      {operatorOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {!['is_empty', 'is_not_empty'].includes(condition.operator) && (
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={condition.value || ''}
                        onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white text-sm"
                        placeholder="ערך"
                      />
                    </div>
                  )}

                  <div className="col-span-1">
                    <button
                      onClick={() => handleRemoveCondition(index)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4 border-t border-zinc-800 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-400" />
              פעולות (אז)
            </h3>
            <button
              onClick={handleAddAction}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all flex items-center gap-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              הוסף פעולה
            </button>
          </div>

          <div className="space-y-3">
            {actions.map((action, index) => (
              <div key={index} className="premium-card p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <select
                      value={action.type}
                      onChange={(e) => handleUpdateAction(index, { type: e.target.value as any })}
                      className="flex-1 px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
                    >
                      {actionTypes.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleRemoveAction(index)}
                      className="ml-2 p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Action-specific parameters */}
                  {action.type === 'send_email' && (
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">ID תבנית אימייל</label>
                      <input
                        type="text"
                        value={action.params.template_id || ''}
                        onChange={(e) => handleUpdateActionParams(index, 'template_id', e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white text-sm"
                        placeholder="template_id"
                      />
                    </div>
                  )}

                  {action.type === 'update_status' && (
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">סטטוס חדש</label>
                      <select
                        value={action.params.status || ''}
                        onChange={(e) => handleUpdateActionParams(index, 'status', e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white text-sm"
                      >
                        <option value="">בחר סטטוס</option>
                        <option value="lead">ליד</option>
                        <option value="qualified">מוסמך</option>
                        <option value="active">פעיל</option>
                        <option value="inactive">לא פעיל</option>
                        <option value="churned">נטש</option>
                        <option value="on_hold">מושעה</option>
                      </select>
                    </div>
                  )}

                  {action.type === 'create_task' && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-sm text-zinc-400 mb-1">סוג משימה</label>
                        <input
                          type="text"
                          value={action.params.task_type || ''}
                          onChange={(e) => handleUpdateActionParams(index, 'task_type', e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white text-sm"
                          placeholder="לדוגמה: follow_up"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-zinc-400 mb-1">תאריך יעד</label>
                        <input
                          type="date"
                          value={action.params.due_date || ''}
                          onChange={(e) => handleUpdateActionParams(index, 'due_date', e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div className="space-y-4 border-t border-zinc-800 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-400" />
              תזמון (אופציונלי)
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showSchedule}
                onChange={(e) => {
                  setShowSchedule(e.target.checked);
                  if (!e.target.checked) {
                    setSchedule(undefined);
                  } else {
                    setSchedule({ frequency: 'daily' });
                  }
                }}
                className="w-4 h-4 text-emerald-500 bg-zinc-800 border-zinc-700 rounded"
              />
              <span className="text-sm text-zinc-300">הפעל תזמון</span>
            </label>
          </div>

          {showSchedule && schedule && (
            <div className="space-y-3 premium-card p-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">תדירות</label>
                <select
                  value={schedule.frequency}
                  onChange={(e) => setSchedule({
                    ...schedule,
                    frequency: e.target.value as any,
                  })}
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
                >
                  <option value="daily">יומי</option>
                  <option value="weekly">שבועי</option>
                  <option value="monthly">חודשי</option>
                  <option value="on_event">בזמן אירוע</option>
                </select>
              </div>

              {schedule.frequency === 'daily' && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">שעה</label>
                  <input
                    type="time"
                    value={schedule.time || ''}
                    onChange={(e) => setSchedule({ ...schedule, time: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
              )}

              {schedule.frequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">יום בשבוע</label>
                  <select
                    value={schedule.day_of_week || 0}
                    onChange={(e) => setSchedule({ ...schedule, day_of_week: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value={0}>ראשון</option>
                    <option value={1}>שני</option>
                    <option value={2}>שלישי</option>
                    <option value={3}>רביעי</option>
                    <option value={4}>חמישי</option>
                    <option value={5}>שישי</option>
                    <option value={6}>שבת</option>
                  </select>
                </div>
              )}

              {schedule.frequency === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">יום בחודש</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={schedule.day_of_month || 1}
                    onChange={(e) => setSchedule({ ...schedule, day_of_month: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
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
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            שמור כלל
          </button>
        </div>
      </div>
    </Modal>
  );
}
