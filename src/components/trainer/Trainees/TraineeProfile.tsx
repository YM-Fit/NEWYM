import { ArrowRight, CreditCard as Edit, Calendar, Scale, BarChart3, User, Phone, Mail, Trash2, TrendingUp, ClipboardList, UtensilsCrossed, Key, Home, CheckCircle, Brain, BookOpen, Calculator, Sparkles, Users, Activity, History, Target, FileText, CalendarDays, Bell, TrendingDown } from 'lucide-react';
import { Trainee, BodyMeasurement, Workout } from '../../../types';
import { useState } from 'react';
import TDEECalculator from '../Tools/TDEECalculator';
import TraineeTimeline from './TraineeTimeline';
import TraineeGoals from './TraineeGoals';
import TraineeNotes from './TraineeNotes';
import WeightTrendAnalysis from '../Measurements/WeightTrendAnalysis';
import WeightGoalsManager from '../Measurements/WeightGoalsManager';

interface SelfWeight {
  id: string;
  trainee_id: string;
  weight_kg: number;
  weight_date: string;
  notes: string | null;
  is_seen_by_trainer: boolean;
  created_at: string;
}

interface TraineeProfileProps {
  trainee: Trainee;
  measurements: BodyMeasurement[];
  workouts: Workout[];
  selfWeights?: SelfWeight[];
  onBack: () => void;
  onEdit: () => void;
  onNewWorkout: () => void;
  onNewMeasurement: () => void;
  onViewMeasurements: () => void;
  onViewWorkouts?: () => void;
  onViewProgress?: () => void;
  onDelete?: () => void;
  onToggleSidebar?: () => void;
  onToggleHeader?: () => void;
  onViewWorkoutPlans?: () => void;
  onViewMealPlans?: () => void;
  onViewFoodDiary?: () => void;
  onViewTraineeAccess?: () => void;
  onMarkSelfWeightsSeen?: () => void;
  onViewMentalTools?: () => void;
  onViewCardio?: () => void;
  onViewWeeklyTasks?: () => void;
}

export default function TraineeProfile({
  trainee,
  measurements,
  workouts,
  selfWeights = [],
  onBack,
  onEdit,
  onNewWorkout,
  onNewMeasurement,
  onViewMeasurements,
  onViewWorkouts,
  onViewProgress,
  onDelete,
  onViewWorkoutPlans,
  onViewMealPlans,
  onViewFoodDiary,
  onViewTraineeAccess,
  onMarkSelfWeightsSeen,
  onViewMentalTools,
  onViewCardio,
  onViewWeeklyTasks
}: TraineeProfileProps) {
  const [showTDEE, setShowTDEE] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showWeightTrend, setShowWeightTrend] = useState(false);
  const [showWeightGoals, setShowWeightGoals] = useState(false);

  const latestMeasurement = measurements[0];
  const previousMeasurement = measurements[1];

  const weightChange = latestMeasurement && previousMeasurement
    ? latestMeasurement.weight - previousMeasurement.weight
    : 0;

  return (
    <div className="space-y-6 pb-20 lg:pb-6 animate-fade-in">
      <div className="premium-card-static p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2.5 rounded-xl bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-all"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center">
                  {trainee.is_pair ? (
                    <Users className="h-8 w-8 text-emerald-400" />
                  ) : (
                    <span className="text-2xl font-bold text-emerald-400">
                      {trainee.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">פרופיל מתאמן</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{trainee.name}</h1>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onEdit}
                className="px-4 py-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 border border-cyan-500/30 flex items-center gap-2 transition-all font-medium"
              >
                <Edit className="h-4 w-4" />
                <span>ערוך</span>
              </button>
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="px-4 py-2.5 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 flex items-center gap-2 transition-all font-medium"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>מחק</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30">
              <div className="p-2.5 rounded-xl bg-cyan-500/15">
                <User className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">גיל</p>
                <p className="font-semibold text-white">{trainee.age} שנים</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30">
              <div className="p-2.5 rounded-xl bg-emerald-500/15">
                <Phone className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">טלפון</p>
                <p className="font-semibold text-white" dir="ltr">{trainee.phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30">
              <div className="p-2.5 rounded-xl bg-amber-500/15">
                <Mail className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">אימייל</p>
                <p className="font-semibold text-white text-sm truncate">{trainee.email || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30">
              <div className="p-2.5 rounded-xl bg-teal-500/15">
                <Calendar className="h-5 w-5 text-teal-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">התחיל</p>
                <p className="font-semibold text-white">{new Date(trainee.startDate).toLocaleDateString('he-IL')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {latestMeasurement && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card p-6 bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400 mb-2">משקל נוכחי</p>
                <p className="text-3xl font-bold text-cyan-400 tracking-tight">{latestMeasurement.weight} ק״ג</p>
                {weightChange !== 0 && (
                  <p className={`text-sm mt-2 font-medium ${weightChange > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} ק״ג
                  </p>
                )}
              </div>
              <div className="p-3.5 rounded-xl bg-cyan-500/20">
                <Scale className="h-6 w-6 text-cyan-400" />
              </div>
            </div>
          </div>

          <div className="stat-card p-6 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400 mb-2">אחוז שומן</p>
                <p className="text-3xl font-bold text-emerald-400 tracking-tight">{latestMeasurement.bodyFat?.toFixed(1) || '-'}%</p>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-500/20">
                <BarChart3 className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="stat-card p-6 bg-gradient-to-br from-amber-500/20 to-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400 mb-2">מסת שריר</p>
                <p className="text-3xl font-bold text-amber-400 tracking-tight">{latestMeasurement.muscleMass?.toFixed(1) || '-'} ק״ג</p>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-500/20">
                <User className="h-6 w-6 text-amber-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="premium-card-static p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          פעולות מהירות
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={onNewWorkout}
            className="action-btn group"
          >
            <div className="icon-box-primary mb-2 group-hover:shadow-glow transition-all">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">אימון חדש</span>
          </button>

          <button
            onClick={onNewMeasurement}
            className="action-btn group"
          >
            <div className="p-3 rounded-xl bg-cyan-500/15 text-cyan-400 mb-2 group-hover:bg-cyan-500/25 transition-all">
              <Scale className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">שקילה חדשה</span>
          </button>

          <button
            onClick={onViewMeasurements}
            className="action-btn group"
          >
            <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400 mb-2 group-hover:bg-amber-500/25 transition-all">
              <BarChart3 className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">גרף משקל</span>
          </button>

          {onViewProgress && (
            <button
              onClick={onViewProgress}
              className="action-btn group"
            >
              <div className="p-3 rounded-xl bg-teal-500/15 text-teal-400 mb-2 group-hover:bg-teal-500/25 transition-all">
                <TrendingUp className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">גרף אימונים</span>
            </button>
          )}

          {onViewWorkoutPlans && (
            <button
              onClick={onViewWorkoutPlans}
              className="action-btn group"
            >
              <div className="p-3 rounded-xl bg-rose-500/15 text-rose-400 mb-2 group-hover:bg-rose-500/25 transition-all">
                <ClipboardList className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">תוכניות אימון</span>
            </button>
          )}

          {onViewMealPlans && (
            <button
              onClick={onViewMealPlans}
              className="action-btn group"
            >
              <div className="p-3 rounded-xl bg-orange-500/15 text-orange-400 mb-2 group-hover:bg-orange-500/25 transition-all">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">תפריט</span>
            </button>
          )}

          {onViewFoodDiary && (
            <button
              onClick={onViewFoodDiary}
              className="action-btn group"
            >
              <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400 mb-2 group-hover:bg-amber-500/25 transition-all">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">יומן אכילה</span>
            </button>
          )}

          {onViewTraineeAccess && (
            <button
              onClick={onViewTraineeAccess}
              className="action-btn group"
            >
              <div className="p-3 rounded-xl bg-sky-500/15 text-sky-400 mb-2 group-hover:bg-sky-500/25 transition-all">
                <Key className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">גישה לאפליקציה</span>
            </button>
          )}

          {onViewMentalTools && (
            <button
              onClick={onViewMentalTools}
              className="action-btn group"
            >
              <div className="p-3 rounded-xl bg-pink-500/15 text-pink-400 mb-2 group-hover:bg-pink-500/25 transition-all">
                <Brain className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">כלים מנטליים</span>
            </button>
          )}

          {onViewCardio && (
            <button
              onClick={onViewCardio}
              className="action-btn group"
            >
              <div className="p-3 rounded-xl bg-sky-500/15 text-sky-400 mb-2 group-hover:bg-sky-500/25 transition-all">
                <Activity className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">אירובי</span>
            </button>
          )}

          {onViewWeeklyTasks && (
            <button
              onClick={onViewWeeklyTasks}
              className="action-btn group"
            >
              <div className="p-3 rounded-xl bg-purple-500/15 text-purple-400 mb-2 group-hover:bg-purple-500/25 transition-all">
                <ClipboardList className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">משימות שבועיות</span>
            </button>
          )}

          <button
            onClick={() => setShowTDEE(true)}
            className="action-btn group"
          >
            <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400 mb-2 group-hover:bg-emerald-500/25 transition-all">
              <Calculator className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">מחשבון TDEE</span>
          </button>

          <button
            onClick={() => setShowTimeline(true)}
            className="action-btn group"
          >
            <div className="p-3 rounded-xl bg-blue-500/15 text-blue-400 mb-2 group-hover:bg-blue-500/25 transition-all">
              <History className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">ציר זמן</span>
          </button>

          <button
            onClick={() => setShowGoals(true)}
            className="action-btn group"
          >
            <div className="p-3 rounded-xl bg-yellow-500/15 text-yellow-400 mb-2 group-hover:bg-yellow-500/25 transition-all">
              <Target className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">יעדים</span>
          </button>

          <button
            onClick={() => setShowNotes(true)}
            className="action-btn group"
          >
            <div className="p-3 rounded-xl bg-orange-500/15 text-orange-400 mb-2 group-hover:bg-orange-500/25 transition-all">
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">הערות</span>
          </button>

          <button
            onClick={() => setShowWeightTrend(true)}
            className="action-btn group"
          >
            <div className="p-3 rounded-xl bg-cyan-500/15 text-cyan-400 mb-2 group-hover:bg-cyan-500/25 transition-all">
              <TrendingDown className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">ניתוח מגמות</span>
          </button>

          <button
            onClick={() => setShowWeightGoals(true)}
            className="action-btn group"
          >
            <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400 mb-2 group-hover:bg-emerald-500/25 transition-all">
              <Target className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">יעדי משקל</span>
          </button>
        </div>
      </div>

      {showTDEE && (
        <TDEECalculator
          onClose={() => setShowTDEE(false)}
          initialWeight={latestMeasurement?.weight || trainee.weight || 70}
          initialHeight={trainee.height || 170}
          initialAge={trainee.age || 30}
          initialGender={trainee.gender || 'male'}
        />
      )}

      {showTimeline && (
        <TraineeTimeline
          traineeId={trainee.id}
          traineeName={trainee.name}
          onClose={() => setShowTimeline(false)}
        />
      )}

      {showGoals && (
        <TraineeGoals
          traineeId={trainee.id}
          traineeName={trainee.name}
          onClose={() => setShowGoals(false)}
        />
      )}

      {showNotes && (
        <TraineeNotes
          traineeId={trainee.id}
          traineeName={trainee.name}
          onClose={() => setShowNotes(false)}
        />
      )}

      {showWeightTrend && (
        <div className="premium-card-static">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">ניתוח מגמות משקל</h3>
            <button
              onClick={() => setShowWeightTrend(false)}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
          <WeightTrendAnalysis traineeId={trainee.id} traineeName={trainee.name} />
        </div>
      )}

      {showWeightGoals && (
        <div className="premium-card-static">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">יעדי משקל</h3>
            <button
              onClick={() => setShowWeightGoals(false)}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
          <WeightGoalsManager
            traineeId={trainee.id}
            traineeName={trainee.name}
            currentWeight={latestMeasurement?.weight}
            onGoalUpdated={() => {}}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="premium-card-static h-full">
          <div className="p-5 border-b border-zinc-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-400" />
              <h3 className="text-base font-semibold text-white">אימונים אחרונים</h3>
            </div>
            {onViewWorkouts && workouts.length > 0 && (
              <button
                onClick={onViewWorkouts}
                className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                כל האימונים
              </button>
            )}
          </div>
          <div className="p-5">
            {workouts.length > 0 ? (
              <div className="space-y-3">
                {workouts.slice(0, 3).map((workout, index) => (
                  <div
                    key={workout.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30 hover:border-zinc-600/50 transition-all animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div>
                      <p className="font-medium text-white">{new Date(workout.date).toLocaleDateString('he-IL')}</p>
                      <p className="text-sm text-zinc-500">{workout.exercises.length} תרגילים</p>
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-bold text-emerald-400">{workout.totalVolume.toLocaleString()}</p>
                      <p className="text-xs text-zinc-500">ק״ג נפח</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-3">
                  <Calendar className="h-6 w-6 text-zinc-600" />
                </div>
                <p className="text-zinc-500">אין אימונים עדיין</p>
              </div>
            )}
          </div>
        </div>

        <div className="premium-card-static h-full">
          <div className="p-5 border-b border-zinc-800/50">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-cyan-400" />
              <h3 className="text-base font-semibold text-white">מדידות אחרונות</h3>
            </div>
          </div>
          <div className="p-5">
            {measurements.length > 0 ? (
              <div className="space-y-3">
                {measurements.slice(0, 3).map((measurement, index) => (
                  <div
                    key={measurement.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30 hover:border-zinc-600/50 transition-all animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div>
                      <p className="font-medium text-white">{new Date(measurement.date).toLocaleDateString('he-IL')}</p>
                      <p className="text-sm text-zinc-500">{measurement.source === 'tanita' ? 'Tanita' : 'ידני'}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-bold text-cyan-400">{measurement.weight} ק״ג</p>
                      {measurement.bodyFat && (
                        <p className="text-xs text-zinc-500">{measurement.bodyFat.toFixed(1)}% שומן</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-3">
                  <Scale className="h-6 w-6 text-zinc-600" />
                </div>
                <p className="text-zinc-500">אין מדידות עדיין</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selfWeights.length > 0 && (
        <div className="premium-card-static">
          <div className="p-5 border-b border-zinc-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/15">
                <Home className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">שקילות מהבית</h3>
                <p className="text-sm text-zinc-500">משקלים שהמתאמן דיווח</p>
              </div>
            </div>
            {selfWeights.some(sw => !sw.is_seen_by_trainer) && onMarkSelfWeightsSeen && (
              <button
                onClick={onMarkSelfWeightsSeen}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 rounded-xl text-sm font-medium transition-all border border-cyan-500/30"
              >
                <CheckCircle className="h-4 w-4" />
                סמן כנראה
              </button>
            )}
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {selfWeights.slice(0, 5).map((sw, index) => (
                <div
                  key={sw.id}
                  className={`flex items-center justify-between p-4 rounded-xl transition-all animate-fade-in ${
                    sw.is_seen_by_trainer
                      ? 'bg-zinc-800/30 border border-zinc-700/30'
                      : 'bg-cyan-500/10 border border-cyan-500/30'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    {!sw.is_seen_by_trainer && (
                      <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse"></span>
                    )}
                    <div>
                      <p className="font-medium text-white">
                        {new Date(sw.weight_date).toLocaleDateString('he-IL')}
                      </p>
                      {sw.notes && (
                        <p className="text-sm text-zinc-500">{sw.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-bold text-cyan-400">{sw.weight_kg} ק״ג</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {trainee.notes && (
        <div className="premium-card-static p-6 border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <h3 className="text-lg font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            הערות מאמן
          </h3>
          <p className="text-zinc-300 leading-relaxed">{trainee.notes}</p>
        </div>
      )}
    </div>
  );
}
