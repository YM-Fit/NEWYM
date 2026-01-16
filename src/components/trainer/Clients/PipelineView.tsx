/**
 * Pipeline View Component
 * תצוגת Pipeline עם drag & drop
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, 
  TrendingUp, 
  AlertCircle, 
  RefreshCw,
  GripVertical,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { CrmPipelineService, type PipelineStage, type PipelineStats } from '../../../services/crmPipelineService';
import { CRM_STATUS, CRM_STATUS_LABELS } from '../../../constants/crmConstants';
import { getTrainees } from '../../../api/traineeApi';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';
import type { Trainee } from '../../../types';

interface PipelineViewProps {
  onClientClick?: (trainee: Trainee) => void;
}

export default function PipelineView({ onClientClick }: PipelineViewProps) {
  const { user } = useAuth();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [draggedClient, setDraggedClient] = useState<{ traineeId: string; stage: string } | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const loadPipeline = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [stagesResult, statsResult] = await Promise.all([
        CrmPipelineService.getPipelineStages(user.id),
        CrmPipelineService.getPipelineStats(user.id),
      ]);

      if (stagesResult.success && stagesResult.data) {
        setStages(stagesResult.data);
      } else if (stagesResult.error) {
        logger.error('Error loading pipeline', stagesResult.error, 'PipelineView');
        toast.error(stagesResult.error);
      }

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (error) {
      logger.error('Error loading pipeline', error, 'PipelineView');
      toast.error('שגיאה בטעינת Pipeline');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadPipeline();
    }
  }, [user, loadPipeline]);

  const handleDragStart = (traineeId: string, currentStage: string) => {
    setDraggedClient({ traineeId, stage: currentStage });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-emerald-500', 'bg-emerald-500/10');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('border-emerald-500', 'bg-emerald-500/10');
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-emerald-500', 'bg-emerald-500/10');

    if (!draggedClient || draggedClient.stage === targetStage) {
      setDraggedClient(null);
      return;
    }

    try {
      setUpdatingStatus(draggedClient.traineeId);
      const result = await CrmPipelineService.updateClientStatus(
        draggedClient.traineeId,
        targetStage as typeof CRM_STATUS[keyof typeof CRM_STATUS],
        'Pipeline drag & drop'
      );

      if (result.success) {
        toast.success('סטטוס עודכן בהצלחה');
        await loadPipeline();
      } else {
        toast.error(result.error || 'שגיאה בעדכון סטטוס');
      }
    } catch (error) {
      logger.error('Error updating status', error, 'PipelineView');
      toast.error('שגיאה בעדכון סטטוס');
    } finally {
      setUpdatingStatus(null);
      setDraggedClient(null);
    }
  };

  const getStageColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
      purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
      emerald: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
      yellow: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
      red: 'bg-red-500/20 border-red-500/30 text-red-400',
      gray: 'bg-gray-500/20 border-gray-500/30 text-gray-400',
    };
    return colors[color] || colors.gray;
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
              <BarChart3 className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Pipeline ניהול לקוחות</h1>
              <p className="text-sm text-zinc-400">גרור ושחרר לקוחות בין שלבים</p>
            </div>
          </div>
          <button
            onClick={loadPipeline}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            aria-label="רענן"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-sm text-zinc-400 mb-1">סה"כ לקוחות</div>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
            </div>
            {stats.conversionRates.lead_to_qualified !== undefined && (
              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                <div className="text-sm text-zinc-400 mb-1">ליד → מוסמך</div>
                <div className="text-2xl font-bold text-blue-400">
                  {stats.conversionRates.lead_to_qualified.toFixed(1)}%
                </div>
              </div>
            )}
            {stats.conversionRates.qualified_to_active !== undefined && (
              <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
                <div className="text-sm text-zinc-400 mb-1">מוסמך → פעיל</div>
                <div className="text-2xl font-bold text-purple-400">
                  {stats.conversionRates.qualified_to_active.toFixed(1)}%
                </div>
              </div>
            )}
            {stats.bottlenecks.length > 0 && (
              <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                <div className="text-sm text-zinc-400 mb-1">צווארי בקבוק</div>
                <div className="text-2xl font-bold text-red-400">{stats.bottlenecks.length}</div>
              </div>
            )}
          </div>
        )}

        {/* Bottlenecks Alert */}
        {stats && stats.bottlenecks.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertCircle className="h-5 w-5" />
              <span className="font-semibold">צווארי בקבוק זוהו:</span>
            </div>
            <div className="mt-2 text-sm text-zinc-300">
              {stats.bottlenecks.map((bottleneck) => (
                <span key={bottleneck} className="mr-2">
                  {CRM_STATUS_LABELS[bottleneck as keyof typeof CRM_STATUS_LABELS]}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pipeline Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stages.map((stage) => (
          <div
            key={stage.status}
            className="premium-card p-4 min-h-[500px]"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.status)}
          >
            {/* Stage Header */}
            <div className={`${getStageColor(stage.color)} rounded-lg p-3 mb-4 border`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{stage.label}</h3>
                  <div className="text-2xl font-bold mt-1">{stage.count}</div>
                </div>
                <Users className="h-6 w-6 opacity-50" />
              </div>
            </div>

            {/* Clients List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {stage.clients.map((client) => (
                <div
                  key={client.id}
                  draggable={!updatingStatus || updatingStatus !== client.id}
                  onDragStart={() => handleDragStart(client.id, stage.status)}
                  onClick={() => onClientClick?.(client)}
                  className={`
                    premium-card p-3 cursor-move hover:scale-[1.02] transition-all
                    ${updatingStatus === client.id ? 'opacity-50' : ''}
                    ${draggedClient?.traineeId === client.id ? 'opacity-30' : ''}
                  `}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-zinc-500 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white truncate">{client.full_name}</h4>
                      {client.email && (
                        <p className="text-xs text-zinc-400 truncate">{client.email}</p>
                      )}
                      {client.contract_value && (
                        <p className="text-xs text-emerald-400 mt-1">
                          ₪{Number(client.contract_value).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {updatingStatus === client.id && (
                      <RefreshCw className="h-4 w-4 animate-spin text-emerald-400 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
              {stage.clients.length === 0 && (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  אין לקוחות בשלב זה
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
