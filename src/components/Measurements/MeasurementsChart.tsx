import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BodyMeasurement } from '../../types';

interface MeasurementsChartProps {
  measurements: BodyMeasurement[];
  metric: 'weight' | 'bodyFat' | 'muscleMass' | 'waterPercentage';
}

export default function MeasurementsChart({ measurements, metric }: MeasurementsChartProps) {
  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'weight': return 'משקל (ק״ג)';
      case 'bodyFat': return 'אחוז שומן (%)';
      case 'muscleMass': return 'מסת שריר (ק״ג)';
      case 'waterPercentage': return 'אחוז מים (%)';
      default: return metric;
    }
  };

  const getMetricColor = (metric: string) => {
    switch (metric) {
      case 'weight': return '#3B82F6';
      case 'bodyFat': return '#EF4444';
      case 'muscleMass': return '#10B981';
      case 'waterPercentage': return '#8B5CF6';
      default: return '#6B7280';
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
      <div className="flex items-center justify-center h-64 text-gray-500">
        אין נתונים להצגה עבור {getMetricLabel(metric)}
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            stroke="#6B7280"
            fontSize={12}
          />
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            labelStyle={{ color: '#374151' }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={getMetricColor(metric)}
            strokeWidth={3}
            dot={{ fill: getMetricColor(metric), strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: getMetricColor(metric), strokeWidth: 2 }}
            name={getMetricLabel(metric)}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}