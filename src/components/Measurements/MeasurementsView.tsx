import { Plus, TrendingDown, TrendingUp, Scale, BarChart3, Trash2, Edit, User } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Trainee, BodyMeasurement } from '../../types';
import MeasurementsChart from './MeasurementsChart';
import { supabase } from '../../lib/supabase';

interface MeasurementsViewProps {
  trainee: Trainee;
  measurements: BodyMeasurement[];
  onNewMeasurement: () => void;
  onEditMeasurement?: (measurement: BodyMeasurement) => void;
  onMeasurementDeleted?: () => void;
}

export default function MeasurementsView({ trainee, measurements, onNewMeasurement, onEditMeasurement, onMeasurementDeleted }: MeasurementsViewProps) {
  const [selectedMetric, setSelectedMetric] = useState<'weight' | 'bodyFat' | 'muscleMass' | 'waterPercentage'>('weight');
  const [selectedMember, setSelectedMember] = useState<'member_1' | 'member_2' | 'all'>('all');

  const filteredMeasurements = useMemo(() => {
    if (!trainee.isPair) {
      return measurements;
    }

    if (selectedMember === 'all') {
      return measurements.filter(m => m.pairMember === null);
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
    { key: 'weight' as const, label: 'משקל', unit: 'ק״ג', icon: Scale, color: 'blue' },
    { key: 'bodyFat' as const, label: 'אחוז שומן', unit: '%', icon: TrendingDown, color: 'red' },
    { key: 'muscleMass' as const, label: 'מסת שריר', unit: 'ק״ג', icon: TrendingUp, color: 'green' },
    { key: 'waterPercentage' as const, label: 'אחוז מים', unit: '%', icon: BarChart3, color: 'purple' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">מדידות - {trainee.name}</h1>
          <p className="text-gray-600">מעקב אחר התקדמות ושינויים בהרכב הגוף</p>
        </div>

        <button
          onClick={onNewMeasurement}
          className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 rtl:space-x-reverse transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>מדידה חדשה</span>
        </button>
      </div>

      {/* Pair Member Selection */}
      {trainee.isPair && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">הצג מדידות עבור:</h3>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setSelectedMember('all')}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedMember === 'all'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <User className={`h-6 w-6 mx-auto mb-2 ${
                selectedMember === 'all' ? 'text-green-600' : 'text-gray-400'
              }`} />
              <p className={`text-sm font-semibold text-center ${
                selectedMember === 'all' ? 'text-green-700' : 'text-gray-600'
              }`}>{trainee.pairName1} + {trainee.pairName2}</p>
            </button>
            <button
              onClick={() => setSelectedMember('member_1')}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedMember === 'member_1'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <User className={`h-6 w-6 mx-auto mb-2 ${
                selectedMember === 'member_1' ? 'text-blue-600' : 'text-gray-400'
              }`} />
              <p className={`text-sm font-semibold text-center ${
                selectedMember === 'member_1' ? 'text-blue-700' : 'text-gray-600'
              }`}>{trainee.pairName1}</p>
            </button>
            <button
              onClick={() => setSelectedMember('member_2')}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedMember === 'member_2'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <User className={`h-6 w-6 mx-auto mb-2 ${
                selectedMember === 'member_2' ? 'text-purple-600' : 'text-gray-400'
              }`} />
              <p className={`text-sm font-semibold text-center ${
                selectedMember === 'member_2' ? 'text-purple-700' : 'text-gray-600'
              }`}>{trainee.pairName2}</p>
            </button>
          </div>
        </div>
      )}

      {/* Current Stats */}
      {latestMeasurement && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map(({ key, label, unit, icon: Icon, color }) => {
            const current = latestMeasurement[key];
            const previous = previousMeasurement?.[key];
            const change = getChange(current, previous);
            const changePercentage = getChangePercentage(current, previous);

            const colorClasses = {
              blue: 'bg-blue-50 text-blue-600 border-blue-200',
              red: 'bg-red-50 text-red-600 border-red-200',
              green: 'bg-green-50 text-green-600 border-green-200',
              purple: 'bg-purple-50 text-purple-600 border-purple-200',
            };

            return (
              <div key={key} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {current ? `${current.toFixed(1)} ${unit}` : 'לא נמדד'}
                    </p>
                    {change && (
                      <div className={`flex items-center mt-2 text-sm ${
                        (key === 'bodyFat' ? change < 0 : change > 0) ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(key === 'bodyFat' ? change < 0 : change > 0) ? (
                          <TrendingUp className="h-4 w-4 ml-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 ml-1" />
                        )}
                        {change > 0 ? '+' : ''}{change.toFixed(1)} {unit}
                        {changePercentage && (
                          <span className="mr-1">
                            ({changePercentage > 0 ? '+' : ''}{changePercentage.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chart Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-900">גרף התקדמות</h3>
            <div className="flex flex-wrap gap-2">
              {metrics.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSelectedMetric(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedMetric === key
                      ? 'bg-green-100 text-green-700 border-2 border-green-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6">
          <MeasurementsChart measurements={filteredMeasurements} metric={selectedMetric} />
        </div>
      </div>

      {/* Measurements History */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">היסטוריית מדידות</h3>
        </div>
        <div className="p-6">
          {filteredMeasurements.length > 0 ? (
            <div className="space-y-4">
              {filteredMeasurements.map((measurement) => (
                <div key={measurement.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <div className="bg-green-50 p-2 rounded-lg">
                        <Scale className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Date(measurement.date).toLocaleDateString('he-IL')}
                          {trainee.isPair && measurement.pairMember && (
                            <span className={`mr-2 text-xs px-2 py-1 rounded ${
                              measurement.pairMember === 'member_1'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {measurement.pairMember === 'member_1' ? trainee.pairName1 : trainee.pairName2}
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {measurement.source === 'tanita' ? 'Tanita' : 'מדידה ידנית'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      {onEditMeasurement && (
                        <button
                          onClick={() => onEditMeasurement(measurement)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="ערוך מדידה"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteMeasurement(measurement.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="מחק מדידה"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">משקל:</span>
                      <span className="font-medium mr-2">{measurement.weight} ק״ג</span>
                    </div>
                    {measurement.bodyFat && (
                      <div>
                        <span className="text-gray-500">אחוז שומן:</span>
                        <span className="font-medium mr-2">{measurement.bodyFat.toFixed(1)}%</span>
                      </div>
                    )}
                    {measurement.muscleMass && (
                      <div>
                        <span className="text-gray-500">מסת שריר:</span>
                        <span className="font-medium mr-2">{measurement.muscleMass.toFixed(1)} ק״ג</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">BMI:</span>
                      <span className="font-medium mr-2">{measurement.bmi}</span>
                    </div>
                  </div>

                  {measurement.measurements && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-500 mb-2">היקפים (ס״מ):</p>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                        {measurement.measurements.chest && (
                          <span>חזה: {measurement.measurements.chest}</span>
                        )}
                        {measurement.measurements.waist && (
                          <span>מותניים: {measurement.measurements.waist}</span>
                        )}
                        {measurement.measurements.hips && (
                          <span>ירכיים: {measurement.measurements.hips}</span>
                        )}
                        {measurement.measurements.arms && (
                          <span>זרועות: {measurement.measurements.arms}</span>
                        )}
                        {measurement.measurements.thighs && (
                          <span>ירכיים: {measurement.measurements.thighs}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Scale className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">אין מדידות עדיין</h3>
              <p className="text-gray-500 mb-6">התחל במדידה הראשונה כדי לעקוב אחר ההתקדמות</p>
              <button
                onClick={onNewMeasurement}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
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