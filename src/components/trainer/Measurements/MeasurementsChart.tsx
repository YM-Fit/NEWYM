import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BodyMeasurement } from '../../../types';
import { TrendingUp, TrendingDown, BarChart3, List, Table2, Minus } from 'lucide-react';

interface MeasurementsChartProps {
  measurements: BodyMeasurement[];
  metric: 'weight' | 'bodyFat' | 'muscleMass' | 'waterPercentage' | 'metabolicAge';
  trainee?: {
    isPair?: boolean;
    pairName1?: string;
    pairName2?: string;
  };
}

export default function MeasurementsChart({ measurements, metric, trainee }: MeasurementsChartProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'list' | 'table'>('chart');

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'weight': return 'משקל (ק״ג)';
      case 'bodyFat': return 'אחוז שומן (%)';
      case 'muscleMass': return 'מסת שריר (ק״ג)';
      case 'waterPercentage': return 'אחוז מים (%)';
      case 'metabolicAge': return 'גיל מטבולי';
      default: return metric;
    }
  };

  const getMetricColor = (metric: string) => {
    switch (metric) {
      case 'weight': return '#10b981';        // emerald-500
      case 'bodyFat': return '#f59e0b';       // amber-500
      case 'muscleMass': return '#3b82f6';    // blue-500
      case 'waterPercentage': return '#3b82f6'; // blue-500
      case 'metabolicAge': return '#ef4444';  // red-500
      default: return '#71717a';              // zinc-500
    }
  };

  const isReversed = ['bodyFat', 'metabolicAge'].includes(metric);

  const sortedMeasurements = [...measurements]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .filter(m => m[metric] && (m[metric] as number) > 0);

  // אם זה מתאמן זוגי ויש מדידות משני בני הזוג, נציג שני קווים
  const isPairWithBothMembers = trainee?.isPair && 
    sortedMeasurements.some(m => m.pairMember === 'member_1') &&
    sortedMeasurements.some(m => m.pairMember === 'member_2');

  const chartData = sortedMeasurements.map(measurement => ({
    date: new Date(measurement.date).toLocaleDateString('he-IL'),
    fullDate: measurement.date,
    value: measurement[metric] || 0,
    pairMember: measurement.pairMember
  }));

  // נתונים משולבים עם ערכים נפרדים לכל בן זוג
  const combinedChartData = isPairWithBothMembers ? (() => {
    // אוסף את כל התאריכים הייחודיים
    const allDates = [...new Set(chartData.map(d => d.fullDate))];
    return allDates.map(date => {
      const member1Data = chartData.find(d => d.fullDate === date && d.pairMember === 'member_1');
      const member2Data = chartData.find(d => d.fullDate === date && d.pairMember === 'member_2');
      return {
        date: new Date(date).toLocaleDateString('he-IL'),
        fullDate: date,
        value1: member1Data?.value || null,
        value2: member2Data?.value || null,
      };
    });
  })() : chartData;

  const getChange = (current: number, previous: number) => {
    const diff = current - previous;
    const percentage = ((diff / previous) * 100).toFixed(1);
    const isPositive = isReversed ? diff < 0 : diff > 0;
    return { diff, percentage, isPositive };
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 light:bg-white/95 backdrop-blur-sm border border-border light:border-border rounded-xl p-4 shadow-2xl">
          <p className="text-muted light:text-muted text-xs mb-3 font-medium">{label}</p>
          {isPairWithBothMembers && payload.length > 1 ? (
            <div className="space-y-2">
              {payload.map((entry: any, index: number) => {
                if (entry.value === null || entry.value === undefined) return null;
                const memberName = index === 0 ? (trainee?.pairName1 || 'בן זוג 1') : (trainee?.pairName2 || 'בן זוג 2');
                const color = index === 0 ? '#3b82f6' : '#f59e0b';
                return (
                  <div key={index} className="flex items-baseline gap-2">
                    <p className="text-xs text-muted light:text-muted font-medium">{memberName}:</p>
                    <p className="font-bold text-xl" style={{ color }}>
                      {entry.value}
                    </p>
                    <p className="text-xs text-muted light:text-muted font-medium">
                      {metric === 'bodyFat' || metric === 'waterPercentage' ? '%' : metric === 'metabolicAge' ? '' : 'ק"ג'}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <p className="font-bold text-2xl" style={{ color: getMetricColor(metric) }}>
                {payload[0].value}
              </p>
              <p className="text-sm text-muted light:text-muted font-medium">
                {metric === 'bodyFat' || metric === 'waterPercentage' ? '%' : metric === 'metabolicAge' ? '' : 'ק"ג'}
              </p>
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-border light:border-border">
            <p className="text-xs text-muted light:text-muted">{getMetricLabel(metric)}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (sortedMeasurements.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted" />
          <p>אין נתונים להצגה עבור {getMetricLabel(metric)}</p>
        </div>
      </div>
    );
  }

  const firstValue = sortedMeasurements[0]?.[metric] as number;
  const lastValue = sortedMeasurements[sortedMeasurements.length - 1]?.[metric] as number;
  const totalChange = firstValue && lastValue ? getChange(lastValue, firstValue) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {totalChange && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              totalChange.isPositive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
            }`}>
              {totalChange.isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="text-sm font-semibold">
                {totalChange.diff > 0 ? '+' : ''}{totalChange.diff.toFixed(1)} ({totalChange.percentage}%)
              </span>
            </div>
          )}
          <span className="text-xs text-muted">
            {sortedMeasurements.length} מדידות
          </span>
        </div>
        <div className="flex gap-1 bg-surface p-1 rounded-xl border border-border">
          <button
            onClick={() => setViewMode('chart')}
            className={`p-2 rounded-lg transition-all ${
              viewMode === 'chart' ? 'bg-emerald-500/15 text-emerald-400' : 'text-muted hover:text-foreground'
            }`}
            title="גרף"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${
              viewMode === 'list' ? 'bg-emerald-500/15 text-emerald-400' : 'text-muted hover:text-foreground'
            }`}
            title="רשימה"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg transition-all ${
              viewMode === 'table' ? 'bg-emerald-500/15 text-emerald-400' : 'text-muted hover:text-foreground'
            }`}
            title="טבלה"
          >
            <Table2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === 'chart' && (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={combinedChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#3f3f46" 
                strokeOpacity={0.3}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="#71717a"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#3f3f46', strokeOpacity: 0.5 }}
                tick={{ fill: '#a1a1aa' }}
              />
              <YAxis
                stroke="#71717a"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#a1a1aa' }}
                width={45}
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ 
                  stroke: isPairWithBothMembers ? '#3b82f6' : getMetricColor(metric), 
                  strokeWidth: 1, 
                  strokeDasharray: '5 5', 
                  strokeOpacity: 0.3 
                }} 
              />
              {isPairWithBothMembers ? (
                <>
                  <Line
                    type="monotone"
                    dataKey="value1"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ 
                      fill: '#3b82f6', 
                      strokeWidth: 3, 
                      r: 5, 
                      stroke: '#09090b',
                      filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.3))'
                    }}
                    activeDot={{ 
                      r: 8, 
                      stroke: '#3b82f6', 
                      strokeWidth: 3, 
                      fill: '#09090b',
                      filter: 'drop-shadow(0 0 8px #3b82f6)'
                    }}
                    name={trainee?.pairName1 || 'בן זוג 1'}
                    connectNulls={false}
                    animationDuration={1000}
                    animationEasing="ease-in-out"
                  />
                  <Line
                    type="monotone"
                    dataKey="value2"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ 
                      fill: '#f59e0b', 
                      strokeWidth: 3, 
                      r: 5, 
                      stroke: '#09090b',
                      filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.3))'
                    }}
                    activeDot={{ 
                      r: 8, 
                      stroke: '#f59e0b', 
                      strokeWidth: 3, 
                      fill: '#09090b',
                      filter: 'drop-shadow(0 0 8px #f59e0b)'
                    }}
                    name={trainee?.pairName2 || 'בן זוג 2'}
                    connectNulls={false}
                    animationDuration={1000}
                    animationEasing="ease-in-out"
                  />
                </>
              ) : (
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={getMetricColor(metric)}
                  strokeWidth={3}
                  dot={{ 
                    fill: getMetricColor(metric), 
                    strokeWidth: 3, 
                    r: 5, 
                    stroke: '#09090b',
                    filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.3))'
                  }}
                  activeDot={{ 
                    r: 8, 
                    stroke: getMetricColor(metric), 
                    strokeWidth: 3, 
                    fill: '#09090b',
                    filter: 'drop-shadow(0 0 8px ' + getMetricColor(metric) + ')'
                  }}
                  name={getMetricLabel(metric)}
                  animationDuration={1000}
                  animationEasing="ease-in-out"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {[...sortedMeasurements].reverse().map((measurement, index, arr) => {
            const value = measurement[metric] as number;
            const prevMeasurement = arr[index + 1];
            const prevValue = prevMeasurement?.[metric] as number;
            const change = prevValue ? getChange(value, prevValue) : null;

            return (
              <div
                key={measurement.id}
                className="flex items-center justify-between p-3 bg-surface/30 rounded-xl border border-border/30 hover:border-border-hover transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${getMetricColor(metric)}20` }}
                  >
                    <span className="text-sm font-bold" style={{ color: getMetricColor(metric) }}>
                      {arr.length - index}
                    </span>
                  </div>
                  <div>
                    <p className="text-foreground font-semibold">
                      {new Date(measurement.date).toLocaleDateString('he-IL', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(measurement.date).toLocaleDateString('he-IL', { weekday: 'long' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {change && (
                    <div className={`flex items-center gap-1 text-sm ${
                      change.isPositive ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {change.diff === 0 ? (
                        <Minus className="w-3 h-3" />
                      ) : change.isPositive ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span className="font-medium">
                        {change.diff > 0 ? '+' : ''}{change.diff.toFixed(1)}
                      </span>
                    </div>
                  )}
                  <div
                    className="px-4 py-2 rounded-xl font-bold text-lg"
                    style={{
                      backgroundColor: `${getMetricColor(metric)}15`,
                      color: getMetricColor(metric)
                    }}
                  >
                    {value.toFixed(1)}
                    <span className="text-xs font-normal mr-1">
                      {metric === 'bodyFat' || metric === 'waterPercentage' ? '%' : metric === 'metabolicAge' ? '' : 'ק"ג'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'table' && (
        <div className="overflow-x-auto max-h-72">
          <table className="w-full">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border">
                <th className="text-right py-2 px-3 text-xs font-semibold text-muted">#</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-muted">תאריך</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-muted">{getMetricLabel(metric)}</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-muted">שינוי</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-muted">שינוי %</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-muted">מהתחלה</th>
              </tr>
            </thead>
            <tbody>
              {[...sortedMeasurements].reverse().map((measurement, index, arr) => {
                const value = measurement[metric] as number;
                const prevMeasurement = arr[index + 1];
                const prevValue = prevMeasurement?.[metric] as number;
                const change = prevValue ? getChange(value, prevValue) : null;
                const fromStart = firstValue ? getChange(value, firstValue) : null;

                return (
                  <tr key={measurement.id} className="border-b border-border/50 hover:bg-surface/30 transition-all">
                    <td className="py-2 px-3 text-muted text-sm">{arr.length - index}</td>
                    <td className="py-2 px-3">
                      <span className="text-foreground text-sm">
                        {new Date(measurement.date).toLocaleDateString('he-IL')}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className="font-bold"
                        style={{ color: getMetricColor(metric) }}
                      >
                        {value.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {change ? (
                        <span className={`text-sm font-medium ${
                          change.isPositive ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {change.diff > 0 ? '+' : ''}{change.diff.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {change ? (
                        <span className={`text-sm ${
                          change.isPositive ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {change.percentage}%
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {fromStart && index < arr.length - 1 ? (
                        <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                          fromStart.isPositive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                        }`}>
                          {fromStart.diff > 0 ? '+' : ''}{fromStart.diff.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
