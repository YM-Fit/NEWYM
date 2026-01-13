import { useState, useEffect } from 'react';
import { FileText, Calendar, Download, Loader2, TrendingUp, TrendingDown, Target, Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

interface WeightReport {
  trainee_id: string;
  trainee_name: string;
  period_start: string;
  period_end: string;
  start_weight: number;
  end_weight: number;
  change: number;
  change_percentage: number;
  average_weight: number;
  min_weight: number;
  max_weight: number;
  measurements_count: number;
  self_weights_count: number;
  trend: 'up' | 'down' | 'stable';
}

interface WeightReportsProps {
  trainerId: string;
  period?: 'week' | 'month' | 'quarter' | 'year';
}

export default function WeightReports({ trainerId, period = 'month' }: WeightReportsProps) {
  const [reports, setReports] = useState<WeightReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>(period);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    generateReports();
  }, [trainerId, selectedPeriod, selectedDate]);

  const generateReports = async () => {
    try {
      setLoading(true);
      
      const now = new Date(selectedDate);
      let startDate = new Date();
      let endDate = new Date(now);

      switch (selectedPeriod) {
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          break;
      }

      // Get all trainees
      const { data: trainees } = await supabase
        .from('trainees')
        .select('id, full_name')
        .eq('trainer_id', trainerId)
        .eq('status', 'active');

      if (!trainees || trainees.length === 0) {
        setReports([]);
        setLoading(false);
        return;
      }

      const reportPromises = trainees.map(async (trainee) => {
        // Get measurements in period
        const { data: measurements } = await supabase
          .from('measurements')
          .select('weight_kg, measurement_date')
          .eq('trainee_id', trainee.id)
          .gte('measurement_date', startDate.toISOString())
          .lte('measurement_date', endDate.toISOString())
          .order('measurement_date', { ascending: true });

        // Get self weights in period
        const { data: selfWeights } = await supabase
          .from('trainee_self_weights')
          .select('weight_kg, weight_date')
          .eq('trainee_id', trainee.id)
          .gte('weight_date', startDate.toISOString())
          .lte('weight_date', endDate.toISOString())
          .order('weight_date', { ascending: true });

        // Get weights before period for start weight
        const { data: beforeMeasurements } = await supabase
          .from('measurements')
          .select('weight_kg, measurement_date')
          .eq('trainee_id', trainee.id)
          .lt('measurement_date', startDate.toISOString())
          .order('measurement_date', { ascending: false })
          .limit(1);

        const { data: beforeSelfWeights } = await supabase
          .from('trainee_self_weights')
          .select('weight_kg, weight_date')
          .eq('trainee_id', trainee.id)
          .lt('weight_date', startDate.toISOString())
          .order('weight_date', { ascending: false })
          .limit(1);

        const allWeights = [
          ...(measurements || []).map(m => ({ weight: m.weight_kg, date: m.measurement_date })),
          ...(selfWeights || []).map(w => ({ weight: w.weight_kg, date: w.weight_date }))
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const beforeWeights = [
          ...(beforeMeasurements || []).map(m => ({ weight: m.weight_kg, date: m.measurement_date })),
          ...(beforeSelfWeights || []).map(w => ({ weight: w.weight_kg, date: w.weight_date }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (allWeights.length === 0) return null;

        const startWeight = beforeWeights[0]?.weight || allWeights[0].weight;
        const endWeight = allWeights[allWeights.length - 1].weight;
        const change = endWeight - startWeight;
        const changePercentage = (change / startWeight) * 100;
        const weights = allWeights.map(w => w.weight);
        const averageWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
        const minWeight = Math.min(...weights);
        const maxWeight = Math.max(...weights);

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (Math.abs(change) > 0.5) {
          trend = change > 0 ? 'up' : 'down';
        }

        return {
          trainee_id: trainee.id,
          trainee_name: trainee.full_name,
          period_start: startDate.toISOString(),
          period_end: endDate.toISOString(),
          start_weight: startWeight,
          end_weight: endWeight,
          change,
          change_percentage: changePercentage,
          average_weight: averageWeight,
          min_weight: minWeight,
          max_weight: maxWeight,
          measurements_count: measurements?.length || 0,
          self_weights_count: selfWeights?.length || 0,
          trend
        };
      });

      const reports = (await Promise.all(reportPromises)).filter(r => r !== null) as WeightReport[];
      reports.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
      setReports(reports);
    } catch (error) {
      console.error('Error generating reports:', error);
      toast.error('שגיאה ביצירת דוחות');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csv = [
      ['מתאמן', 'תאריך התחלה', 'תאריך סיום', 'משקל התחלה', 'משקל סיום', 'שינוי', 'שינוי %', 'ממוצע', 'מינימום', 'מקסימום', 'מדידות', 'שקילות מהבית'],
      ...reports.map(r => [
        r.trainee_name,
        new Date(r.period_start).toLocaleDateString('he-IL'),
        new Date(r.period_end).toLocaleDateString('he-IL'),
        r.start_weight.toFixed(1),
        r.end_weight.toFixed(1),
        r.change > 0 ? '+' : '' + r.change.toFixed(1),
        r.change_percentage > 0 ? '+' : '' + r.change_percentage.toFixed(2) + '%',
        r.average_weight.toFixed(1),
        r.min_weight.toFixed(1),
        r.max_weight.toFixed(1),
        r.measurements_count.toString(),
        r.self_weights_count.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `דוח_משקל_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('הדוח יוצא בהצלחה');
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'week':
        return 'שבוע';
      case 'month':
        return 'חודש';
      case 'quarter':
        return 'רבעון';
      case 'year':
        return 'שנה';
    }
  };

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
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/30 to-cyan-500/30">
            <FileText className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">דוחות משקל</h3>
            <p className="text-sm text-gray-400">סיכום תקופתי</p>
          </div>
        </div>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold flex items-center gap-2 transition-all hover:scale-105"
        >
          <Download className="h-4 w-4" />
          ייצא ל-CSV
        </button>
      </div>

      {/* Period Selection */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value as any)}
          className="px-4 py-2 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:ring-2 focus:ring-teal-500/50"
        >
          <option value="week">שבוע</option>
          <option value="month">חודש</option>
          <option value="quarter">רבעון</option>
          <option value="year">שנה</option>
        </select>
        <input
          type="date"
          value={selectedDate.toISOString().split('T')[0]}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          className="px-4 py-2 rounded-xl bg-gray-800/50 border border-gray-700/50 text-white text-sm focus:ring-2 focus:ring-teal-500/50"
        />
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 font-medium">אין נתונים לתקופה זו</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.trainee_id}
              className={`p-5 rounded-2xl border transition-all ${
                report.trend === 'down'
                  ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5'
                  : report.trend === 'up'
                  ? 'border-red-500/30 bg-gradient-to-br from-red-500/5 to-orange-500/5'
                  : 'border-gray-500/30 bg-gray-800/30'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-gray-400" />
                    <h4 className="font-bold text-white text-lg">{report.trainee_name}</h4>
                    {report.trend === 'down' ? (
                      <TrendingDown className="h-5 w-5 text-emerald-400" />
                    ) : report.trend === 'up' ? (
                      <TrendingUp className="h-5 w-5 text-red-400" />
                    ) : null}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>
                      {new Date(report.period_start).toLocaleDateString('he-IL')} -{' '}
                      {new Date(report.period_end).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                </div>
                <div className="text-left">
                  <p className={`text-2xl font-bold ${
                    report.change < 0 ? 'text-emerald-400' : report.change > 0 ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {report.change > 0 ? '+' : ''}{report.change.toFixed(1)} ק״ג
                  </p>
                  <p className="text-xs text-gray-500">
                    {report.change_percentage > 0 ? '+' : ''}{report.change_percentage.toFixed(2)}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">התחלה</p>
                  <p className="font-semibold text-white">{report.start_weight.toFixed(1)} ק״ג</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">סיום</p>
                  <p className="font-semibold text-white">{report.end_weight.toFixed(1)} ק״ג</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">ממוצע</p>
                  <p className="font-semibold text-white">{report.average_weight.toFixed(1)} ק״ג</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">טווח</p>
                  <p className="font-semibold text-white">
                    {report.min_weight.toFixed(1)} - {report.max_weight.toFixed(1)} ק״ג
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700/50 flex items-center justify-between text-xs text-gray-500">
                <span>{report.measurements_count} מדידות</span>
                <span>{report.self_weights_count} שקילות מהבית</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
