import { useState, useEffect } from 'react';
import { X, Calendar, Dumbbell, Scale, FileText, Trophy, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface TimelineItem {
  id: string;
  type: 'workout' | 'measurement' | 'self_weight' | 'goal_achieved' | 'note';
  date: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

interface TraineeTimelineProps {
  traineeId: string;
  traineeName: string;
  onClose: () => void;
}

export default function TraineeTimeline({ traineeId, traineeName, onClose }: TraineeTimelineProps) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'workout' | 'measurement' | 'self_weight'>('all');

  useEffect(() => {
    loadTimelineData();
  }, [traineeId]);

  const loadTimelineData = async () => {
    setLoading(true);
    const timelineItems: TimelineItem[] = [];

    const { data: workouts } = await supabase
      .from('workouts')
      .select(`
        id,
        workout_date,
        workout_type,
        notes,
        workout_exercises(
          exercises(name)
        )
      `)
      .eq('workout_trainees.trainee_id', traineeId)
      .order('workout_date', { ascending: false })
      .limit(50);

    workouts?.forEach(w => {
      const exerciseCount = w.workout_exercises?.length || 0;
      timelineItems.push({
        id: `workout-${w.id}`,
        type: 'workout',
        date: w.workout_date,
        title: `אימון ${w.workout_type === 'pair' ? 'זוגי' : 'אישי'}`,
        description: `${exerciseCount} תרגילים`,
        metadata: { workoutId: w.id, notes: w.notes },
      });
    });

    const { data: measurements } = await supabase
      .from('measurements')
      .select('*')
      .eq('trainee_id', traineeId)
      .order('measurement_date', { ascending: false })
      .limit(50);

    measurements?.forEach(m => {
      timelineItems.push({
        id: `measurement-${m.id}`,
        type: 'measurement',
        date: m.measurement_date,
        title: 'מדידה',
        description: `${m.weight_kg} ק"ג`,
        metadata: {
          weight: m.weight_kg,
          bodyFat: m.body_fat_percent,
          muscleMass: m.muscle_mass_kg,
        },
      });
    });

    const { data: selfWeights } = await supabase
      .from('trainee_self_weights')
      .select('*')
      .eq('trainee_id', traineeId)
      .order('weight_date', { ascending: false })
      .limit(50);

    selfWeights?.forEach(sw => {
      timelineItems.push({
        id: `self-weight-${sw.id}`,
        type: 'self_weight',
        date: sw.weight_date,
        title: 'שקילה עצמית',
        description: `${sw.weight_kg} ק"ג`,
        metadata: { notes: sw.notes },
      });
    });

    const { data: achievedGoals } = await supabase
      .from('trainee_goals')
      .select('*')
      .eq('trainee_id', traineeId)
      .eq('status', 'achieved')
      .order('updated_at', { ascending: false })
      .limit(20);

    achievedGoals?.forEach(g => {
      timelineItems.push({
        id: `goal-${g.id}`,
        type: 'goal_achieved',
        date: g.updated_at,
        title: 'יעד הושג!',
        description: g.title,
        metadata: { targetValue: g.target_value, unit: g.unit },
      });
    });

    timelineItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setItems(timelineItems);
    setLoading(false);
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const filteredItems = filter === 'all' ? items : items.filter(i => i.type === filter);

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'workout': return <Dumbbell className="w-5 h-5" />;
      case 'measurement': return <Scale className="w-5 h-5" />;
      case 'self_weight': return <TrendingDown className="w-5 h-5" />;
      case 'goal_achieved': return <Trophy className="w-5 h-5" />;
      case 'note': return <FileText className="w-5 h-5" />;
      default: return <Calendar className="w-5 h-5" />;
    }
  };

  const getItemColor = (type: string) => {
    switch (type) {
      case 'workout': return 'from-blue-500 to-cyan-500';
      case 'measurement': return 'from-emerald-500 to-teal-500';
      case 'self_weight': return 'from-amber-500 to-orange-500';
      case 'goal_achieved': return 'from-yellow-500 to-amber-500';
      case 'note': return 'from-gray-500 to-zinc-500';
      default: return 'from-gray-500 to-zinc-500';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-700 p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Calendar className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">ציר זמן</h2>
              <p className="text-sm text-blue-100">{traineeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-300 hover:scale-105"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { id: 'all', label: 'הכל' },
              { id: 'workout', label: 'אימונים' },
              { id: 'measurement', label: 'מדידות' },
              { id: 'self_weight', label: 'שקילות' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-300 ${
                  filter === f.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">אין פעילות להצגה</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute right-6 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="space-y-4">
                {filteredItems.map((item, index) => (
                  <div key={item.id} className="relative pr-14">
                    <div className={`absolute right-4 w-5 h-5 rounded-full bg-gradient-to-br ${getItemColor(item.type)} flex items-center justify-center text-white shadow-lg`}>
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                    <div
                      className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                      onClick={() => toggleExpand(item.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getItemColor(item.type)} flex items-center justify-center text-white`}>
                            {getItemIcon(item.type)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{item.title}</p>
                            <p className="text-sm text-gray-500">{formatDate(item.date)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.description && (
                            <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">
                              {item.description}
                            </span>
                          )}
                          {expandedItems.has(item.id) ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                      {expandedItems.has(item.id) && item.metadata && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          {item.type === 'measurement' && (
                            <div className="grid grid-cols-3 gap-3">
                              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                                <p className="text-xs text-emerald-600 mb-1">משקל</p>
                                <p className="font-bold text-emerald-700">{item.metadata.weight} ק"ג</p>
                              </div>
                              {item.metadata.bodyFat && (
                                <div className="bg-blue-50 rounded-lg p-3 text-center">
                                  <p className="text-xs text-blue-600 mb-1">אחוז שומן</p>
                                  <p className="font-bold text-blue-700">{item.metadata.bodyFat}%</p>
                                </div>
                              )}
                              {item.metadata.muscleMass && (
                                <div className="bg-amber-50 rounded-lg p-3 text-center">
                                  <p className="text-xs text-amber-600 mb-1">מסת שריר</p>
                                  <p className="font-bold text-amber-700">{item.metadata.muscleMass} ק"ג</p>
                                </div>
                              )}
                            </div>
                          )}
                          {item.metadata.notes && (
                            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                              {item.metadata.notes as string}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gradient-to-br from-gray-50 to-white border-t border-gray-200 p-6 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02]"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
