import { useState, useEffect } from 'react';
import { X, Calendar, Dumbbell, Scale, FileText, Trophy, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
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

  const getItemStyles = (type: string) => {
    switch (type) {
      case 'workout': return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' };
      case 'measurement': return { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' };
      case 'self_weight': return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' };
      case 'goal_achieved': return { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30' };
      case 'note': return { bg: 'bg-zinc-500/15', text: 'text-zinc-400', border: 'border-zinc-500/30' };
      default: return { bg: 'bg-zinc-500/15', text: 'text-zinc-400', border: 'border-zinc-500/30' };
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="premium-card-static max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/15">
              <Calendar className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">ציר זמן</h2>
              <p className="text-sm text-zinc-500">{traineeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 border-b border-zinc-800/50">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'הכל' },
              { id: 'workout', label: 'אימונים' },
              { id: 'measurement', label: 'מדידות' },
              { id: 'self_weight', label: 'שקילות' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as typeof filter)}
                className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                  filter === f.id
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-zinc-800/50 text-zinc-400 hover:text-white border border-zinc-700/30'
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
              <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-7 h-7 text-zinc-600" />
              </div>
              <p className="text-zinc-500">אין פעילות להצגה</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute right-6 top-0 bottom-0 w-0.5 bg-zinc-800" />
              <div className="space-y-4">
                {filteredItems.map((item) => {
                  const styles = getItemStyles(item.type);
                  return (
                    <div key={item.id} className="relative pr-14">
                      <div className={`absolute right-4 w-5 h-5 rounded-full ${styles.bg} border-2 ${styles.border} flex items-center justify-center`}>
                        <div className={`w-2 h-2 rounded-full ${styles.bg}`} />
                      </div>
                      <div
                        className="bg-zinc-800/30 rounded-xl border border-zinc-700/30 p-4 hover:border-zinc-600/50 transition-all cursor-pointer"
                        onClick={() => toggleExpand(item.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl ${styles.bg} flex items-center justify-center ${styles.text}`}>
                              {getItemIcon(item.type)}
                            </div>
                            <div>
                              <p className="font-semibold text-white">{item.title}</p>
                              <p className="text-sm text-zinc-500">{formatDate(item.date)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.description && (
                              <span className={`text-sm font-medium px-3 py-1 rounded-lg ${styles.bg} ${styles.text}`}>
                                {item.description}
                              </span>
                            )}
                            {expandedItems.has(item.id) ? (
                              <ChevronUp className="w-5 h-5 text-zinc-500" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-zinc-500" />
                            )}
                          </div>
                        </div>
                        {expandedItems.has(item.id) && item.metadata && (
                          <div className="mt-4 pt-4 border-t border-zinc-700/30">
                            {item.type === 'measurement' && (
                              <div className="grid grid-cols-3 gap-3">
                                <div className="bg-cyan-500/10 rounded-xl p-3 text-center border border-cyan-500/20">
                                  <p className="text-xs text-cyan-400 mb-1">משקל</p>
                                  <p className="font-bold text-cyan-400">{item.metadata.weight} ק"ג</p>
                                </div>
                                {item.metadata.bodyFat && (
                                  <div className="bg-emerald-500/10 rounded-xl p-3 text-center border border-emerald-500/20">
                                    <p className="text-xs text-emerald-400 mb-1">אחוז שומן</p>
                                    <p className="font-bold text-emerald-400">{item.metadata.bodyFat}%</p>
                                  </div>
                                )}
                                {item.metadata.muscleMass && (
                                  <div className="bg-amber-500/10 rounded-xl p-3 text-center border border-amber-500/20">
                                    <p className="text-xs text-amber-400 mb-1">מסת שריר</p>
                                    <p className="font-bold text-amber-400">{item.metadata.muscleMass} ק"ג</p>
                                  </div>
                                )}
                              </div>
                            )}
                            {item.metadata.notes && (
                              <p className="text-sm text-zinc-400 bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/30">
                                {item.metadata.notes as string}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-800/50">
          <button
            onClick={onClose}
            className="w-full btn-primary px-6 py-4 text-lg font-bold"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
