import { Plus, TrendingDown, TrendingUp, Scale, BarChart3, Trash2, Edit, User, Activity, ArrowRight, Sparkles, List, Table2, Calculator, Target, TrendingDown as TrendingDownIcon, Minus } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { Trainee, BodyMeasurement } from '../../../types';
import MeasurementsChart from './MeasurementsChart';
import { supabase } from '../../../lib/supabase';

interface MeasurementsViewProps {
  trainee: Trainee;
  measurements: BodyMeasurement[];
  onNewMeasurement: () => void;
  onEditMeasurement?: (measurement: BodyMeasurement) => void;
  onMeasurementDeleted?: () => void;
  onBack?: () => void;
}

export default function MeasurementsView({ trainee, measurements, onNewMeasurement, onEditMeasurement, onMeasurementDeleted, onBack }: MeasurementsViewProps) {
  const [selectedMetric, setSelectedMetric] = useState<'weight' | 'bodyFat' | 'muscleMass' | 'waterPercentage' | 'metabolicAge'>('weight');
  const [selectedMember, setSelectedMember] = useState<'member_1' | 'member_2' | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');

  const filteredMeasurements = useMemo(() => {
    if (!trainee.isPair) {
      return measurements;
    }

    if (selectedMember === 'all') {
      // הצג את כל המדידות של שני בני הזוג ביחד
      return measurements.filter(m => m.pairMember === 'member_1' || m.pairMember === 'member_2');
    }

    return measurements.filter(m => m.pairMember === selectedMember);
  }, [measurements, trainee.isPair, selectedMember]);

  const handleDeleteMeasurement = async (measurementId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק מדידה זו?')) {
      return;
    }

    const { error } = await supabase
      .from('measurements')
      .delete()
      .eq('id', measurementId);

    if (!error) {
      onMeasurementDeleted?.();
    } else {
      alert('שגיאה במחיקת המדידה');
    }
  };

  const latestMeasurement = filteredMeasurements[0];
  const previousMeasurement = filteredMeasurements[1];

  const getChange = (current?: number, previous?: number) => {
    if (!current || !previous) return null;
    return current - previous;
  };

  const getChangePercentage = (current?: number, previous?: number) => {
    if (!current || !previous) return null;
    return ((current - previous) / previous) * 100;
  };

  const metrics = [
    { key: 'weight' as const, label: 'משקל', unit: 'ק״ג', icon: Scale, color: 'emerald' },
    { key: 'bodyFat' as const, label: 'אחוז שומן', unit: '%', icon: TrendingDown, color: 'amber' },
    { key: 'muscleMass' as const, label: 'מסת שריר', unit: 'ק״ג', icon: TrendingUp, color: 'cyan' },
    { key: 'waterPercentage' as const, label: 'אחוז מים', unit: '%', icon: BarChart3, color: 'blue' },
    { key: 'metabolicAge' as const, label: 'גיל מטבולי', unit: 'שנים', icon: Activity, color: 'red' },
  ];

  const colorConfig = {
    emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    amber: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
    cyan: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' },
    blue: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
    red: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  };


  const getChangeIndicator = (current: number, previous: number | undefined, isReversed: boolean = false) => {
    if (!previous) return null;
    const change = current - previous;
    if (change === 0) return null;
    const isPositive = isReversed ? change < 0 : change > 0;
    return (
      <span className={`text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {change > 0 ? '+' : ''}{change.toFixed(1)}
      </span>
    );
  };

  // Advanced statistics
  const statistics = useMemo(() => {
    if (filteredMeasurements.length === 0) return null;

    const weights = filteredMeasurements.map(m => m.weight).filter(w => w !== undefined) as number[];
    const bodyFats = filteredMeasurements.map(m => m.bodyFat).filter(bf => bf !== undefined) as number[];
    const muscleMasses = filteredMeasurements.map(m => m.muscleMass).filter(mm => mm !== undefined) as number[];

    const calculateStats = (values: number[]) => {
      if (values.length === 0) return null;
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      const min = Math.min(...values);
      const max = Math.max(...values);
      return { avg, stdDev, min, max };
    };

    return {
      weight: calculateStats(weights),
      bodyFat: calculateStats(bodyFats),
      muscleMass: calculateStats(muscleMasses)
    };
  }, [filteredMeasurements]);

  // Calculate trend
  const trend = useMemo(() => {
    if (filteredMeasurements.length < 2) return null;
    const first = filteredMeasurements[filteredMeasurements.length - 1];
    const last = filteredMeasurements[0];
    if (!first.weight || !last.weight) return null;
    
    const change = last.weight - first.weight;
    const days = (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24);
    const changePerWeek = (change / days) * 7;
    
    let trendType: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(change) > 0.5) {
      trendType = change > 0 ? 'up' : 'down';
    }

    return {
      type: trendType,
      totalChange: change,
      changePerWeek,
      days
    };
  }, [filteredMeasurements]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="premium-card-static p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-3 rounded-xl bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-all"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">מדידות</span>
              </div>
              <h1 className="text-2xl font-bold text-white">{trainee.name}</h1>
              <p className="text-zinc-500">מעקב אחר התקדמות ושינויים בהרכב הגוף</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNewMeasurement}
              className="btn-primary px-6 py-3 rounded-xl flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              <span>מדידה חדשה</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Summary */}
      {statistics && (
        <div className="premium-card-static p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="h-5 w-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">סטטיסטיקות</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statistics.weight && (
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
                <p className="text-sm text-gray-400 mb-3">משקל</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">ממוצע:</span>
                    <span className="font-semibold text-white">{statistics.weight.avg.toFixed(1)} ק״ג</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">מינימום:</span>
                    <span className="font-semibold text-white">{statistics.weight.min.toFixed(1)} ק״ג</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">מקסימום:</span>
                    <span className="font-semibold text-white">{statistics.weight.max.toFixed(1)} ק״ג</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">סטיית תקן:</span>
                    <span className="font-semibold text-white">{statistics.weight.stdDev.toFixed(2)} ק״ג</span>
                  </div>
                </div>
              </div>
            )}
            {statistics.bodyFat && (
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
                <p className="text-sm text-gray-400 mb-3">אחוז שומן</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">ממוצע:</span>
                    <span className="font-semibold text-white">{statistics.bodyFat.avg.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">מינימום:</span>
                    <span className="font-semibold text-white">{statistics.bodyFat.min.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">מקסימום:</span>
                    <span className="font-semibold text-white">{statistics.bodyFat.max.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">סטיית תקן:</span>
                    <span className="font-semibold text-white">{statistics.bodyFat.stdDev.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            )}
            {statistics.muscleMass && (
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
                <p className="text-sm text-gray-400 mb-3">מסת שריר</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">ממוצע:</span>
                    <span className="font-semibold text-white">{statistics.muscleMass.avg.toFixed(1)} ק״ג</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">מינימום:</span>
                    <span className="font-semibold text-white">{statistics.muscleMass.min.toFixed(1)} ק״ג</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">מקסימום:</span>
                    <span className="font-semibold text-white">{statistics.muscleMass.max.toFixed(1)} ק״ג</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">סטיית תקן:</span>
                    <span className="font-semibold text-white">{statistics.muscleMass.stdDev.toFixed(2)} ק״ג</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          {trend && (
            <div className="mt-4 pt-4 border-t border-gray-700/50">
              <div className="flex items-center gap-3">
                {trend.type === 'up' ? (
                  <TrendingUp className="h-5 w-5 text-red-400" />
                ) : trend.type === 'down' ? (
                  <TrendingDown className="h-5 w-5 text-emerald-400" />
                ) : (
                  <Minus className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <p className="text-sm text-gray-400">מגמה כוללת</p>
                  <p className="font-semibold text-white">
                    {trend.type === 'up' ? 'עלייה' : trend.type === 'down' ? 'ירידה' : 'יציב'} -{' '}
                    {trend.totalChange > 0 ? '+' : ''}{trend.totalChange.toFixed(1)} ק״ג
                    {' '}({trend.changePerWeek > 0 ? '+' : ''}{trend.changePerWeek.toFixed(2)} ק״ג לשבוע)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {trainee.isPair && (
        <div className="premium-card-static p-5">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">הצג מדידות עבור:</h3>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setSelectedMember('all')}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedMember === 'all'
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600/50'
              }`}
            >
              <User className={`h-6 w-6 mx-auto mb-2 ${
                selectedMember === 'all' ? 'text-emerald-400' : 'text-zinc-500'
              }`} />
              <p className={`text-sm font-semibold text-center ${
                selectedMember === 'all' ? 'text-emerald-400' : 'text-zinc-400'
              }`}>{trainee.pairName1} + {trainee.pairName2}</p>
            </button>
            <button
              onClick={() => setSelectedMember('member_1')}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedMember === 'member_1'
                  ? 'border-cyan-500/50 bg-cyan-500/10'
                  : 'border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600/50'
              }`}
            >
              <User className={`h-6 w-6 mx-auto mb-2 ${
                selectedMember === 'member_1' ? 'text-cyan-400' : 'text-zinc-500'
              }`} />
              <p className={`text-sm font-semibold text-center ${
                selectedMember === 'member_1' ? 'text-cyan-400' : 'text-zinc-400'
              }`}>{trainee.pairName1}</p>
            </button>
            <button
              onClick={() => setSelectedMember('member_2')}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedMember === 'member_2'
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : 'border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600/50'
              }`}
            >
              <User className={`h-6 w-6 mx-auto mb-2 ${
                selectedMember === 'member_2' ? 'text-amber-400' : 'text-zinc-500'
              }`} />
              <p className={`text-sm font-semibold text-center ${
                selectedMember === 'member_2' ? 'text-amber-400' : 'text-zinc-400'
              }`}>{trainee.pairName2}</p>
            </button>
          </div>
        </div>
      )}

      {latestMeasurement && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {metrics.map(({ key, label, unit, icon: Icon, color }) => {
            const current = latestMeasurement[key];
            const previous = previousMeasurement?.[key];
            const change = getChange(current, previous);
            const changePercentage = getChangePercentage(current, previous);
            const colors = colorConfig[color];

            return (
              <div key={key} className="premium-card-static p-5 group hover:border-zinc-600/50 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${colors.bg} ${colors.border} border`}>
                    <Icon className={`h-5 w-5 ${colors.text}`} />
                  </div>
                </div>
                <p className="text-sm text-zinc-500 mb-1">{label}</p>
                <p className="text-2xl font-bold text-white">
                  {current ? `${current.toFixed(1)}` : '-'}
                  <span className="text-sm font-normal text-zinc-500 mr-1">{current ? unit : ''}</span>
                </p>
                {change && (
                  <div className={`flex items-center mt-2 text-xs ${
                    (['bodyFat', 'metabolicAge'].includes(key) ? change < 0 : change > 0) ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {(['bodyFat', 'metabolicAge'].includes(key) ? change < 0 : change > 0) ? (
                      <TrendingUp className="h-3 w-3 ml-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 ml-1" />
                    )}
                    {change > 0 ? '+' : ''}{change.toFixed(1)} {unit}
                    {changePercentage && key !== 'metabolicAge' && (
                      <span className="mr-1 text-zinc-500">
                        ({changePercentage > 0 ? '+' : ''}{changePercentage.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="premium-card-static overflow-hidden">
        <div className="p-5 border-b border-zinc-800/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="text-lg font-semibold text-white">גרף התקדמות</h3>
            <div className="flex flex-wrap gap-2">
              {metrics.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSelectedMetric(key)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedMetric === key
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-white hover:border-zinc-600/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-5">
          <MeasurementsChart 
            measurements={filteredMeasurements} 
            metric={selectedMetric}
            trainee={trainee}
          />
        </div>
      </div>

      <div className="premium-card-static overflow-hidden">
        <div className="p-5 border-b border-zinc-800/50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">היסטוריית מדידות</h3>
            <div className="flex gap-1 bg-zinc-800/50 p-1 rounded-xl border border-zinc-700/50">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list' ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-400 hover:text-white'
                }`}
                title="תצוגת רשימה"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'table' ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-400 hover:text-white'
                }`}
                title="תצוגת טבלה"
              >
                <Table2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="p-5">
          {filteredMeasurements.length > 0 ? (
            viewMode === 'list' ? (
              <div className="space-y-3">
                {filteredMeasurements.map((measurement) => (
                  <div key={measurement.id} className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-4 hover:border-zinc-600/50 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                          <Scale className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white flex items-center gap-2">
                            {new Date(measurement.date).toLocaleDateString('he-IL')}
                            {trainee.isPair && measurement.pairMember && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                measurement.pairMember === 'member_1'
                                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              }`}>
                                {measurement.pairMember === 'member_1' ? trainee.pairName1 : trainee.pairName2}
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-zinc-500">
                            {measurement.source === 'tanita' ? 'Tanita' : 'מדידה ידנית'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {onEditMeasurement && (
                          <button
                            onClick={() => onEditMeasurement(measurement)}
                            className="p-2 text-cyan-400 hover:bg-cyan-500/15 rounded-lg transition-all"
                            title="ערוך מדידה"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteMeasurement(measurement.id)}
                          className="p-2 text-red-400 hover:bg-red-500/15 rounded-lg transition-all"
                          title="מחק מדידה"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-zinc-500">משקל:</span>
                        <span className="font-medium text-white mr-2">{measurement.weight} ק״ג</span>
                      </div>
                      {measurement.bodyFat && (
                        <div>
                          <span className="text-zinc-500">אחוז שומן:</span>
                          <span className="font-medium text-white mr-2">{measurement.bodyFat.toFixed(1)}%</span>
                        </div>
                      )}
                      {measurement.muscleMass && (
                        <div>
                          <span className="text-zinc-500">מסת שריר:</span>
                          <span className="font-medium text-white mr-2">{measurement.muscleMass.toFixed(1)} ק״ג</span>
                        </div>
                      )}
                      <div>
                        <span className="text-zinc-500">BMI:</span>
                        <span className="font-medium text-white mr-2">{measurement.bmi}</span>
                      </div>
                    </div>

                    {measurement.measurements && (measurement.measurements.chestBack || measurement.measurements.belly || measurement.measurements.glutes || measurement.measurements.thigh || measurement.measurements.rightArm || measurement.measurements.leftArm) && (
                      <div className="mt-3 pt-3 border-t border-zinc-700/50">
                        <p className="text-sm text-zinc-500 mb-2">היקפים (ס״מ):</p>
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm text-zinc-300">
                          {measurement.measurements.chestBack > 0 && (
                            <span>חזה/גב: {measurement.measurements.chestBack}</span>
                          )}
                          {measurement.measurements.belly > 0 && (
                            <span>פופיק: {measurement.measurements.belly}</span>
                          )}
                          {measurement.measurements.glutes > 0 && (
                            <span>ישבן: {measurement.measurements.glutes}</span>
                          )}
                          {measurement.measurements.thigh > 0 && (
                            <span>ירך: {measurement.measurements.thigh}</span>
                          )}
                          {measurement.measurements.rightArm > 0 && (
                            <span>יד ימין: {measurement.measurements.rightArm}</span>
                          )}
                          {measurement.measurements.leftArm > 0 && (
                            <span>יד שמאל: {measurement.measurements.leftArm}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {measurement.notes && (
                      <div className="mt-3 pt-3 border-t border-zinc-700/50">
                        <p className="text-sm text-zinc-500 mb-1">הערות:</p>
                        <p className="text-sm text-zinc-300">{measurement.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-zinc-700/50">
                      <th className="text-right py-3 px-3 text-sm font-semibold text-zinc-400">תאריך</th>
                      <th className="text-center py-3 px-3 text-sm font-semibold text-zinc-400">משקל</th>
                      <th className="text-center py-3 px-3 text-sm font-semibold text-zinc-400">% שומן</th>
                      <th className="text-center py-3 px-3 text-sm font-semibold text-zinc-400">מסת שריר</th>
                      <th className="text-center py-3 px-3 text-sm font-semibold text-zinc-400">% מים</th>
                      <th className="text-center py-3 px-3 text-sm font-semibold text-zinc-400">BMI</th>
                      <th className="text-center py-3 px-3 text-sm font-semibold text-zinc-400">גיל מטבולי</th>
                      <th className="text-center py-3 px-3 text-sm font-semibold text-zinc-400">פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMeasurements.map((measurement, index) => {
                      const prevMeasurement = filteredMeasurements[index + 1];
                      return (
                        <tr key={measurement.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-all">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">
                                {new Date(measurement.date).toLocaleDateString('he-IL')}
                              </span>
                              {trainee.isPair && measurement.pairMember && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  measurement.pairMember === 'member_1'
                                    ? 'bg-cyan-500/15 text-cyan-400'
                                    : 'bg-amber-500/15 text-amber-400'
                                }`}>
                                  {measurement.pairMember === 'member_1' ? trainee.pairName1?.charAt(0) : trainee.pairName2?.charAt(0)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-semibold text-white">{measurement.weight}</span>
                              {prevMeasurement && getChangeIndicator(measurement.weight, prevMeasurement.weight, false)}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-semibold text-white">{measurement.bodyFat?.toFixed(1) || '-'}</span>
                              {measurement.bodyFat && prevMeasurement?.bodyFat && getChangeIndicator(measurement.bodyFat, prevMeasurement.bodyFat, true)}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-semibold text-white">{measurement.muscleMass?.toFixed(1) || '-'}</span>
                              {measurement.muscleMass && prevMeasurement?.muscleMass && getChangeIndicator(measurement.muscleMass, prevMeasurement.muscleMass, false)}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-semibold text-white">{measurement.waterPercentage?.toFixed(1) || '-'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-semibold text-white">{measurement.bmi || '-'}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-semibold text-white">{measurement.metabolicAge || '-'}</span>
                              {measurement.metabolicAge && prevMeasurement?.metabolicAge && getChangeIndicator(measurement.metabolicAge, prevMeasurement.metabolicAge, true)}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {onEditMeasurement && (
                                <button
                                  onClick={() => onEditMeasurement(measurement)}
                                  className="p-1.5 text-cyan-400 hover:bg-cyan-500/15 rounded-lg transition-all"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteMeasurement(measurement.id)}
                                className="p-1.5 text-red-400 hover:bg-red-500/15 rounded-lg transition-all"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
                <Scale className="h-8 w-8 text-zinc-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">אין מדידות עדיין</h3>
              <p className="text-zinc-500 mb-6">התחל במדידה הראשונה כדי לעקוב אחר ההתקדמות</p>
              <button
                onClick={onNewMeasurement}
                className="btn-primary px-6 py-3 rounded-xl font-medium"
              >
                מדידה ראשונה
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
