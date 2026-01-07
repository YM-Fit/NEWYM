import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BodyMeasurement } from '../../../types';

interface MeasurementsChartProps {
  measurements: BodyMeasurement[];
  metric: 'weight' | 'bodyFat' | 'muscleMass' | 'waterPercentage' | 'metabolicAge';
}

export default function MeasurementsChart({ measurements, metric }: MeasurementsChartProps) {
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
      case 'weight': return '#10b981';
      case 'bodyFat': return '#f59e0b';
      case 'muscleMass': return '#06b6d4';
      case 'waterPercentage': return '#3b82f6';
      case 'metabolicAge': return '#ef4444';
      default: return '#71717a';
    }
  };

  const chartData = measurements
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(measurement => ({
      date: new Date(measurement.date).toLocaleDateString('he-IL'),
      value: measurement[metric] || 0
    }))
    .filter(item => item.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        אין נתונים להצגה עבור {getMetricLabel(metric)}
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="date"
            stroke="#71717a"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="#71717a"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}
            labelStyle={{ color: '#a1a1aa' }}
            itemStyle={{ color: '#ffffff' }}
          />
          <Legend
            wrapperStyle={{ color: '#a1a1aa' }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={getMetricColor(metric)}
            strokeWidth={3}
            dot={{ fill: getMetricColor(metric), strokeWidth: 2, r: 5, stroke: '#18181b' }}
            activeDot={{ r: 7, stroke: getMetricColor(metric), strokeWidth: 2, fill: '#18181b' }}
            name={getMetricLabel(metric)}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
