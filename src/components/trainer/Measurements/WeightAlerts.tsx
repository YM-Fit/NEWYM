import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, TrendingUp, TrendingDown, Calendar, CheckCircle, X, Loader2, Settings, Filter } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

interface WeightAlert {
  id: string;
  trainee_id: string;
  trainee_name: string;
  alert_type: 'significant_change' | 'no_weigh_in' | 'goal_reached' | 'trend_change';
  message: string;
  weight_value?: number;
  previous_weight?: number;
  days_since_last?: number;
  priority: 'high' | 'medium' | 'low';
  is_seen: boolean;
  created_at: string;
}

interface WeightAlertsProps {
  trainerId: string;
  onTraineeClick?: (traineeId: string) => void;
}

export default function WeightAlerts({ trainerId, onTraineeClick }: WeightAlertsProps) {
  const [alerts, setAlerts] = useState<WeightAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [filterSeen, setFilterSeen] = useState<'all' | 'seen' | 'unseen'>('unseen');
  const [showSettings, setShowSettings] = useState(false);
  const [alertSettings, setAlertSettings] = useState({
    significantChangeThreshold: 2.0, // kg
    noWeighInDays: 7,
    enableSignificantChange: true,
    enableNoWeighIn: true,
    enableGoalReached: true,
    enableTrendChange: true
  });

  useEffect(() => {
    loadAlerts();
    loadSettings();
    // Check for alerts every 5 minutes
    const interval = setInterval(loadAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [trainerId]);

  const loadSettings = async () => {
    try {
      // Load settings from localStorage as fallback
      const savedSettings = localStorage.getItem(`weight_alerts_settings_${trainerId}`);
      if (savedSettings) {
        setAlertSettings({ ...alertSettings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      // Save settings to localStorage
      localStorage.setItem(`weight_alerts_settings_${trainerId}`, JSON.stringify(alertSettings));
      toast.success('ההגדרות נשמרו');
      setShowSettings(false);
      loadAlerts();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('שגיאה בשמירת ההגדרות');
    }
  };

  const loadAlerts = async () => {
    try {
      setLoading(true);
      
      // Get all trainees
      const { data: trainees } = await supabase
        .from('trainees')
        .select('id, full_name')
        .eq('trainer_id', trainerId)
        .eq('status', 'active');

      if (!trainees || trainees.length === 0) {
        setAlerts([]);
        setLoading(false);
        return;
      }

      const newAlerts: WeightAlert[] = [];

      for (const trainee of trainees) {
        // Get latest measurements
        const { data: measurements } = await supabase
          .from('measurements')
          .select('weight_kg, measurement_date')
          .eq('trainee_id', trainee.id)
          .order('measurement_date', { ascending: false })
          .limit(2);

        // Get latest self weights
        const { data: selfWeights } = await supabase
          .from('trainee_self_weights')
          .select('weight_kg, weight_date')
          .eq('trainee_id', trainee.id)
          .order('weight_date', { ascending: false })
          .limit(1);

        // Combine and sort by date
        const allWeights = [
          ...(measurements || []).map(m => ({ weight: m.weight_kg, date: m.measurement_date })),
          ...(selfWeights || []).map(w => ({ weight: w.weight_kg, date: w.weight_date }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const latestWeight = allWeights[0];
        const previousWeight = allWeights[1];

        if (!latestWeight) continue;

        const daysSinceLast = Math.floor(
          (new Date().getTime() - new Date(latestWeight.date).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check for significant change
        if (alertSettings.enableSignificantChange && previousWeight) {
          const change = Math.abs(latestWeight.weight - previousWeight.weight);
          if (change >= alertSettings.significantChangeThreshold) {
            newAlerts.push({
              id: `change-${trainee.id}-${latestWeight.date}`,
              trainee_id: trainee.id,
              trainee_name: trainee.full_name,
              alert_type: 'significant_change',
              message: `שינוי משמעותי במשקל: ${change.toFixed(1)} ק״ג`,
              weight_value: latestWeight.weight,
              previous_weight: previousWeight.weight,
              priority: change >= 3 ? 'high' : change >= 2 ? 'medium' : 'low',
              is_seen: false,
              created_at: latestWeight.date
            });
          }
        }

        // Check for no weigh-in
        if (alertSettings.enableNoWeighIn && daysSinceLast >= alertSettings.noWeighInDays) {
          newAlerts.push({
            id: `no-weigh-${trainee.id}-${daysSinceLast}`,
            trainee_id: trainee.id,
            trainee_name: trainee.full_name,
            alert_type: 'no_weigh_in',
            message: `לא שקל ${daysSinceLast} ימים`,
            days_since_last: daysSinceLast,
            priority: daysSinceLast >= 14 ? 'high' : daysSinceLast >= 10 ? 'medium' : 'low',
            is_seen: false,
            created_at: new Date().toISOString()
          });
        }

        // Check for goal reached
        if (alertSettings.enableGoalReached) {
          const { data: goals } = await supabase
            .from('trainee_goals')
            .select('*')
            .eq('trainee_id', trainee.id)
            .eq('goal_type', 'weight')
            .eq('status', 'active');

          goals?.forEach(goal => {
            if (goal.target_value && latestWeight.weight) {
              const isReached = Math.abs(latestWeight.weight - goal.target_value) <= 0.5;
              if (isReached) {
                newAlerts.push({
                  id: `goal-${trainee.id}-${goal.id}`,
                  trainee_id: trainee.id,
                  trainee_name: trainee.full_name,
                  alert_type: 'goal_reached',
                  message: `הגיע ליעד: ${goal.title} (${goal.target_value} ק״ג)`,
                  weight_value: latestWeight.weight,
                  priority: 'high',
                  is_seen: false,
                  created_at: latestWeight.date
                });
              }
            }
          });
        }
      }

      // Sort by priority and date
      newAlerts.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setAlerts(newAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
      toast.error('שגיאה בטעינת התראות');
    } finally {
      setLoading(false);
    }
  };

  const markAsSeen = async (alertId: string) => {
    // In a real implementation, you'd save this to the database
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_seen: true } : a));
  };

  const markAllAsSeen = () => {
    setAlerts(prev => prev.map(a => ({ ...a, is_seen: true })));
  };

  const deleteAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'significant_change':
        return <TrendingUp className="h-5 w-5" />;
      case 'no_weigh_in':
        return <Calendar className="h-5 w-5" />;
      case 'goal_reached':
        return <CheckCircle className="h-5 w-5" />;
      case 'trend_change':
        return <TrendingDown className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getAlertColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-500/50 bg-gradient-to-br from-red-500/10 to-orange-500/10';
      case 'medium':
        return 'border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-yellow-500/10';
      case 'low':
        return 'border-blue-500/50 bg-gradient-to-br from-blue-500/10 to-cyan-500/10';
      default:
        return 'border-gray-500/50 bg-gray-800/30';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterPriority !== 'all' && alert.priority !== filterPriority) return false;
    if (filterSeen === 'seen' && !alert.is_seen) return false;
    if (filterSeen === 'unseen' && alert.is_seen) return false;
    return true;
  });

  const unseenCount = alerts.filter(a => !a.is_seen).length;

  if (loading) {
    return (
      <div className="premium-card-static p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-teal-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="premium-card-static p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/30 to-orange-500/30 relative">
            <Bell className="h-6 w-6 text-red-400" />
            {unseenCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                {unseenCount}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">התראות משקל</h3>
            <p className="text-sm text-gray-400">{alerts.length} התראות</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <Settings className="h-5 w-5" />
          </button>
          {unseenCount > 0 && (
            <button
              onClick={markAllAsSeen}
              className="px-4 py-2 rounded-xl bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 text-sm font-medium transition-all"
            >
              סמן הכל כנראה
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as any)}
          className="px-4 py-2 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:ring-2 focus:ring-teal-500/50"
        >
          <option value="all">כל העדיפויות</option>
          <option value="high">גבוהה</option>
          <option value="medium">בינונית</option>
          <option value="low">נמוכה</option>
        </select>
        <select
          value={filterSeen}
          onChange={(e) => setFilterSeen(e.target.value as any)}
          className="px-4 py-2 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:ring-2 focus:ring-teal-500/50"
        >
          <option value="unseen">לא נראה</option>
          <option value="seen">נראה</option>
          <option value="all">הכל</option>
        </select>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-16 w-16 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 font-medium">אין התראות</p>
          <p className="text-sm text-gray-500 mt-2">התראות חדשות יופיעו כאן</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] ${
                alert.is_seen ? 'opacity-60' : ''
              } ${getAlertColor(alert.priority)}`}
              onClick={() => {
                markAsSeen(alert.id);
                onTraineeClick?.(alert.trainee_id);
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${
                    alert.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                    alert.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {getAlertIcon(alert.alert_type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-white">{alert.trainee_name}</h4>
                      {!alert.is_seen && (
                        <span className="h-2 w-2 rounded-full bg-red-500"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{alert.message}</p>
                    {alert.weight_value && (
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>משקל: {alert.weight_value.toFixed(1)} ק״ג</span>
                        {alert.previous_weight && (
                          <span>
                            קודם: {alert.previous_weight.toFixed(1)} ק״ג
                            ({alert.weight_value > alert.previous_weight ? '+' : ''}
                            {(alert.weight_value - alert.previous_weight).toFixed(1)} ק״ג)
                          </span>
                        )}
                        {alert.days_since_last && (
                          <span>{alert.days_since_last} ימים</span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(alert.created_at).toLocaleDateString('he-IL', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteAlert(alert.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/15 rounded-lg transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 max-w-md mx-4 shadow-2xl border border-white/10 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">הגדרות התראות</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={alertSettings.enableSignificantChange}
                    onChange={(e) => setAlertSettings(prev => ({ ...prev, enableSignificantChange: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-emerald-500"
                  />
                  <span className="text-sm font-semibold text-gray-300">התראה על שינוי משמעותי</span>
                </label>
                {alertSettings.enableSignificantChange && (
                  <input
                    type="number"
                    step="0.1"
                    value={alertSettings.significantChangeThreshold}
                    onChange={(e) => setAlertSettings(prev => ({ ...prev, significantChangeThreshold: parseFloat(e.target.value) }))}
                    className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-800/80 border border-white/10 text-white"
                    placeholder="סף שינוי (ק״ג)"
                  />
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={alertSettings.enableNoWeighIn}
                    onChange={(e) => setAlertSettings(prev => ({ ...prev, enableNoWeighIn: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-emerald-500"
                  />
                  <span className="text-sm font-semibold text-gray-300">התראה על חוסר שקילות</span>
                </label>
                {alertSettings.enableNoWeighIn && (
                  <input
                    type="number"
                    value={alertSettings.noWeighInDays}
                    onChange={(e) => setAlertSettings(prev => ({ ...prev, noWeighInDays: parseInt(e.target.value) }))}
                    className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-800/80 border border-white/10 text-white"
                    placeholder="מספר ימים"
                  />
                )}
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={alertSettings.enableGoalReached}
                    onChange={(e) => setAlertSettings(prev => ({ ...prev, enableGoalReached: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-emerald-500"
                  />
                  <span className="text-sm font-semibold text-gray-300">התראה על הגעה ליעד</span>
                </label>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-3 rounded-xl font-semibold bg-gray-700/50 hover:bg-gray-700 text-gray-300 transition-all"
              >
                ביטול
              </button>
              <button
                onClick={saveSettings}
                className="flex-1 px-4 py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg transition-all hover:scale-[1.02]"
              >
                שמור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
