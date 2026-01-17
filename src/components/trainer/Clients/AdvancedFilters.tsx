/**
 * Advanced Filters Component
 * פילטרים מתקדמים ו-segmentation
 */

import { useState, useEffect, useCallback } from 'react';
import { Filter, Plus, Save, Trash2, Users, Download } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { SegmentationService, type FilterCondition, type Segment } from '../../../services/segmentationService';
import { getTrainees } from '../../../api/traineeApi';
import { exportClientsToCSV } from '../../../utils/exportUtils';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';
import { Modal } from '../../ui/Modal';
import type { Trainee } from '../../../types';

interface AdvancedFiltersProps {
  onFilteredClients?: (clients: Trainee[]) => void;
}

export default function AdvancedFilters({ onFilteredClients }: AdvancedFiltersProps) {
  const { user } = useAuth();
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [filteredClients, setFilteredClients] = useState<Trainee[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSegmentEditor, setShowSegmentEditor] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [traineesResult, segmentsResult] = await Promise.all([
        getTrainees(user.id),
        SegmentationService.getSegments(user.id),
      ]);

      if (traineesResult.success && traineesResult.data) {
        setTrainees(traineesResult.data);
        setFilteredClients(traineesResult.data);
      }

      if (segmentsResult.success && segmentsResult.data) {
        setSegments(segmentsResult.data);
      }
    } catch (error) {
      logger.error('Error loading data', error, 'AdvancedFilters');
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

  useEffect(() => {
    applyFilters();
  }, [conditions, trainees]);

  const applyFilters = async () => {
    if (!user || conditions.length === 0) {
      setFilteredClients(trainees);
      onFilteredClients?.(trainees);
      return;
    }

    try {
      const result = await SegmentationService.filterClients(user.id, conditions);
      if (result.success && result.data) {
        setFilteredClients(result.data);
        onFilteredClients?.(result.data);
      }
    } catch (error) {
      logger.error('Error applying filters', error, 'AdvancedFilters');
    }
  };

  const addCondition = () => {
    setConditions([...conditions, {
      field: 'crm_status',
      operator: 'equals',
      value: '',
    }]);
  };

  const updateCondition = (index: number, updates: Partial<FilterCondition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setConditions(newConditions);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleSaveSegment = async (name: string, description: string, autoUpdate: boolean) => {
    if (!user || conditions.length === 0) {
      toast.error('הוסף לפחות תנאי אחד');
      return;
    }

    try {
      if (selectedSegment) {
        const result = await SegmentationService.updateSegment(selectedSegment.id, {
          name,
          description,
          filter_criteria: conditions,
          auto_update: autoUpdate,
        });
        if (result.success) {
          toast.success('Segment עודכן בהצלחה');
          await loadData();
          setShowSegmentEditor(false);
        }
      } else {
        const result = await SegmentationService.createSegment({
          trainer_id: user.id,
          name,
          description,
          filter_criteria: conditions,
          auto_update: autoUpdate,
        });
        if (result.success) {
          toast.success('Segment נוצר בהצלחה');
          await loadData();
          setShowSegmentEditor(false);
        }
      }
    } catch (error) {
      logger.error('Error saving segment', error, 'AdvancedFilters');
      toast.error('שגיאה בשמירת segment');
    }
  };

  const handleLoadSegment = async (segment: Segment) => {
    setConditions(segment.filter_criteria);
    setSelectedSegment(segment);
  };

  const handleExport = () => {
    if (filteredClients.length === 0) {
      toast.error('אין לקוחות לייצוא');
      return;
    }
    exportClientsToCSV(filteredClients, `filtered-clients-${new Date().toISOString().split('T')[0]}`);
    toast.success('הקובץ יוצא בהצלחה');
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
              <Filter className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">פילטרים מתקדמים</h1>
              <p className="text-sm text-zinc-400">
                נמצאו {filteredClients.length} מתוך {trainees.length} לקוחות
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={filteredClients.length === 0}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              ייצא
            </button>
            <button
              onClick={() => {
                setSelectedSegment(null);
                setShowSegmentEditor(true);
              }}
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              שמור Segment
            </button>
          </div>
        </div>

        {/* Saved Segments */}
        {segments.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Segments שמורים</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {segments.map((segment) => (
                <div
                  key={segment.id}
                  className="premium-card p-4 cursor-pointer hover:scale-[1.02] transition-all"
                  onClick={() => handleLoadSegment(segment)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">{segment.name}</h3>
                    <Users className="h-4 w-4 text-emerald-400" />
                  </div>
                  {segment.description && (
                    <p className="text-sm text-zinc-400 mb-2">{segment.description}</p>
                  )}
                  <div className="text-xs text-zinc-500">
                    {segment.client_count || 0} לקוחות
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Conditions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">תנאי סינון</h2>
            <button
              onClick={addCondition}
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              הוסף תנאי
            </button>
          </div>

          <div className="space-y-3">
            {conditions.map((condition, index) => (
              <div key={index} className="premium-card p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <select
                    value={condition.field}
                    onChange={(e) => updateCondition(index, { field: e.target.value })}
                    className="px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="crm_status">סטטוס CRM</option>
                    <option value="payment_status">סטטוס תשלום</option>
                    <option value="contract_type">סוג חוזה</option>
                    <option value="contract_value">ערך חוזה</option>
                    <option value="full_name">שם</option>
                    <option value="email">אימייל</option>
                  </select>

                  <select
                    value={condition.operator}
                    onChange={(e) => updateCondition(index, { operator: e.target.value as FilterCondition['operator'] })}
                    className="px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="equals">שווה ל</option>
                    <option value="not_equals">לא שווה ל</option>
                    <option value="greater_than">גדול מ</option>
                    <option value="less_than">קטן מ</option>
                    <option value="contains">מכיל</option>
                    <option value="is_empty">ריק</option>
                    <option value="is_not_empty">לא ריק</option>
                  </select>

                  {!['is_empty', 'is_not_empty'].includes(condition.operator) && (
                    <input
                      type="text"
                      value={condition.value || ''}
                      onChange={(e) => updateCondition(index, { value: e.target.value })}
                      className="px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
                      placeholder="ערך"
                    />
                  )}

                  <button
                    onClick={() => removeCondition(index)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {conditions.length === 0 && (
              <div className="text-center py-8 text-zinc-500">
                אין תנאי סינון. הוסף תנאי כדי להתחיל.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Segment Editor Modal */}
      {showSegmentEditor && (
        <SegmentEditor
          segment={selectedSegment}
          conditions={conditions}
          onClose={() => {
            setShowSegmentEditor(false);
            setSelectedSegment(null);
          }}
          onSave={handleSaveSegment}
        />
      )}
    </div>
  );
}

// Segment Editor Component
function SegmentEditor({
  segment,
  conditions,
  onClose,
  onSave,
}: {
  segment: Segment | null;
  conditions: FilterCondition[];
  onClose: () => void;
  onSave: (name: string, description: string, autoUpdate: boolean) => void;
}) {
  const [name, setName] = useState(segment?.name || '');
  const [description, setDescription] = useState(segment?.description || '');
  const [autoUpdate, setAutoUpdate] = useState(segment?.auto_update || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name) {
      toast.error('נא להזין שם ל-segment');
      return;
    }

    setSaving(true);
    try {
      onSave(name, description, autoUpdate);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={segment ? 'ערוך Segment' : 'Segment חדש'} size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">שם</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
            placeholder="לדוגמה: לקוחות פעילים"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">תיאור</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
            placeholder="תיאור ה-segment..."
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="autoUpdate"
            checked={autoUpdate}
            onChange={(e) => setAutoUpdate(e.target.checked)}
            className="w-4 h-4 text-emerald-500 bg-zinc-800 border-zinc-700 rounded"
          />
          <label htmlFor="autoUpdate" className="text-sm text-zinc-300">
            עדכון אוטומטי
          </label>
        </div>

        <div className="text-sm text-zinc-400">
          {conditions.length} תנאי סינון
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
