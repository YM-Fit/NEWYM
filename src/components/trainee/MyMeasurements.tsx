import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Scale,
  Droplets,
  Activity,
  Calendar,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  TrendingDown,
  TrendingUp,
  Minus,
  Ruler,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import { LoadingSpinner, Skeleton } from '../ui';
import { EmptyState } from '../common/EmptyState';

interface MyMeasurementsProps {
  traineeId: string | null;
  trainerId?: string;
  traineeName?: string;
}

interface Measurement {
  id: string;
  trainee_id: string;
  measurement_date: string;
  weight: number | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  water_percentage: number | null;
  bmi: number | null;
  metabolic_age: number | null;
  chest_back: number | null;
  belly: number | null;
  glutes: number | null;
  thigh: number | null;
  right_arm: number | null;
  left_arm: number | null;
  notes: string | null;
}

interface SelfWeight {
  id: string;
  trainee_id: string;
  weight_kg: number;
  weight_date: string;
  notes: string | null;
  created_at: string;
}

type ChartPeriod = '1m' | '3m' | '1y';

export default function MyMeasurements({ traineeId, trainerId, traineeName }: MyMeasurementsProps) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [selfWeights, setSelfWeights] = useState<SelfWeight[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('3m');
  const [expandedMeasurement, setExpandedMeasurement] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWeight, setNewWeight] = useState({
    weight_kg: '',
    weight_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (traineeId) {
      loadData();
    }
  }, [traineeId]);

  const loadData = async () => {
    if (!traineeId) return;
    setLoading(true);

    const [measurementsRes, selfWeightsRes] = await Promise.all([
      supabase
        .from('measurements')
        .select('*')
        .eq('trainee_id', traineeId)
        .order('measurement_date', { ascending: false }),
      supabase
        .from('trainee_self_weights')
        .select('*')
        .eq('trainee_id', traineeId)
        .order('weight_date', { ascending: false }),
    ]);

    if (measurementsRes.data) setMeasurements(measurementsRes.data);
    if (selfWeightsRes.data) setSelfWeights(selfWeightsRes.data);
    setLoading(false);
  };

  const latestMeasurement = measurements[0];

  const getChartData = () => {
    const now = new Date();
    let startDate = new Date();

    switch (chartPeriod) {
      case '1m':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3m':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const filteredMeasurements = measurements
      .filter((m) => new Date(m.measurement_date) >= startDate && m.weight)
      .reverse();

    const filteredSelfWeights = selfWeights
      .filter((sw) => new Date(sw.weight_date) >= startDate)
      .reverse();

    const allDates = new Set([
      ...filteredMeasurements.map((m) => m.measurement_date),
      ...filteredSelfWeights.map((sw) => sw.weight_date),
    ]);

    const chartData = Array.from(allDates)
      .sort()
      .map((date) => {
        const measurement = filteredMeasurements.find((m) => m.measurement_date === date);
        const selfWeight = filteredSelfWeights.find((sw) => sw.weight_date === date);

        return {
          date,
          displayDate: new Date(date).toLocaleDateString('he-IL', {
            day: 'numeric',
            month: 'short',
          }),
          weight: measurement?.weight || selfWeight?.weight_kg || null,
          bodyFat: measurement?.body_fat_percentage || null,
          isSelfReported: !measurement && !!selfWeight,
        };
      });

    return chartData;
  };

  const handleAddWeight = async () => {
    if (!traineeId || !newWeight.weight_kg) {
      toast.error('נא להזין משקל');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('trainee_self_weights').insert({
      trainee_id: traineeId,
      weight_kg: parseFloat(newWeight.weight_kg),
      weight_date: newWeight.weight_date,
      notes: newWeight.notes || null,
    });

    if (error) {
      toast.error('שגיאה בשמירת המשקל');
      setSubmitting(false);
      return;
    }

    if (trainerId) {
      await supabase.from('trainer_notifications').insert({
        trainer_id: trainerId,
        trainee_id: traineeId,
        notification_type: 'self_weight',
        title: 'משקל חדש מהבית',
        message: `${traineeName} עדכן/ה משקל: ${newWeight.weight_kg} ק"ג`,
      });
    }

    toast.success('המשקל נשלח למאמן שלך!');
    setShowAddModal(false);
    setNewWeight({
      weight_kg: '',
      weight_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    loadData();
    setSubmitting(false);
  };

  const getWeightTrend = () => {
    if (measurements.length < 2) return null;
    const latest = measurements[0]?.weight;
    const previous = measurements[1]?.weight;
    if (!latest || !previous) return null;
    const diff = latest - previous;
    return { diff, direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same' };
  };

  const trend = getWeightTrend();

  const chartDataMemo = useMemo(() => getChartData(), [measurements, selfWeights, chartPeriod]);

  if (loading) {
    return (
      <div className="space-y-4 pb-4">
        <Skeleton variant="rounded" height={60} className="w-full" />
        <div className="premium-card-static p-4">
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={80} />
            ))}
          </div>
        </div>
        <div className="premium-card-static p-4">
          <Skeleton variant="rounded" height={300} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full btn-primary rounded-xl p-4 flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-transform"
      >
        <Scale className="w-6 h-6" />
        <span className="font-bold text-lg">עדכן משקל מהבית</span>
        <Plus className="w-5 h-5" />
      </button>

      {latestMeasurement ? (
        <>
          <div className="premium-card-static overflow-hidden">
            <div className="bg-[var(--color-bg-surface)] px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
              <h3 className="font-bold text-[var(--color-text-primary)]">המדידה האחרונה</h3>
              <span className="text-sm text-[var(--color-text-muted)]">
                {new Date(latestMeasurement.measurement_date).toLocaleDateString('he-IL')}
              </span>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  icon={Scale}
                  label="משקל"
                  value={latestMeasurement.weight}
                  unit="ק״ג"
                  trend={trend}
                  color="green"
                />
                <StatCard
                  icon={Activity}
                  label="אחוז שומן"
                  value={latestMeasurement.body_fat_percentage}
                  unit="%"
                  color="orange"
                />
                <StatCard
                  icon={Droplets}
                  label="אחוז מים"
                  value={latestMeasurement.water_percentage}
                  unit="%"
                  color="blue"
                />
                <StatCard
                  icon={Activity}
                  label="מסת שריר"
                  value={latestMeasurement.muscle_mass}
                  unit="ק״ג"
                  color="rose"
                />
                <StatCard
                  icon={Calendar}
                  label="גיל מטבולי"
                  value={latestMeasurement.metabolic_age}
                  unit=""
                  color="amber"
                />
                <StatCard
                  icon={Scale}
                  label="BMI"
                  value={latestMeasurement.bmi}
                  unit=""
                  color="cyan"
                />
              </div>
            </div>
          </div>

          {(latestMeasurement.chest_back ||
            latestMeasurement.belly ||
            latestMeasurement.glutes ||
            latestMeasurement.thigh ||
            latestMeasurement.right_arm ||
            latestMeasurement.left_arm) && (
            <div className="premium-card-static overflow-hidden">
              <div className="bg-[var(--color-bg-surface)] px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
                <Ruler className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-[var(--color-text-primary)]">היקפים</h3>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                {latestMeasurement.chest_back && (
                  <CircumferenceItem label="חזה/גב" value={latestMeasurement.chest_back} />
                )}
                {latestMeasurement.belly && (
                  <CircumferenceItem label="בטן" value={latestMeasurement.belly} />
                )}
                {latestMeasurement.glutes && (
                  <CircumferenceItem label="ישבן" value={latestMeasurement.glutes} />
                )}
                {latestMeasurement.thigh && (
                  <CircumferenceItem label="ירך" value={latestMeasurement.thigh} />
                )}
                {latestMeasurement.right_arm && (
                  <CircumferenceItem label="זרוע ימין" value={latestMeasurement.right_arm} />
                )}
                {latestMeasurement.left_arm && (
                  <CircumferenceItem label="זרוע שמאל" value={latestMeasurement.left_arm} />
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="premium-card-static p-8 text-center">
          <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <Scale className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="font-medium text-[var(--color-text-primary)] mb-2">אין מדידות עדיין</h3>
          <p className="text-sm text-[var(--color-text-muted)]">המאמן עדיין לא ביצע מדידות</p>
        </div>
      )}

      {(measurements.length > 0 || selfWeights.length > 0) && (
        <div className="premium-card-static overflow-hidden">
          <div className="bg-[var(--color-bg-surface)] px-4 py-3 border-b border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[var(--color-text-primary)]">גרף התקדמות</h3>
              <div className="flex gap-1">
                {(['1m', '3m', '1y'] as ChartPeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => setChartPeriod(period)}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                      chartPeriod === period
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] border border-[var(--color-border)]'
                    }`}
                  >
                    {period === '1m' ? 'חודש' : period === '3m' ? '3 חודשים' : 'שנה'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="h-64" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartDataMemo} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="displayDate" tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                  <YAxis yAxisId="weight" orientation="left" tick={{ fontSize: 11, fill: '#a1a1aa' }} domain={['auto', 'auto']} />
                  <YAxis yAxisId="fat" orientation="right" tick={{ fontSize: 11, fill: '#a1a1aa' }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      direction: 'rtl',
                      textAlign: 'right',
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '12px'
                    }}
                    formatter={(value: number, name: string) => [
                      value?.toFixed(1),
                      name === 'weight' ? 'משקל (ק"ג)' : 'אחוז שומן (%)',
                    ]}
                  />
                  <Legend
                    formatter={(value) => (value === 'weight' ? 'משקל' : 'אחוז שומן')}
                  />
                  <Line
                    yAxisId="weight"
                    type="monotone"
                    dataKey="weight"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4, stroke: '#18181b' }}
                    connectNulls
                  />
                  <Line
                    yAxisId="fat"
                    type="monotone"
                    dataKey="bodyFat"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ fill: '#f97316', strokeWidth: 2, r: 4, stroke: '#18181b' }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                משקל
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                אחוז שומן
              </span>
            </div>
          </div>
        </div>
      )}

      {measurements.length > 0 && (
        <div className="premium-card-static overflow-hidden">
          <div className="bg-[var(--color-bg-surface)] px-4 py-3 border-b border-[var(--color-border)]">
            <h3 className="font-bold text-[var(--color-text-primary)]">היסטוריית מדידות</h3>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {measurements.map((m) => (
              <div key={m.id} className="p-4">
                <button
                  onClick={() =>
                    setExpandedMeasurement(expandedMeasurement === m.id ? null : m.id)
                  }
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-[var(--color-text-muted)]">
                      {new Date(m.measurement_date).toLocaleDateString('he-IL')}
                    </span>
                    <span className="font-medium text-[var(--color-text-primary)]">{m.weight} ק״ג</span>
                    {m.body_fat_percentage && (
                      <span className="text-sm text-[var(--color-text-muted)]">
                        {m.body_fat_percentage}% שומן
                      </span>
                    )}
                  </div>
                  {expandedMeasurement === m.id ? (
                    <ChevronUp className="w-5 h-5 text-[var(--color-text-muted)]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[var(--color-text-muted)]" />
                  )}
                </button>

                {expandedMeasurement === m.id && (
                  <div className="mt-4 pt-4 border-t border-[var(--color-border)] grid grid-cols-2 gap-3 text-sm">
                    {m.weight && (
                      <div>
                        <span className="text-[var(--color-text-muted)]">משקל:</span>{' '}
                        <span className="font-medium text-[var(--color-text-primary)]">{m.weight} ק״ג</span>
                      </div>
                    )}
                    {m.body_fat_percentage && (
                      <div>
                        <span className="text-[var(--color-text-muted)]">אחוז שומן:</span>{' '}
                        <span className="font-medium text-[var(--color-text-primary)]">{m.body_fat_percentage}%</span>
                      </div>
                    )}
                    {m.water_percentage && (
                      <div>
                        <span className="text-[var(--color-text-muted)]">אחוז מים:</span>{' '}
                        <span className="font-medium text-[var(--color-text-primary)]">{m.water_percentage}%</span>
                      </div>
                    )}
                    {m.muscle_mass && (
                      <div>
                        <span className="text-[var(--color-text-muted)]">מסת שריר:</span>{' '}
                        <span className="font-medium text-[var(--color-text-primary)]">{m.muscle_mass} ק״ג</span>
                      </div>
                    )}
                    {m.bmi && (
                      <div>
                        <span className="text-[var(--color-text-muted)]">BMI:</span>{' '}
                        <span className="font-medium text-[var(--color-text-primary)]">{m.bmi}</span>
                      </div>
                    )}
                    {m.metabolic_age && (
                      <div>
                        <span className="text-[var(--color-text-muted)]">גיל מטבולי:</span>{' '}
                        <span className="font-medium text-[var(--color-text-primary)]">{m.metabolic_age}</span>
                      </div>
                    )}
                    {m.chest_back && (
                      <div>
                        <span className="text-[var(--color-text-muted)]">חזה/גב:</span>{' '}
                        <span className="font-medium text-[var(--color-text-primary)]">{m.chest_back} ס״מ</span>
                      </div>
                    )}
                    {m.belly && (
                      <div>
                        <span className="text-[var(--color-text-muted)]">בטן:</span>{' '}
                        <span className="font-medium text-[var(--color-text-primary)]">{m.belly} ס״מ</span>
                      </div>
                    )}
                    {m.glutes && (
                      <div>
                        <span className="text-[var(--color-text-muted)]">ישבן:</span>{' '}
                        <span className="font-medium text-[var(--color-text-primary)]">{m.glutes} ס״מ</span>
                      </div>
                    )}
                    {m.thigh && (
                      <div>
                        <span className="text-[var(--color-text-muted)]">ירך:</span>{' '}
                        <span className="font-medium text-[var(--color-text-primary)]">{m.thigh} ס״מ</span>
                      </div>
                    )}
                    {m.right_arm && (
                      <div>
                        <span className="text-[var(--color-text-muted)]">זרוע ימין:</span>{' '}
                        <span className="font-medium text-[var(--color-text-primary)]">{m.right_arm} ס״מ</span>
                      </div>
                    )}
                    {m.left_arm && (
                      <div>
                        <span className="text-[var(--color-text-muted)]">זרוע שמאל:</span>{' '}
                        <span className="font-medium text-[var(--color-text-primary)]">{m.left_arm} ס״מ</span>
                      </div>
                    )}
                    {m.notes && (
                      <div className="col-span-2">
                        <span className="text-[var(--color-text-muted)]">הערות:</span>{' '}
                        <span className="font-medium text-[var(--color-text-primary)]">{m.notes}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {selfWeights.length > 0 && (
        <div className="premium-card-static overflow-hidden">
          <div className="bg-[var(--color-bg-surface)] px-4 py-3 border-b border-[var(--color-border)]">
            <h3 className="font-bold text-[var(--color-text-primary)]">שקילות עצמיות</h3>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {selfWeights.map((sw) => (
              <div key={sw.id} className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {new Date(sw.weight_date).toLocaleDateString('he-IL')}
                  </span>
                  <span className="font-medium text-[var(--color-text-primary)] mr-3">{sw.weight_kg} ק״ג</span>
                </div>
                {sw.notes && <span className="text-xs text-[var(--color-text-muted)]">{sw.notes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="premium-card-static w-full max-w-md animate-slide-up">
            <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">עדכון משקל מהבית</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-[var(--color-bg-surface)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[var(--color-text-muted)]" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  משקל (ק״ג) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newWeight.weight_kg}
                  onChange={(e) => setNewWeight({ ...newWeight, weight_kg: e.target.value })}
                  placeholder="לדוגמה: 72.5"
                  className="glass-input w-full p-3 text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">תאריך</label>
                <input
                  type="date"
                  value={newWeight.weight_date}
                  onChange={(e) => setNewWeight({ ...newWeight, weight_date: e.target.value })}
                  className="glass-input w-full p-3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  הערות (אופציונלי)
                </label>
                <textarea
                  value={newWeight.notes}
                  onChange={(e) => setNewWeight({ ...newWeight, notes: e.target.value })}
                  rows={2}
                  placeholder="לדוגמה: אחרי ארוחת בוקר..."
                  className="glass-input w-full p-3 resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[var(--color-border)] flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 btn-secondary rounded-lg font-medium"
              >
                ביטול
              </button>
              <button
                onClick={handleAddWeight}
                disabled={submitting}
                className="flex-1 py-3 btn-primary rounded-lg font-medium disabled:opacity-50"
              >
                {submitting ? 'שומר...' : 'שלח למאמן'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | null;
  unit: string;
  color: string;
  trend?: { diff: number; direction: 'up' | 'down' | 'same' } | null;
}

function StatCard({ icon: Icon, label, value, unit, color, trend }: StatCardProps) {
  const colorClasses: Record<string, { bg: string; text: string; icon: string }> = {
    green: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', icon: 'text-emerald-400' },
    orange: { bg: 'bg-orange-500/15', text: 'text-orange-400', icon: 'text-orange-400' },
    blue: { bg: 'bg-blue-500/15', text: 'text-blue-400', icon: 'text-blue-400' },
    rose: { bg: 'bg-rose-500/15', text: 'text-rose-400', icon: 'text-rose-400' },
    amber: { bg: 'bg-amber-500/15', text: 'text-amber-400', icon: 'text-amber-400' },
    cyan: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', icon: 'text-cyan-400' },
  };

  const colors = colorClasses[color] || colorClasses.green;

  if (value === null || value === undefined) return null;

  return (
    <div className={`${colors.bg} rounded-lg p-3 border border-${color}-500/30`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${colors.icon}`} />
        <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-bold ${colors.text}`}>{value}</span>
        {unit && <span className="text-xs text-[var(--color-text-muted)]">{unit}</span>}
        {trend && (
          <span
            className={`text-xs mr-1 flex items-center ${
              trend.direction === 'down'
                ? 'text-emerald-400'
                : trend.direction === 'up'
                ? 'text-red-400'
                : 'text-[var(--color-text-muted)]'
            }`}
          >
            {trend.direction === 'down' ? (
              <TrendingDown className="w-3 h-3" />
            ) : trend.direction === 'up' ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            {Math.abs(trend.diff).toFixed(1)}
          </span>
        )}
      </div>
    </div>
  );
}

interface CircumferenceItemProps {
  label: string;
  value: number;
}

function CircumferenceItem({ label, value }: CircumferenceItemProps) {
  return (
    <div className="flex items-center justify-between bg-[var(--color-bg-surface)] rounded-lg p-3 border border-[var(--color-border)]">
      <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
      <span className="font-medium text-[var(--color-text-primary)]">
        {value} <span className="text-xs text-[var(--color-text-muted)]">ס״מ</span>
      </span>
    </div>
  );
}
