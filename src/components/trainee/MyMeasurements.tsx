import { useState, useEffect } from 'react';
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full bg-gradient-to-l from-green-600 to-green-500 text-white rounded-xl p-4 flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-transform"
      >
        <Scale className="w-6 h-6" />
        <span className="font-bold text-lg">עדכן משקל מהבית</span>
        <Plus className="w-5 h-5" />
      </button>

      {latestMeasurement ? (
        <>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-800">המדידה האחרונה</h3>
              <span className="text-sm text-gray-500">
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
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
                <Ruler className="w-5 h-5 text-gray-600" />
                <h3 className="font-bold text-gray-800">היקפים</h3>
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
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Scale className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-medium text-gray-700 mb-2">אין מדידות עדיין</h3>
          <p className="text-sm text-gray-500">המאמן עדיין לא ביצע מדידות</p>
        </div>
      )}

      {(measurements.length > 0 || selfWeights.length > 0) && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">גרף התקדמות</h3>
              <div className="flex gap-1">
                {(['1m', '3m', '1y'] as ChartPeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => setChartPeriod(period)}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                      chartPeriod === period
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                <LineChart data={getChartData()} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="displayDate" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="weight" orientation="left" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <YAxis yAxisId="fat" orientation="right" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ direction: 'rtl', textAlign: 'right' }}
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
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ fill: '#16a34a', strokeWidth: 2 }}
                    connectNulls
                  />
                  <Line
                    yAxisId="fat"
                    type="monotone"
                    dataKey="bodyFat"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ fill: '#f97316', strokeWidth: 2 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-600 rounded-full"></span>
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
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h3 className="font-bold text-gray-800">היסטוריית מדידות</h3>
          </div>
          <div className="divide-y">
            {measurements.map((m) => (
              <div key={m.id} className="p-4">
                <button
                  onClick={() =>
                    setExpandedMeasurement(expandedMeasurement === m.id ? null : m.id)
                  }
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {new Date(m.measurement_date).toLocaleDateString('he-IL')}
                    </span>
                    <span className="font-medium">{m.weight} ק״ג</span>
                    {m.body_fat_percentage && (
                      <span className="text-sm text-gray-500">
                        {m.body_fat_percentage}% שומן
                      </span>
                    )}
                  </div>
                  {expandedMeasurement === m.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {expandedMeasurement === m.id && (
                  <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3 text-sm">
                    {m.weight && (
                      <div>
                        <span className="text-gray-500">משקל:</span>{' '}
                        <span className="font-medium">{m.weight} ק״ג</span>
                      </div>
                    )}
                    {m.body_fat_percentage && (
                      <div>
                        <span className="text-gray-500">אחוז שומן:</span>{' '}
                        <span className="font-medium">{m.body_fat_percentage}%</span>
                      </div>
                    )}
                    {m.water_percentage && (
                      <div>
                        <span className="text-gray-500">אחוז מים:</span>{' '}
                        <span className="font-medium">{m.water_percentage}%</span>
                      </div>
                    )}
                    {m.muscle_mass && (
                      <div>
                        <span className="text-gray-500">מסת שריר:</span>{' '}
                        <span className="font-medium">{m.muscle_mass} ק״ג</span>
                      </div>
                    )}
                    {m.bmi && (
                      <div>
                        <span className="text-gray-500">BMI:</span>{' '}
                        <span className="font-medium">{m.bmi}</span>
                      </div>
                    )}
                    {m.metabolic_age && (
                      <div>
                        <span className="text-gray-500">גיל מטבולי:</span>{' '}
                        <span className="font-medium">{m.metabolic_age}</span>
                      </div>
                    )}
                    {m.chest_back && (
                      <div>
                        <span className="text-gray-500">חזה/גב:</span>{' '}
                        <span className="font-medium">{m.chest_back} ס״מ</span>
                      </div>
                    )}
                    {m.belly && (
                      <div>
                        <span className="text-gray-500">בטן:</span>{' '}
                        <span className="font-medium">{m.belly} ס״מ</span>
                      </div>
                    )}
                    {m.glutes && (
                      <div>
                        <span className="text-gray-500">ישבן:</span>{' '}
                        <span className="font-medium">{m.glutes} ס״מ</span>
                      </div>
                    )}
                    {m.thigh && (
                      <div>
                        <span className="text-gray-500">ירך:</span>{' '}
                        <span className="font-medium">{m.thigh} ס״מ</span>
                      </div>
                    )}
                    {m.right_arm && (
                      <div>
                        <span className="text-gray-500">זרוע ימין:</span>{' '}
                        <span className="font-medium">{m.right_arm} ס״מ</span>
                      </div>
                    )}
                    {m.left_arm && (
                      <div>
                        <span className="text-gray-500">זרוע שמאל:</span>{' '}
                        <span className="font-medium">{m.left_arm} ס״מ</span>
                      </div>
                    )}
                    {m.notes && (
                      <div className="col-span-2">
                        <span className="text-gray-500">הערות:</span>{' '}
                        <span className="font-medium">{m.notes}</span>
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
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h3 className="font-bold text-gray-800">שקילות עצמיות</h3>
          </div>
          <div className="divide-y">
            {selfWeights.map((sw) => (
              <div key={sw.id} className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-500">
                    {new Date(sw.weight_date).toLocaleDateString('he-IL')}
                  </span>
                  <span className="font-medium mr-3">{sw.weight_kg} ק״ג</span>
                </div>
                {sw.notes && <span className="text-xs text-gray-400">{sw.notes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">עדכון משקל מהבית</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  משקל (ק״ג) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newWeight.weight_kg}
                  onChange={(e) => setNewWeight({ ...newWeight, weight_kg: e.target.value })}
                  placeholder="לדוגמה: 72.5"
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">תאריך</label>
                <input
                  type="date"
                  value={newWeight.weight_date}
                  onChange={(e) => setNewWeight({ ...newWeight, weight_date: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  הערות (אופציונלי)
                </label>
                <textarea
                  value={newWeight.notes}
                  onChange={(e) => setNewWeight({ ...newWeight, notes: e.target.value })}
                  rows={2}
                  placeholder="לדוגמה: אחרי ארוחת בוקר..."
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleAddWeight}
                disabled={submitting}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
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
    green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-700', icon: 'text-rose-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-600' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', icon: 'text-cyan-600' },
  };

  const colors = colorClasses[color] || colorClasses.green;

  if (value === null || value === undefined) return null;

  return (
    <div className={`${colors.bg} rounded-lg p-3`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${colors.icon}`} />
        <span className="text-xs text-gray-600">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-bold ${colors.text}`}>{value}</span>
        {unit && <span className="text-xs text-gray-500">{unit}</span>}
        {trend && (
          <span
            className={`text-xs mr-1 flex items-center ${
              trend.direction === 'down'
                ? 'text-green-600'
                : trend.direction === 'up'
                ? 'text-red-500'
                : 'text-gray-400'
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
    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="font-medium">
        {value} <span className="text-xs text-gray-400">ס״מ</span>
      </span>
    </div>
  );
}
