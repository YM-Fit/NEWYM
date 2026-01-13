import { useState, useEffect } from 'react';
import { Users, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import { analyticsApi, AdherenceMetrics } from '../../../api/analyticsApi';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { Card } from '../../ui/Card';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';

export default function AdherenceMetricsComponent() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<AdherenceMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [inactiveThreshold, setInactiveThreshold] = useState(7);

  useEffect(() => {
    if (user) {
      loadMetrics();
    }
  }, [user]);

  const loadMetrics = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await analyticsApi.getTraineeAdherence(user.id);
      setMetrics(data);
    } catch (error) {
      logger.error('Error loading adherence metrics', error, 'AdherenceMetrics');
      toast.error('שגיאה בטעינת מדדי adherence');
    } finally {
      setLoading(false);
    }
  };

  const inactiveTrainees = metrics.filter(
    (m) => m.days_since_last_workout !== null && m.days_since_last_workout >= inactiveThreshold
  );

  const getAdherenceColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-emerald-400';
    if (percentage >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const getAdherenceBgColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-emerald-500/10 border-emerald-500/30';
    if (percentage >= 50) return 'bg-amber-500/10 border-amber-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            מדדי Adherence
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            מעקב אחר התמדה והשתתפות של מתאמנים
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">מתאמנים רדומים (ימים):</label>
          <select
            value={inactiveThreshold}
            onChange={(e) => setInactiveThreshold(parseInt(e.target.value))}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm"
          >
            <option value="3">3+</option>
            <option value="7">7+</option>
            <option value="14">14+</option>
            <option value="30">30+</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">סה״כ מתאמנים</span>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics.length}</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Adherence ממוצע</span>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {metrics.length > 0
              ? Math.round(
                  metrics.reduce((sum, m) => sum + m.adherence_percentage, 0) / metrics.length
                )
              : 0}
            %
          </p>
        </Card>

        <Card className="p-5 border-red-500/30 bg-red-500/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">מתאמנים רדומים</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">{inactiveTrainees.length}</p>
        </Card>
      </div>

      {/* Inactive Trainees Alert */}
      {inactiveTrainees.length > 0 && (
        <Card className="p-5 border-red-500/30 bg-red-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-2">מתאמנים שדורשים תשומת לב</h3>
              <div className="space-y-2">
                {inactiveTrainees.slice(0, 5).map((trainee) => (
                  <div
                    key={trainee.trainee_id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-300">{trainee.trainee_name}</span>
                    <span className="text-red-400">
                      {trainee.days_since_last_workout} ימים ללא אימון
                    </span>
                  </div>
                ))}
                {inactiveTrainees.length > 5 && (
                  <p className="text-xs text-gray-400 mt-2">
                    ועוד {inactiveTrainees.length - 5} מתאמנים...
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Trainees List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-white">פירוט לפי מתאמן</h3>
        {metrics.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-400">אין נתונים להצגה</p>
          </Card>
        ) : (
          metrics.map((trainee) => (
            <Card
              key={trainee.trainee_id}
              className={`p-5 border ${getAdherenceBgColor(trainee.adherence_percentage)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-white">{trainee.trainee_name}</h4>
                    <span
                      className={`text-xs px-2 py-1 rounded-lg font-semibold ${getAdherenceColor(
                        trainee.adherence_percentage
                      )} bg-opacity-10`}
                    >
                      {trainee.adherence_percentage}% Adherence
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">אימונים השבוע:</span>
                      <p className="text-white font-semibold">
                        {trainee.workouts_completed} / {trainee.workouts_planned}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">רצף ימים:</span>
                      <p className="text-white font-semibold">{trainee.streak_days}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">אימון אחרון:</span>
                      <p className="text-white font-semibold">
                        {trainee.last_workout_date
                          ? new Date(trainee.last_workout_date).toLocaleDateString('he-IL')
                          : 'לא היה'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">ימים מאז:</span>
                      <p className={`font-semibold ${
                        trainee.days_since_last_workout !== null && trainee.days_since_last_workout >= 7
                          ? 'text-red-400'
                          : 'text-white'
                      }`}>
                        {trainee.days_since_last_workout !== null
                          ? `${trainee.days_since_last_workout} ימים`
                          : 'לא היה'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
