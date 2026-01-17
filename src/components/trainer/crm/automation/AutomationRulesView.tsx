/**
 * Automation Rules View Component
 * תצוגת ניהול כללי אוטומציה עם Visual Rule Builder
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Zap, 
  Plus, 
  Edit, 
  Trash2, 
  ToggleLeft, 
  ToggleRight,
  Clock,
  AlertCircle,
  RefreshCw,
  Save
} from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { 
  CrmAutomationService, 
  type AutomationRule,
  type AutomationCondition,
  type AutomationAction,
  type AutomationSchedule
} from '../../../../services/crmAutomationService';
import VisualRuleBuilder from './VisualRuleBuilder';
import { Modal } from '../../../ui/Modal';
import toast from 'react-hot-toast';
import { logger } from '../../../../utils/logger';

export default function AutomationRulesView() {
  const { user } = useAuth();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  const loadRules = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const result = await CrmAutomationService.getAutomationRules(user.id);
      
      if (result.success && result.data) {
        setRules(result.data);
      } else if (result.error) {
        logger.error('Error loading rules', result.error, 'AutomationRulesView');
        toast.error(result.error);
      }
    } catch (error) {
      logger.error('Error loading automation rules', error, 'AutomationRulesView');
      toast.error('שגיאה בטעינת כללי אוטומציה');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadRules();
    }
  }, [user, loadRules]);

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    if (!user) return;

    try {
      const result = await CrmAutomationService.updateAutomationRule(ruleId, { enabled });
      
      if (result.success) {
        toast.success(enabled ? 'כלל הופעל' : 'כלל בוטל');
        await loadRules();
      } else {
        toast.error(result.error || 'שגיאה בעדכון כלל');
      }
    } catch (error) {
      logger.error('Error toggling rule', error, 'AutomationRulesView');
      toast.error('שגיאה בעדכון כלל');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק כלל זה?')) {
      return;
    }

    try {
      const result = await CrmAutomationService.deleteAutomationRule(ruleId);
      
      if (result.success) {
        toast.success('כלל נמחק בהצלחה');
        await loadRules();
      } else {
        toast.error(result.error || 'שגיאה במחיקת כלל');
      }
    } catch (error) {
      logger.error('Error deleting rule', error, 'AutomationRulesView');
      toast.error('שגיאה במחיקת כלל');
    }
  };

  const handleSaveRule = async (ruleData: Omit<AutomationRule, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      if (editingRule) {
        // Update existing rule
        const result = await CrmAutomationService.updateAutomationRule(editingRule.id, ruleData);
        
        if (result.success) {
          toast.success('כלל עודכן בהצלחה');
          setShowBuilder(false);
          setEditingRule(null);
          await loadRules();
        } else {
          toast.error(result.error || 'שגיאה בעדכון כלל');
        }
      } else {
        // Create new rule
        const result = await CrmAutomationService.createAutomationRule({
          ...ruleData,
          trainer_id: user.id,
        });
        
        if (result.success) {
          toast.success('כלל נוצר בהצלחה');
          setShowBuilder(false);
          await loadRules();
        } else {
          toast.error(result.error || 'שגיאה ביצירת כלל');
        }
      }
    } catch (error) {
      logger.error('Error saving rule', error, 'AutomationRulesView');
      toast.error('שגיאה בשמירת כלל');
    }
  };

  const handleEditRule = (rule: AutomationRule) => {
    setEditingRule(rule);
    setShowBuilder(true);
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setShowBuilder(true);
  };

  if (loading) {
    return (
      <div className="premium-card p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-400" />
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
              <Zap className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">כללי אוטומציה</h1>
              <p className="text-sm text-zinc-400">נהל תזכורות וזרימות עבודה אוטומטיות</p>
            </div>
          </div>
          <button
            onClick={handleCreateRule}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            כלל חדש
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-800/50 rounded-lg p-4">
            <div className="text-sm text-zinc-400 mb-1">סה"כ כללים</div>
            <div className="text-2xl font-bold text-white">{rules.length}</div>
          </div>
          <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
            <div className="text-sm text-zinc-400 mb-1">פעילים</div>
            <div className="text-2xl font-bold text-emerald-400">
              {rules.filter(r => r.enabled).length}
            </div>
          </div>
          <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20">
            <div className="text-sm text-zinc-400 mb-1">לא פעילים</div>
            <div className="text-2xl font-bold text-yellow-400">
              {rules.filter(r => !r.enabled).length}
            </div>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
            <div className="text-sm text-zinc-400 mb-1">תזכורות</div>
            <div className="text-2xl font-bold text-blue-400">
              {rules.filter(r => r.rule_type === 'reminder').length}
            </div>
          </div>
        </div>
      </div>

      {/* Rules List */}
      {rules.length === 0 ? (
        <div className="premium-card p-12 text-center">
          <Zap className="h-16 w-16 mx-auto mb-4 text-zinc-500" />
          <h3 className="text-lg font-semibold text-white mb-2">אין כללי אוטומציה</h3>
          <p className="text-zinc-400 mb-6">
            צור כלל חדש כדי להתחיל באוטומציה של תהליכים
          </p>
          <button
            onClick={handleCreateRule}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            צור כלל חדש
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`premium-card p-6 transition-all ${
                rule.enabled ? 'border-emerald-500/30' : 'border-zinc-700/50'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-white">{rule.name}</h3>
                    {rule.rule_type === 'reminder' && (
                      <Clock className="h-4 w-4 text-blue-400" />
                    )}
                    {rule.rule_type === 'alert' && (
                      <AlertCircle className="h-4 w-4 text-yellow-400" />
                    )}
                  </div>
                  {rule.description && (
                    <p className="text-sm text-zinc-400 mb-2">{rule.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>תנאים: {rule.conditions.length}</span>
                    <span>•</span>
                    <span>פעולות: {rule.actions.length}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleRule(rule.id, !rule.enabled)}
                  className="p-2 text-zinc-400 hover:text-white transition-all"
                  aria-label={rule.enabled ? 'בטל כלל' : 'הפעל כלל'}
                >
                  {rule.enabled ? (
                    <ToggleRight className="h-6 w-6 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="h-6 w-6" />
                  )}
                </button>
              </div>

              {/* Conditions Preview */}
              <div className="mb-4">
                <div className="text-xs text-zinc-500 mb-2">תנאים:</div>
                <div className="space-y-1">
                  {rule.conditions.slice(0, 2).map((condition, index) => (
                    <div key={index} className="text-xs text-zinc-400 bg-zinc-800/50 rounded px-2 py-1">
                      {condition.field} {getOperatorLabel(condition.operator)} {condition.value || ''}
                    </div>
                  ))}
                  {rule.conditions.length > 2 && (
                    <div className="text-xs text-zinc-500">
                      +{rule.conditions.length - 2} תנאים נוספים
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Preview */}
              <div className="mb-4">
                <div className="text-xs text-zinc-500 mb-2">פעולות:</div>
                <div className="flex flex-wrap gap-1">
                  {rule.actions.map((action, index) => (
                    <span
                      key={index}
                      className="text-xs bg-emerald-500/20 text-emerald-400 rounded px-2 py-1"
                    >
                      {getActionLabel(action.type)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Schedule Preview */}
              {rule.schedule && (
                <div className="mb-4 text-xs text-zinc-500">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {getScheduleLabel(rule.schedule)}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-zinc-800">
                <button
                  onClick={() => handleEditRule(rule)}
                  className="flex-1 px-3 py-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Edit className="h-4 w-4" />
                  ערוך
                </button>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all flex items-center gap-2 text-sm"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Visual Rule Builder Modal */}
      {showBuilder && (
        <VisualRuleBuilder
          rule={editingRule}
          onSave={handleSaveRule}
          onClose={() => {
            setShowBuilder(false);
            setEditingRule(null);
          }}
        />
      )}
    </div>
  );
}

// Helper functions
function getOperatorLabel(operator: string): string {
  const labels: Record<string, string> = {
    equals: 'שווה ל',
    not_equals: 'לא שווה ל',
    greater_than: 'גדול מ',
    less_than: 'קטן מ',
    contains: 'מכיל',
    is_empty: 'ריק',
    is_not_empty: 'לא ריק',
  };
  return labels[operator] || operator;
}

function getActionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    send_email: 'שלח אימייל',
    send_sms: 'שלח SMS',
    create_task: 'צור משימה',
    update_status: 'עדכן סטטוס',
    create_interaction: 'צור אינטראקציה',
    send_notification: 'שלח התראה',
  };
  return labels[actionType] || actionType;
}

function getScheduleLabel(schedule: AutomationSchedule): string {
  switch (schedule.frequency) {
    case 'daily':
      return `יומי ${schedule.time || ''}`;
    case 'weekly':
      return `שבועי - יום ${schedule.day_of_week || ''}`;
    case 'monthly':
      return `חודשי - יום ${schedule.day_of_month || ''}`;
    case 'on_event':
      return 'בזמן אירוע';
    default:
      return schedule.frequency;
  }
}
