import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3, Calculator, Target, Loader2, Calendar } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/logger';

interface WeightDataPoint {
  date: string;
  weight: number;
  source: 'measurement' | 'self_weight';
}

interface TrendAnalysis {
  trend: 'up' | 'down' | 'stable';
  trendStrength: number; // 0-100
  averageChangePerWeek: number;
  averageChangePerMonth: number;
  projectedWeight30Days: number | null;
  projectedWeight90Days: number | null;
  volatility: number; // standard deviation
  minWeight: number;
  maxWeight: number;
  averageWeight: number;
}

interface WeightTrendAnalysisProps {
  traineeId: string;
  traineeName: string;
  period?: '1m' | '3m' | '6m' | '1y' | 'all';
}

export default function WeightTrendAnalysis({
  traineeId,
  traineeName,
  period = '3m'
}: WeightTrendAnalysisProps) {
  const [weightData, setWeightData] = useState<WeightDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'1m' | '3m' | '6m' | '1y' | 'all'>(period);

  useEffect(() => {
    loadWeightData();
  }, [traineeId, selectedPeriod]);

  const loadWeightData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      let startDate = new Date();

      switch (selectedPeriod) {
        case '1m':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case '3m':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case '6m':
          startDate.setMonth(now.getMonth() - 6);
          break;
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
          startDate = new Date(0);
          break;
      }

      // Load measurements
      const { data: measurements } = await supabase
        .from('measurements')
        .select('weight, measurement_date')
        .eq('trainee_id', traineeId)
        .gte('measurement_date', startDate.toISOString())
        .order('measurement_date', { ascending: true });

      // Load self weights
      const { data: selfWeights } = await supabase
        .from('trainee_self_weights')
        .select('weight_kg, weight_date')
        .eq('trainee_id', traineeId)
        .gte('weight_date', startDate.toISOString())
        .order('weight_date', { ascending: true });

      const allWeights: WeightDataPoint[] = [
        ...(measurements || []).map(m => ({
          date: m.measurement_date,
          weight: m.weight,
          source: 'measurement' as const
        })),
        ...(selfWeights || []).map(w => ({
          date: w.weight_date,
          weight: w.weight_kg,
          source: 'self_weight' as const
        }))
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setWeightData(allWeights);
    } catch (error) {
      logger.error('Error loading weight data', error, 'WeightTrendAnalysis');
    } finally {
      setLoading(false);
    }
  };

  const analysis = useMemo<TrendAnalysis | null>(() => {
    if (weightData.length < 2) return null;

    const weights = weightData.map(d => d.weight);
    const dates = weightData.map(d => new Date(d.date));

    // Calculate basic statistics
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const averageWeight = weights.reduce((a, b) => a + b, 0) / weights.length;

    // Calculate volatility (standard deviation)
    const variance = weights.reduce((acc, w) => acc + Math.pow(w - averageWeight, 2), 0) / weights.length;
    const volatility = Math.sqrt(variance);

    // Calculate trend
    const firstWeight = weights[0];
    const lastWeight = weights[weights.length - 1];
    const totalChange = lastWeight - firstWeight;
    const totalDays = (dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24);

    const averageChangePerWeek = (totalChange / totalDays) * 7;
    const averageChangePerMonth = (totalChange / totalDays) * 30;

    // Determine trend
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(totalChange) > volatility * 0.5) {
      trend = totalChange > 0 ? 'up' : 'down';
    }

    // Calculate trend strength (0-100)
    const trendStrength = Math.min(100, Math.abs(totalChange) / volatility * 50);

    // Project future weights
    const projectedWeight30Days = averageChangePerMonth !== 0
      ? lastWeight + averageChangePerMonth
      : null;
    const projectedWeight90Days = averageChangePerMonth !== 0
      ? lastWeight + (averageChangePerMonth * 3)
      : null;

    return {
      trend,
      trendStrength,
      averageChangePerWeek,
      averageChangePerMonth,
      projectedWeight30Days,
      projectedWeight90Days,
      volatility,
      minWeight,
      maxWeight,
      averageWeight
    };
  }, [weightData]);

  if (loading) {
    return (
      <div className="premium-card-static p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-teal-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (weightData.length < 2) {
    return (
      <div className="premium-card-static p-6">
        <div className="text-center py-12">
          <BarChart3 className="h-16 w-16 mx-auto text-muted600 mb-4" />
          <p className="text-theme-secondary font-medium">אין מספיק נתונים לניתוח</p>
          <p className="text-sm text-theme-muted mt-2">נדרשות לפחות 2 שקילות</p>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const getTrendIcon = () => {
    switch (analysis.trend) {
      case 'up':
        return <TrendingUp className="h-6 w-6 text-red-400" />;
      case 'down':
        return <TrendingDown className="h-6 w-6 text-emerald-400" />;
      default:
        return <Minus className="h-6 w-6 text-muted400" />;
    }
  };

  const getTrendColor = () => {
    switch (analysis.trend) {
      case 'up':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'down':
        return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
      default:
        return 'text-muted400 bg-surface500/20 border-border500/30';
    }
  };

  const getTrendLabel = () => {
    switch (analysis.trend) {
      case 'up':
        return 'עלייה';
      case 'down':
        return 'ירידה';
      default:
        return 'יציב';
    }
  };

  return (
    <div className="premium-card-static p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30">
            <BarChart3 className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-theme-primary">ניתוח מגמות</h3>
            <p className="text-sm text-theme-muted">{traineeName}</p>
          </div>
        </div>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value as any)}
          className="px-4 py-2 rounded-xl bg-surface800/50 border border-border700/50 text-foreground text-sm focus:ring-2 focus:ring-teal-500/50"
        >
          <option value="1m">חודש אחרון</option>
          <option value="3m">3 חודשים</option>
          <option value="6m">6 חודשים</option>
          <option value="1y">שנה</option>
          <option value="all">הכל</option>
        </select>
      </div>

      {/* Trend Summary */}
      <div className={`p-5 rounded-2xl border mb-6 ${getTrendColor()}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getTrendIcon()}
            <div>
              <h4 className="font-bold text-lg">מגמה: {getTrendLabel()}</h4>
              <p className="text-sm opacity-80">עוצמה: {analysis.trendStrength.toFixed(1)}%</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-80">שינוי כולל</p>
            <p className="text-2xl font-bold">
              {analysis.averageChangePerMonth > 0 ? '+' : ''}
              {analysis.averageChangePerMonth.toFixed(1)} ק״ג
            </p>
            <p className="text-xs opacity-60">לחודש</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-current/20">
          <div>
            <p className="text-sm opacity-80 mb-1">לשבוע</p>
            <p className="text-lg font-semibold">
              {analysis.averageChangePerWeek > 0 ? '+' : ''}
              {analysis.averageChangePerWeek.toFixed(2)} ק״ג
            </p>
          </div>
          <div>
            <p className="text-sm opacity-80 mb-1">תנודתיות</p>
            <p className="text-lg font-semibold">{analysis.volatility.toFixed(2)} ק״ג</p>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-surface800/50 border border-border700/50">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-cyan-400" />
            <p className="text-xs text-muted400">ממוצע</p>
          </div>
          <p className="text-xl font-bold text-foreground">{analysis.averageWeight.toFixed(1)} ק״ג</p>
        </div>

        <div className="p-4 rounded-xl bg-surface800/50 border border-border700/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <p className="text-xs text-muted400">מקסימום</p>
          </div>
          <p className="text-xl font-bold text-foreground">{analysis.maxWeight.toFixed(1)} ק״ג</p>
        </div>

        <div className="p-4 rounded-xl bg-surface800/50 border border-border700/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-red-400" />
            <p className="text-xs text-muted400">מינימום</p>
          </div>
          <p className="text-xl font-bold text-foreground">{analysis.minWeight.toFixed(1)} ק״ג</p>
        </div>

        <div className="p-4 rounded-xl bg-surface800/50 border border-border700/50">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="h-4 w-4 text-amber-400" />
            <p className="text-xs text-muted400">טווח</p>
          </div>
          <p className="text-xl font-bold text-foreground">
            {(analysis.maxWeight - analysis.minWeight).toFixed(1)} ק״ג
          </p>
        </div>
      </div>

      {/* Projections */}
      {(analysis.projectedWeight30Days || analysis.projectedWeight90Days) && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-blue-400" />
            <h4 className="font-bold text-foreground">תחזיות</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {analysis.projectedWeight30Days && (
              <div>
                <p className="text-sm text-muted400 mb-1">תוך 30 ימים</p>
                <p className="text-xl font-bold text-foreground">
                  {analysis.projectedWeight30Days.toFixed(1)} ק״ג
                </p>
              </div>
            )}
            {analysis.projectedWeight90Days && (
              <div>
                <p className="text-sm text-muted400 mb-1">תוך 90 ימים</p>
                <p className="text-xl font-bold text-foreground">
                  {analysis.projectedWeight90Days.toFixed(1)} ק״ג
                </p>
              </div>
            )}
          </div>
          <p className="text-xs text-muted500 mt-4">
            * התחזיות מבוססות על המגמה הנוכחית ואינן מהוות המלצה רפואית
          </p>
        </div>
      )}

      {/* Data Points Summary */}
      <div className="mt-6 pt-6 border-t border-border700/50">
        <div className="flex items-center justify-between text-sm text-muted400">
          <span>סה״כ נקודות נתונים: {weightData.length}</span>
          <span>
            {weightData.filter(d => d.source === 'measurement').length} מדידות,{' '}
            {weightData.filter(d => d.source === 'self_weight').length} שקילות מהבית
          </span>
        </div>
      </div>
    </div>
  );
}
