import { useState, useEffect } from 'react';
import { X, Calendar, Dumbbell, Scale, FileText, Trophy, TrendingDown, TrendingUp, ChevronDown, ChevronUp, Activity, Droplets, List, Table2 } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');

  useEffect(() => {
    loadTimelineData();
  }, [traineeId]);

  const loadTimelineData = async () => {
    setLoading(true);
    const timelineItems: TimelineItem[] = [];

    const { data: workoutTrainees } = await supabase
      .from('workout_trainees')
      .select(`
        workouts!inner (
          id,
          workout_date,
          workout_type,
          notes,
          is_self_recorded,
          workout_exercises(
            exercises(name),
            exercise_sets(weight, reps)
          )
        )
      `)
      .eq('trainee_id', traineeId)
      .eq('workouts.is_completed', true)
      .order('workouts(workout_date)', { ascending: false })
      .limit(50);

    const workouts = workoutTrainees?.map((wt: any) => wt.workouts).filter(Boolean) || [];

    workouts?.forEach(w => {
      const exerciseCount = w.workout_exercises?.length || 0;
      let totalVolume = 0;
      w.workout_exercises?.forEach((we: any) => {
        we.exercise_sets?.forEach((es: any) => {
          totalVolume += (es.weight || 0) * (es.reps || 0);
        });
      });

      timelineItems.push({
        id: `workout-${w.id}`,
        type: 'workout',
        date: w.workout_date,
        title: w.is_self_recorded ? 'אימון עצמאי' : `אימון ${w.workout_type === 'pair' ? 'זוגי' : 'אישי'}`,
        description: `${exerciseCount} תרגילים`,
        metadata: {
          workoutId: w.id,
          notes: w.notes,
          exerciseCount,
          totalVolume,
          isSelfRecorded: w.is_self_recorded,
          exercises: w.workout_exercises?.slice(0, 3).map((we: any) => we.exercises?.name).filter(Boolean)
        },
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
          waterPercentage: m.water_percentage,
          metabolicAge: m.metabolic_age,
          bmi: m.bmi,
          source: m.source,
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
        metadata: { weight: sw.weight_kg, notes: sw.notes },
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
      case 'workout': return { bg: 'bg-primary-500/15', text: 'text-primary-400', border: 'border-primary-500/30' };
      case 'measurement': return { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' };
      case 'self_weight': return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' };
      case 'goal_achieved': return { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30' };
      case 'note': return { bg: 'bg-muted/15', text: 'text-muted', border: 'border-border/30' };
      default: return { bg: 'bg-muted/15', text: 'text-muted', border: 'border-border/30' };
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'workout': return 'אימון';
      case 'measurement': return 'מדידה';
      case 'self_weight': return 'שקילה';
      case 'goal_achieved': return 'יעד';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-overlay/70 flex items-center justify-center z-50 p-4">
      <div className="premium-card-static max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary-500/15">
              <Calendar className="h-6 w-6 text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">ציר זמן</h2>
              <p className="text-sm text-muted">{traineeName} - {filteredItems.length} פעילויות</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-surface text-muted hover:text-foreground hover:bg-elevated transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
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
                      ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                      : 'bg-surface text-muted hover:text-foreground border border-border'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-surface p-1 rounded-xl border border-border">
              <button
                onClick={() => setViewMode('timeline')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'timeline' ? 'bg-primary-500/15 text-primary-400' : 'text-muted hover:text-foreground'
                }`}
                title="ציר זמן"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'table' ? 'bg-primary-500/15 text-primary-400' : 'text-muted hover:text-foreground'
                }`}
                title="טבלה"
              >
                <Table2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-xl bg-surface flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-7 h-7 text-muted" />
              </div>
              <p className="text-muted">אין פעילות להצגה</p>
            </div>
          ) : viewMode === 'timeline' ? (
            <div className="relative">
              <div className="absolute right-6 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-4">
                {filteredItems.map((item) => {
                  const styles = getItemStyles(item.type);
                  const isExpanded = expandedItems.has(item.id);
                  return (
                    <div key={item.id} className="relative pr-14">
                      <div className={`absolute right-4 w-5 h-5 rounded-full ${styles.bg} border-2 ${styles.border} flex items-center justify-center`}>
                        <div className={`w-2 h-2 rounded-full ${styles.bg}`} />
                      </div>
                      <div
                        className="bg-surface/30 rounded-xl border border-border hover:border-border-hover transition-all cursor-pointer overflow-hidden"
                        onClick={() => toggleExpand(item.id)}
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl ${styles.bg} flex items-center justify-center ${styles.text}`}>
                                {getItemIcon(item.type)}
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">{item.title}</p>
                                <p className="text-sm text-muted">{formatDate(item.date)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.description && (
                                <span className={`text-sm font-medium px-3 py-1 rounded-lg ${styles.bg} ${styles.text}`}>
                                  {item.description}
                                </span>
                              )}
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-muted" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-muted" />
                              )}
                            </div>
                          </div>
                        </div>

                        {isExpanded && item.metadata && (
                          <div className="px-4 pb-4 pt-0">
                            <div className="pt-4 border-t border-border">
                              {item.type === 'measurement' && (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    <div className="bg-blue-500/10 rounded-xl p-3 text-center border border-blue-500/20">
                                      <Scale className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                                      <p className="text-xs text-blue-400 mb-0.5">משקל</p>
                                      <p className="font-bold text-blue-400">{item.metadata.weight} ק"ג</p>
                                    </div>
                                    {item.metadata.bodyFat && (
                                      <div className="bg-amber-500/10 rounded-xl p-3 text-center border border-amber-500/20">
                                        <TrendingDown className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                                        <p className="text-xs text-amber-400 mb-0.5">אחוז שומן</p>
                                        <p className="font-bold text-amber-400">{item.metadata.bodyFat}%</p>
                                      </div>
                                    )}
                                    {item.metadata.muscleMass && (
                                      <div className="bg-primary-500/10 rounded-xl p-3 text-center border border-primary-500/20">
                                        <TrendingUp className="w-4 h-4 text-primary-400 mx-auto mb-1" />
                                        <p className="text-xs text-primary-400 mb-0.5">מסת שריר</p>
                                        <p className="font-bold text-primary-400">{item.metadata.muscleMass} ק"ג</p>
                                      </div>
                                    )}
                                    {item.metadata.waterPercentage && (
                                      <div className="bg-blue-500/10 rounded-xl p-3 text-center border border-blue-500/20">
                                        <Droplets className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                                        <p className="text-xs text-blue-400 mb-0.5">אחוז מים</p>
                                        <p className="font-bold text-blue-400">{item.metadata.waterPercentage}%</p>
                                      </div>
                                    )}
                                    {item.metadata.metabolicAge && (
                                      <div className="bg-red-500/10 rounded-xl p-3 text-center border border-red-500/20">
                                        <Activity className="w-4 h-4 text-red-400 mx-auto mb-1" />
                                        <p className="text-xs text-red-400 mb-0.5">גיל מטבולי</p>
                                        <p className="font-bold text-red-400">{item.metadata.metabolicAge}</p>
                                      </div>
                                    )}
                                    {item.metadata.bmi && (
                                      <div className="bg-muted/10 rounded-xl p-3 text-center border border-border/20">
                                        <Scale className="w-4 h-4 text-muted mx-auto mb-1" />
                                        <p className="text-xs text-muted mb-0.5">BMI</p>
                                        <p className="font-bold text-foreground">{item.metadata.bmi}</p>
                                      </div>
                                    )}
                                  </div>
                                  {item.metadata.source && (
                                    <p className="text-xs text-muted">
                                      מקור: {item.metadata.source === 'tanita' ? 'Tanita' : 'מדידה ידנית'}
                                    </p>
                                  )}
                                </div>
                              )}

                              {item.type === 'workout' && (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-primary-500/10 rounded-xl p-3 text-center border border-primary-500/20">
                                      <p className="text-xs text-primary-400 mb-0.5">תרגילים</p>
                                      <p className="font-bold text-primary-400">{item.metadata.exerciseCount}</p>
                                    </div>
                                    <div className="bg-blue-500/10 rounded-xl p-3 text-center border border-blue-500/20">
                                      <p className="text-xs text-blue-400 mb-0.5">נפח כולל</p>
                                      <p className="font-bold text-blue-400">{(item.metadata.totalVolume as number).toLocaleString()} ק"ג</p>
                                    </div>
                                  </div>
                                  {(item.metadata.exercises as string[])?.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {(item.metadata.exercises as string[]).map((ex, idx) => (
                                        <span key={idx} className="text-xs bg-surface text-foreground px-2 py-1 rounded-lg border border-border">
                                          {ex}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {item.type === 'self_weight' && (
                                <div className="bg-amber-500/10 rounded-xl p-3 text-center border border-amber-500/20 max-w-[150px]">
                                  <Scale className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                                  <p className="text-xs text-amber-400 mb-0.5">משקל</p>
                                  <p className="font-bold text-amber-400">{item.metadata.weight} ק"ג</p>
                                </div>
                              )}

                              {item.metadata.notes && (
                                <p className="text-sm text-muted bg-surface rounded-xl p-3 border border-border mt-3">
                                  {item.metadata.notes as string}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    <th className="text-right py-3 px-3 text-xs font-semibold text-muted">תאריך</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-muted">סוג</th>
                    <th className="text-right py-3 px-3 text-xs font-semibold text-muted">פרטים</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-muted">משקל</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-muted">% שומן</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-muted">מסת שריר</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-muted">נפח/BMI</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const styles = getItemStyles(item.type);
                    return (
                      <tr key={item.id} className="border-b border-border hover:bg-surface/30 transition-all">
                        <td className="py-3 px-3">
                          <span className="text-foreground text-sm">
                            {new Date(item.date).toLocaleDateString('he-IL')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`text-xs px-2 py-1 rounded-lg ${styles.bg} ${styles.text} border ${styles.border}`}>
                            {getTypeLabel(item.type)}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-foreground text-sm">{item.title}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.metadata?.weight ? (
                            <span className="font-semibold text-blue-400">{item.metadata.weight}</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.metadata?.bodyFat ? (
                            <span className="font-semibold text-amber-400">{item.metadata.bodyFat}%</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.metadata?.muscleMass ? (
                            <span className="font-semibold text-primary-400">{item.metadata.muscleMass}</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.type === 'workout' && item.metadata?.totalVolume ? (
                            <span className="font-semibold text-primary-400">{(item.metadata.totalVolume as number).toLocaleString()}</span>
                          ) : item.metadata?.bmi ? (
                            <span className="font-semibold text-foreground">{item.metadata.bmi}</span>
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

        <div className="p-6 border-t border-border">
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
