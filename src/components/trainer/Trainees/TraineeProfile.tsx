import { ArrowRight, CreditCard as Edit, Calendar, Scale, BarChart3, User, Phone, Mail, Trash2, TrendingUp, ClipboardList, UtensilsCrossed, Key, Home, CheckCircle, Brain, BookOpen, Calculator, Sparkles, Users, Activity, History, FileText, CalendarDays, Bell, TrendingDown } from 'lucide-react';
import { Trainee, BodyMeasurement, Workout } from '../../../types';
import React, { useState } from 'react';
import TDEECalculator from '../Tools/TDEECalculator';
import TraineeTimeline from './TraineeTimeline';
import TraineeNotes from './TraineeNotes';
import CalendarSyncHistory from './CalendarSyncHistory';

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
}

type TabType = 'overview' | 'workouts' | 'measurements' | 'plans' | 'tools';

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
  onViewCardio
}: TraineeProfileProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showTDEE, setShowTDEE] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const latestMeasurement = measurements[0];
  const previousMeasurement = measurements[1];

  const weightChange = latestMeasurement && previousMeasurement
    ? latestMeasurement.weight - previousMeasurement.weight
    : 0;

  const totalWorkouts = workouts.length;
  const totalVolume = workouts.reduce((sum, w) => sum + (w.totalVolume || 0), 0);
  const recentWorkouts = workouts.slice(0, 5);
  const recentMeasurements = measurements.slice(0, 5);

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string; size?: number }> }[] = [
    { id: 'overview', label: 'סקירה', icon: Sparkles },
    { id: 'workouts', label: 'אימונים', icon: Calendar },
    { id: 'measurements', label: 'מדידות', icon: Scale },
    { id: 'plans', label: 'תוכניות', icon: ClipboardList },
    { id: 'tools', label: 'כלים', icon: Brain },
  ];

  return (
    <div className="space-y-6 pb-20 lg:pb-6 animate-fade-in">
      {/* Header */}
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
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center shadow-lg">
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

          {/* Info Cards */}
          {!trainee.is_pair ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30 hover:border-zinc-600/50 transition-all">
                <div className="p-2.5 rounded-xl bg-cyan-500/15">
                  <User className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">גיל</p>
                  <p className="font-semibold text-white">{trainee.age} שנים</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30 hover:border-zinc-600/50 transition-all">
                <div className="p-2.5 rounded-xl bg-emerald-500/15">
                  <Phone className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">טלפון</p>
                  <p className="font-semibold text-white" dir="ltr">{trainee.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30 hover:border-zinc-600/50 transition-all">
                <div className="p-2.5 rounded-xl bg-amber-500/15">
                  <Mail className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">אימייל</p>
                  <p className="font-semibold text-white text-sm truncate">{trainee.email || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30 hover:border-zinc-600/50 transition-all">
                <div className="p-2.5 rounded-xl bg-teal-500/15">
                  <Calendar className="h-5 w-5 text-teal-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">התחיל</p>
                  <p className="font-semibold text-white">{new Date(trainee.startDate).toLocaleDateString('he-IL')}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="premium-card-static p-5 border-cyan-500/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-cyan-500/15">
                      <User className="h-5 w-5 text-cyan-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-cyan-400">{trainee.pairName1}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-zinc-500">טלפון</p>
                      <p className="font-semibold text-white text-sm" dir="ltr">{trainee.pairPhone1 || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">אימייל</p>
                      <p className="font-semibold text-white text-sm truncate">{trainee.pairEmail1 || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">גובה</p>
                      <p className="font-semibold text-white">{trainee.pairHeight1 || '-'} ס״מ</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">מין</p>
                      <p className="font-semibold text-white">{trainee.pairGender1 === 'male' ? 'זכר' : 'נקבה'}</p>
                    </div>
                  </div>
                </div>

                <div className="premium-card-static p-5 border-amber-500/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-amber-500/15">
                      <User className="h-5 w-5 text-amber-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-amber-400">{trainee.pairName2}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-zinc-500">טלפון</p>
                      <p className="font-semibold text-white text-sm" dir="ltr">{trainee.pairPhone2 || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">אימייל</p>
                      <p className="font-semibold text-white text-sm truncate">{trainee.pairEmail2 || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">גובה</p>
                      <p className="font-semibold text-white">{trainee.pairHeight2 || '-'} ס״מ</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">מין</p>
                      <p className="font-semibold text-white">{trainee.pairGender2 === 'male' ? 'זכר' : 'נקבה'}</p>
                    </div>
                  </div>
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
          )}

          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800/30 text-zinc-400 hover:bg-zinc-700/30 border border-zinc-700/30'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Cards */}
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

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="premium-card-static p-4">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="h-5 w-5 text-emerald-400" />
                <span className="text-2xl font-bold text-emerald-400">{totalWorkouts}</span>
              </div>
              <p className="text-xs text-zinc-400">סה״כ אימונים</p>
            </div>
            <div className="premium-card-static p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-5 w-5 text-cyan-400" />
                <span className="text-2xl font-bold text-cyan-400">{totalVolume.toLocaleString()}</span>
              </div>
              <p className="text-xs text-zinc-400">ק״ג נפח כולל</p>
            </div>
            <div className="premium-card-static p-4">
              <div className="flex items-center justify-between mb-2">
                <Scale className="h-5 w-5 text-amber-400" />
                <span className="text-2xl font-bold text-amber-400">{measurements.length}</span>
              </div>
              <p className="text-xs text-zinc-400">מדידות</p>
            </div>
            <div className="premium-card-static p-4">
              <div className="flex items-center justify-between mb-2">
                <Home className="h-5 w-5 text-rose-400" />
                <span className="text-2xl font-bold text-rose-400">{selfWeights.length}</span>
              </div>
              <p className="text-xs text-zinc-400">שקילות בית</p>
            </div>
          </div>

          {/* Quick Actions */}
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
            onClick={() => setShowNotes(true)}
            className="action-btn group"
          >
            <div className="p-3 rounded-xl bg-orange-500/15 text-orange-400 mb-2 group-hover:bg-orange-500/25 transition-all">
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">הערות</span>
          </button>
            </div>
          </div>

          {/* Recent Activity */}
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
                    {recentWorkouts.map((workout, index) => (
                      <div
                        key={workout.id}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all animate-fade-in ${
                          workout.syncedFromGoogle 
                            ? 'bg-blue-900/20 border-blue-700/30 hover:border-blue-600/50' 
                            : 'bg-zinc-800/30 border-zinc-700/30 hover:border-zinc-600/50'
                        }`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div>
                          <p className="font-medium text-white flex items-center gap-2">
                            {new Date(workout.date).toLocaleDateString('he-IL')}
                            {workout.syncedFromGoogle && (
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">יומן</span>
                            )}
                          </p>
                          <p className="text-sm text-zinc-500">
                            {workout.syncedFromGoogle && workout.exercises.length === 0 
                              ? 'אימון מהיומן' 
                              : `${workout.exercises.length} תרגילים`}
                          </p>
                        </div>
                        <div className="text-left">
                          {workout.syncedFromGoogle && workout.totalVolume === 0 ? (
                            <div className="flex items-center gap-1 text-blue-400">
                              <Calendar className="h-4 w-4" />
                              <span className="text-sm">סונכרן</span>
                            </div>
                          ) : (
                            <>
                              <p className="text-lg font-bold text-emerald-400">{workout.totalVolume.toLocaleString()}</p>
                              <p className="text-xs text-zinc-500">ק״ג נפח</p>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-3">
                      <Calendar className="h-6 w-6 text-zinc-600" />
                    </div>
                    <p className="text-zinc-500 mb-3">אין אימונים עדיין</p>
                    <button
                      onClick={onNewWorkout}
                      className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all text-sm"
                    >
                      הוסף אימון ראשון
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="premium-card-static h-full">
              <div className="p-5 border-b border-zinc-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-base font-semibold text-white">מדידות אחרונות</h3>
                </div>
                {onViewMeasurements && measurements.length > 0 && (
                  <button
                    onClick={onViewMeasurements}
                    className="text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                  >
                    כל המדידות
                  </button>
                )}
              </div>
              <div className="p-5">
                {measurements.length > 0 ? (
                  <div className="space-y-3">
                    {recentMeasurements.map((measurement, index) => (
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
                    <p className="text-zinc-500 mb-3">אין מדידות עדיין</p>
                    <button
                      onClick={onNewMeasurement}
                      className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all text-sm"
                    >
                      הוסף מדידה ראשונה
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Self Weights */}
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

          {/* Notes */}
          {trainee.notes && (
            <div className="premium-card-static p-6 border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
              <h3 className="text-lg font-semibold text-amber-400 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                הערות מאמן
              </h3>
              <p className="text-zinc-300 leading-relaxed">{trainee.notes}</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'workouts' && (
        <>
          <div className="premium-card-static p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-400" />
                אימונים
              </h3>
              <button
                onClick={onNewWorkout}
                className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-all text-sm font-medium flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                אימון חדש
              </button>
            </div>
            {workouts.length > 0 ? (
              <div className="space-y-3">
                {workouts.map((workout, index) => (
                  <div
                    key={workout.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30 hover:border-zinc-600/50 transition-all"
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
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-zinc-600" />
                </div>
                <p className="text-zinc-500 mb-4">אין אימונים עדיין</p>
                <button
                  onClick={onNewWorkout}
                  className="px-6 py-3 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-all font-medium"
                >
                  הוסף אימון ראשון
                </button>
              </div>
            )}
          </div>

          {/* Calendar Sync History */}
          <CalendarSyncHistory 
            traineeId={trainee.id} 
            trainerId={trainee.trainerId} 
          />
        </>
      )}

      {activeTab === 'measurements' && (
        <div className="space-y-6">
          <div className="premium-card-static p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Scale className="h-5 w-5 text-cyan-400" />
                מדידות
              </h3>
              <button
                onClick={onNewMeasurement}
                className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition-all text-sm font-medium flex items-center gap-2"
              >
                <Scale className="h-4 w-4" />
                מדידה חדשה
              </button>
            </div>
            {measurements.length > 0 ? (
              <div className="space-y-3">
                {measurements.map((measurement, index) => (
                  <div
                    key={measurement.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30 hover:border-zinc-600/50 transition-all"
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
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                  <Scale className="h-8 w-8 text-zinc-600" />
                </div>
                <p className="text-zinc-500 mb-4">אין מדידות עדיין</p>
                <button
                  onClick={onNewMeasurement}
                  className="px-6 py-3 bg-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition-all font-medium"
                >
                  הוסף מדידה ראשונה
                </button>
              </div>
            )}
          </div>
          {selfWeights.length > 0 && (
            <div className="premium-card-static">
              <div className="p-5 border-b border-zinc-800/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Home className="h-5 w-5 text-cyan-400" />
                  <h3 className="text-base font-semibold text-white">שקילות מהבית</h3>
                </div>
                {selfWeights.some(sw => !sw.is_seen_by_trainer) && onMarkSelfWeightsSeen && (
                  <button
                    onClick={onMarkSelfWeightsSeen}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 rounded-xl text-sm font-medium transition-all"
                  >
                    <CheckCircle className="h-4 w-4" />
                    סמן כנראה
                  </button>
                )}
              </div>
              <div className="p-5">
                <div className="space-y-3">
                  {selfWeights.map((sw, index) => (
                    <div
                      key={sw.id}
                      className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                        sw.is_seen_by_trainer
                          ? 'bg-zinc-800/30 border border-zinc-700/30'
                          : 'bg-cyan-500/10 border border-cyan-500/30'
                      }`}
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
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="premium-card-static p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-emerald-400" />
            תוכניות
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {onViewWorkoutPlans && (
              <button
                onClick={onViewWorkoutPlans}
                className="p-6 rounded-xl bg-zinc-800/30 border border-zinc-700/30 hover:border-emerald-500/50 transition-all text-right"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 rounded-xl bg-rose-500/15 text-rose-400">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                  <h4 className="font-semibold text-white">תוכניות אימון</h4>
                </div>
                <p className="text-sm text-zinc-400">נהל תוכניות אימון שבועיות</p>
              </button>
            )}
            {onViewMealPlans && (
              <button
                onClick={onViewMealPlans}
                className="p-6 rounded-xl bg-zinc-800/30 border border-zinc-700/30 hover:border-orange-500/50 transition-all text-right"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 rounded-xl bg-orange-500/15 text-orange-400">
                    <UtensilsCrossed className="h-6 w-6" />
                  </div>
                  <h4 className="font-semibold text-white">תפריטים</h4>
                </div>
                <p className="text-sm text-zinc-400">נהל תוכניות תזונה</p>
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tools' && (
        <div className="premium-card-static p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Brain className="h-5 w-5 text-emerald-400" />
            כלים ופיצ'רים
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {onViewMentalTools && (
              <button
                onClick={onViewMentalTools}
                className="p-5 rounded-xl bg-zinc-800/30 border border-zinc-700/30 hover:border-pink-500/50 transition-all text-right"
              >
                <div className="p-3 rounded-xl bg-pink-500/15 text-pink-400 mb-3 w-fit">
                  <Brain className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-white mb-1">כלים מנטליים</h4>
                <p className="text-sm text-zinc-400">כלים פסיכולוגיים</p>
              </button>
            )}
            {onViewCardio && (
              <button
                onClick={onViewCardio}
                className="p-5 rounded-xl bg-zinc-800/30 border border-zinc-700/30 hover:border-sky-500/50 transition-all text-right"
              >
                <div className="p-3 rounded-xl bg-sky-500/15 text-sky-400 mb-3 w-fit">
                  <Activity className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-white mb-1">אירובי</h4>
                <p className="text-sm text-zinc-400">ניהול אימונים אירוביים</p>
              </button>
            )}
            {onViewFoodDiary && (
              <button
                onClick={onViewFoodDiary}
                className="p-5 rounded-xl bg-zinc-800/30 border border-zinc-700/30 hover:border-amber-500/50 transition-all text-right"
              >
                <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400 mb-3 w-fit">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-white mb-1">יומן אכילה</h4>
                <p className="text-sm text-zinc-400">עקוב אחר תזונה</p>
              </button>
            )}
            {onViewTraineeAccess && (
              <button
                onClick={onViewTraineeAccess}
                className="p-5 rounded-xl bg-zinc-800/30 border border-zinc-700/30 hover:border-sky-500/50 transition-all text-right"
              >
                <div className="p-3 rounded-xl bg-sky-500/15 text-sky-400 mb-3 w-fit">
                  <Key className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-white mb-1">גישה לאפליקציה</h4>
                <p className="text-sm text-zinc-400">ניהול הרשאות</p>
              </button>
            )}
            <button
              onClick={() => setShowTDEE(true)}
              className="p-5 rounded-xl bg-zinc-800/30 border border-zinc-700/30 hover:border-emerald-500/50 transition-all text-right"
            >
              <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400 mb-3 w-fit">
                <Calculator className="h-5 w-5" />
              </div>
              <h4 className="font-semibold text-white mb-1">מחשבון TDEE</h4>
              <p className="text-sm text-zinc-400">חישוב מטבוליזם</p>
            </button>
            <button
              onClick={() => setShowTimeline(true)}
              className="p-5 rounded-xl bg-zinc-800/30 border border-zinc-700/30 hover:border-blue-500/50 transition-all text-right"
            >
              <div className="p-3 rounded-xl bg-blue-500/15 text-blue-400 mb-3 w-fit">
                <History className="h-5 w-5" />
              </div>
              <h4 className="font-semibold text-white mb-1">ציר זמן</h4>
              <p className="text-sm text-zinc-400">היסטוריית פעילות</p>
            </button>
            <button
              onClick={() => setShowNotes(true)}
              className="p-5 rounded-xl bg-zinc-800/30 border border-zinc-700/30 hover:border-orange-500/50 transition-all text-right"
            >
              <div className="p-3 rounded-xl bg-orange-500/15 text-orange-400 mb-3 w-fit">
                <FileText className="h-5 w-5" />
              </div>
              <h4 className="font-semibold text-white mb-1">הערות</h4>
              <p className="text-sm text-zinc-400">הערות מאמן</p>
            </button>
          </div>
        </div>
      )}

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

      {showNotes && (
        <TraineeNotes
          traineeId={trainee.id}
          traineeName={trainee.name}
          onClose={() => setShowNotes(false)}
        />
      )}

    </div>
  );
}
