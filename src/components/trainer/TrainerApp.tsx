import { useState, useEffect, useCallback, Suspense, lazy, useMemo } from 'react';
import { Home, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryClient';
import { logger } from '../../utils/logger';
import { useGlobalScaleListener, IdentifiedReading } from '../../hooks/useGlobalScaleListener';
import { ScaleReading } from '../../hooks/useScaleListener';
import { useTrainerAppData } from './hooks/useTrainerAppData';
import { convertTraineeToDisplayFormat } from './utils/traineeDisplayFormat';
import Header from '../layout/Header';
import Sidebar from '../layout/Sidebar';
import MobileSidebar from '../layout/MobileSidebar';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ThemeShowcase } from '../ui/ThemeShowcase';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

const Dashboard = lazyWithRetry(() => import('./Dashboard/Dashboard'), 3);
const TraineesList = lazy(() => import('./Trainees/TraineesList'));
const TraineeProfile = lazy(() => import('./Trainees/TraineeProfile'));
const AddTraineeForm = lazy(() => import('./Trainees/AddTraineeForm'));
const EditTraineeForm = lazy(() => import('./Trainees/EditTraineeForm'));
const WorkoutSession = lazy(() => import('./Workouts/WorkoutSession'));
const PreparedWorkoutSession = lazy(() => import('./Workouts/PreparedWorkoutSession'));
const WorkoutsList = lazy(() => import('./Workouts/WorkoutsList'));
const WorkoutDetails = lazy(() => import('./Workouts/WorkoutDetails'));
const WorkoutProgress = lazy(() => import('./Workouts/WorkoutProgress'));
const WorkoutTypeSelection = lazy(() => import('./Workouts/WorkoutTypeSelection'));
const PairWorkoutSession = lazy(() => import('./Workouts/PairWorkoutSession'));
const MeasurementForm = lazy(() => import('./Measurements/MeasurementForm'));
const MeasurementsView = lazy(() => import('./Measurements/MeasurementsView'));
const WorkoutPlanBuilder = lazy(() => import('./WorkoutPlans/WorkoutPlanBuilder'));
const MealPlanBuilder = lazy(() => import('./MealPlans/MealPlanBuilder'));
const TraineeAccessManager = lazy(() => import('./Trainees/TraineeAccessManager'));
const MentalToolsEditor = lazy(() => import('./MentalTools/MentalToolsEditor'));
const CalendarView = lazy(() => import('./Calendar/CalendarView'));
const ToolsView = lazy(() => import('./Tools/ToolsView'));
const TraineeFoodDiaryView = lazy(() => import('./Trainees/TraineeFoodDiaryView'));
const CardioManager = lazy(() => import('./Cardio/CardioManager'));
const ReportsView = lazy(() => import('./Reports/ReportsView'));
const SmartReportView = lazy(() => import('./Reports/SmartReportView'));
const HealthCheckView = lazy(() => import('../settings/HealthCheckView'));
const ErrorReportingSettings = lazy(() => import('../settings/ErrorReportingSettings'));
const StudioTvView = lazy(() => import('./Studio/StudioTvView'));

interface Trainee {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  gender: 'male' | 'female' | null;
  birth_date: string | null;
  height: number | null;
  start_date: string;
  notes: string;
  is_pair?: boolean;
  pair_name_1?: string;
  pair_name_2?: string;
  pair_phone_1?: string;
  pair_phone_2?: string;
  pair_email_1?: string;
  pair_email_2?: string;
  pair_gender_1?: 'male' | 'female';
  pair_gender_2?: 'male' | 'female';
  pair_birth_date_1?: string;
  pair_birth_date_2?: string;
  pair_height_1?: number;
  pair_height_2?: number;
  [key: string]: unknown;
}

interface TrainerAppProps {
  isTablet?: boolean;
}

async function fetchWorkoutExercises(workoutId: string) {
  const { data } = await supabase
    .from('workout_exercises')
    .select(`
      id, exercise_id, order_index,
      exercises (id, name, muscle_group_id),
      exercise_sets (
        id, set_number, weight, reps, rpe, set_type,
        superset_exercise_id, superset_weight, superset_reps,
        dropset_weight, dropset_reps
      )
    `)
    .eq('workout_id', workoutId)
    .order('order_index', { ascending: true });

  if (!data) return [];
  return data.map((we: any) => ({
    tempId: we.id,
    exercise: { id: we.exercises.id, name: we.exercises.name, muscle_group_id: we.exercises.muscle_group_id },
    sets: (we.exercise_sets || [])
      .sort((a: any, b: any) => a.set_number - b.set_number)
      .map((set: any) => ({
        id: set.id, set_number: set.set_number, weight: set.weight, reps: set.reps, rpe: set.rpe,
        set_type: set.set_type as 'regular' | 'superset' | 'dropset',
        superset_exercise_id: set.superset_exercise_id, superset_weight: set.superset_weight,
        superset_reps: set.superset_reps, dropset_weight: set.dropset_weight, dropset_reps: set.dropset_reps,
      })),
  }));
}

export default function TrainerApp({ isTablet }: TrainerAppProps) {
  const { signOut, user } = useAuth();
  const appData = useTrainerAppData();
  const queryClient = useQueryClient();

  const {
    trainees, selectedTrainee, selectTrainee,
    trainerName, loading,
    workouts, measurements, selfWeights,
    unseenWeightsCounts,
    handleSaveTrainee, handleDeleteTrainee: deleteTrainee,
    handleDeleteWorkout: deleteWorkout, handleDuplicateWorkout: duplicateWorkout,
    handleSaveScaleMeasurement, handleMarkSelfWeightsSeen,
    refreshWorkouts, refreshMeasurements, refreshTrainees,
  } = appData;

  const initialView = typeof window !== 'undefined' && window.location.pathname === '/tv'
    ? 'studio-tv'
    : 'dashboard';
  const [activeView, setActiveView] = useState(initialView);
  const [selectedWorkout, setSelectedWorkout] = useState<any | null>(null);
  const [previousWorkoutForNew, setPreviousWorkoutForNew] = useState<any | null>(null);
  const [editingMeasurement, setEditingMeasurement] = useState<any | null>(null);
  const [selectedPairMember, setSelectedPairMember] = useState<'member_1' | 'member_2' | null>(null);
  const [initialTraineeName, setInitialTraineeName] = useState<string | undefined>(undefined);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (activeView === 'studio-tv') {
      document.body.classList.add('tv-mode-active');
      document.documentElement.classList.add('tv-mode-active');
    } else {
      document.body.classList.remove('tv-mode-active');
      document.documentElement.classList.remove('tv-mode-active');
    }
    return () => {
      document.body.classList.remove('tv-mode-active');
      document.documentElement.classList.remove('tv-mode-active');
    };
  }, [activeView]);

  const handleScaleReading = useCallback((reading: IdentifiedReading) => {
    const weight = reading.reading.weight_kg?.toFixed(1);
    const bodyFat = reading.reading.body_fat_percent?.toFixed(1);

    if (reading.bestMatch) {
      toast.custom(
        (t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full glass-card shadow-dark-lg pointer-events-auto flex`} dir="rtl">
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-lime-500 to-lime-600 flex items-center justify-center shadow-glow-sm">
                    <span className="text-dark-500 font-bold text-lg">{reading.bestMatch!.traineeName.charAt(0)}</span>
                  </div>
                </div>
                <div className="mr-3 flex-1">
                  <p className="text-sm font-medium text-foreground">שקילה חדשה - {reading.bestMatch!.traineeName}</p>
                  <p className="mt-1 text-sm text-muted">{weight} ק"ג{bodyFat && ` | ${bodyFat}% שומן`}</p>
                  <p className="mt-1 text-xs text-lime-500">דיוק: {reading.bestMatch!.confidenceScore}%</p>
                </div>
              </div>
            </div>
            <div className="flex border-r border-white/10">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  const trainee = trainees.find((tr: Trainee) => tr.id === reading.bestMatch!.traineeId);
                  if (trainee) handleTraineeClick(trainee);
                }}
                className="w-full border border-transparent rounded-none rounded-l-2xl p-4 flex items-center justify-center text-sm font-medium text-lime-500 hover:text-lime-400 hover:bg-white/5 focus:outline-none transition-colors"
              >
                פתח
              </button>
            </div>
          </div>
        ),
        { duration: 8000 }
      );
    } else {
      toast.custom(
        (t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full glass-card shadow-dark-lg pointer-events-auto flex`} dir="rtl">
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <span className="text-amber-400 font-bold text-lg">?</span>
                  </div>
                </div>
                <div className="mr-3 flex-1">
                  <p className="text-sm font-medium text-foreground">שקילה חדשה - לא זוהה</p>
                  <p className="mt-1 text-sm text-muted">{weight} ק"ג{bodyFat && ` | ${bodyFat}% שומן`}</p>
                  <p className="mt-1 text-xs text-amber-400">לא נמצאה התאמה למתאמן</p>
                </div>
              </div>
            </div>
            <div className="flex border-r border-white/10">
              <button onClick={() => toast.dismiss(t.id)} className="w-full border border-transparent rounded-none rounded-l-2xl p-4 flex items-center justify-center text-sm font-medium text-muted hover:text-foreground hover:bg-white/5 focus:outline-none transition-colors">
                סגור
              </button>
            </div>
          </div>
        ),
        { duration: 6000 }
      );
    }
  }, [trainees]);

  const { recentReadings, isListening: isScaleListening } = useGlobalScaleListener(
    user?.id || null,
    handleScaleReading
  );

  const handleViewChange = useCallback((view: string) => {
    setActiveView(view);
    if (!['trainee-profile', 'workout-session', 'measurement-form', 'measurements-view'].includes(view)) {
      selectTrainee(null);
    }
  }, [selectTrainee]);

  const handleTraineeClick = useCallback((trainee: Trainee) => {
    selectTrainee(trainee.id);
    setActiveView('trainee-profile');
  }, [selectTrainee]);

  const handleNavigateToTrainee = useCallback((traineeId: string, tab?: string) => {
    selectTrainee(traineeId);
    setActiveView(tab === 'food_diary' ? 'food-diary' : 'trainee-profile');
  }, [selectTrainee]);

  const handleSaveNewTrainee = useCallback(async (traineeData: any) => {
    const result = await handleSaveTrainee(traineeData);
    if (result) setActiveView('trainees');
  }, [handleSaveTrainee]);

  const handleDeleteTrainee = useCallback(async (traineeId: string) => {
    const confirmed = window.confirm('האם אתה בטוח שברצונך למחוק מתאמן זה? הפעולה אינה ניתנת לביטול!');
    if (!confirmed) return;
    await deleteTrainee(traineeId);
    setActiveView('trainees');
    selectTrainee(null);
  }, [deleteTrainee, selectTrainee]);

  const handleNewWorkout = useCallback((trainee: Trainee, scheduledWorkoutId?: string) => {
    selectTrainee(trainee.id);
    if (scheduledWorkoutId) {
      loadScheduledWorkoutForEditing(scheduledWorkoutId, trainee);
    } else if (trainee.is_pair) {
      setActiveView('workout-type-selection');
    } else {
      setActiveView('workout-session');
    }
  }, [selectTrainee]);

  const handleNewPreparedWorkout = useCallback((trainee: Trainee, scheduledWorkoutId?: string) => {
    selectTrainee(trainee.id);
    if (scheduledWorkoutId) {
      loadScheduledWorkoutForEditing(scheduledWorkoutId, trainee, true);
    } else {
      setActiveView('prepared-workout-session');
    }
  }, [selectTrainee]);

  const loadScheduledWorkoutForEditing = async (workoutId: string, trainee: Trainee, isPrepared = false) => {
    try {
      const exercises = await fetchWorkoutExercises(workoutId);
      setSelectedWorkout({ id: workoutId, exercises });
      if (isPrepared) setActiveView('prepared-workout-session');
      else if (trainee.is_pair) setActiveView('workout-type-selection');
      else setActiveView('workout-session');
    } catch (err) {
      logger.error('Error loading scheduled workout for editing:', err, 'TrainerApp');
      toast.error('שגיאה בטעינת האימון המתוזמן');
      if (isPrepared) setActiveView('prepared-workout-session');
      else if (trainee.is_pair) setActiveView('workout-type-selection');
      else setActiveView('workout-session');
    }
  };

  const handleEditWorkout = useCallback(async (workout: any) => {
    if (!selectedTrainee) return;
    const exercises = await fetchWorkoutExercises(workout.id);
    setSelectedWorkout({ ...workout, exercises });
    setActiveView('workout-session');
  }, [selectedTrainee]);

  const handleNewWorkoutFromExisting = useCallback(async (workout: any) => {
    if (!selectedTrainee) return;
    const { data: workoutExercises } = await supabase
      .from('workout_exercises')
      .select(`id, exercise_id, order_index, exercises (id, name, muscle_group_id), exercise_sets (id, set_number, weight, reps, rpe, set_type, superset_exercise_id, superset_weight, superset_reps, dropset_weight, dropset_reps)`)
      .eq('workout_id', workout.id)
      .order('order_index', { ascending: true });
    if (workoutExercises) {
      setPreviousWorkoutForNew({
        id: workout.id,
        date: workout.date,
        workout_exercises: workoutExercises.map((we: any) => ({
          id: we.id, exercise_id: we.exercise_id, order_index: we.order_index,
          exercises: we.exercises, exercise_sets: we.exercise_sets,
        })),
      });
      setActiveView(selectedTrainee.is_pair ? 'workout-type-selection' : 'workout-session');
    }
  }, [selectedTrainee]);

  const handleDuplicateWorkout = useCallback(async (workout: any) => {
    await duplicateWorkout(workout.id);
  }, [duplicateWorkout]);

  const handleDeleteWorkout = useCallback(async (workoutId: string) => {
    const confirmed = window.confirm('האם אתה בטוח שברצונך למחוק אימון זה?');
    if (!confirmed) return;
    await deleteWorkout(workoutId);
    setActiveView('workouts-list');
  }, [deleteWorkout]);

  const handleQuickEditLastWorkout = useCallback(async (traineeId: string) => {
    if (!user) return;
    try {
      const { data: lastWorkout, error } = await supabase
        .from('workout_trainees')
        .select(`workout_id, workouts!inner (id, workout_date, is_completed, trainer_id)`)
        .eq('trainee_id', traineeId)
        .eq('workouts.is_completed', true)
        .eq('workouts.trainer_id', user.id)
        .order('workouts.workout_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !lastWorkout) { toast.error('לא נמצא אימון אחרון לעריכה'); return; }
      const workout = Array.isArray(lastWorkout.workouts) ? lastWorkout.workouts[0] : lastWorkout.workouts;
      if (workout?.id) {
        selectTrainee(traineeId);
        await handleEditWorkout({ id: workout.id });
      }
    } catch (err) {
      logger.error('Error loading last workout for quick edit:', err, 'TrainerApp');
      toast.error('שגיאה בטעינת האימון האחרון');
    }
  }, [user, handleEditWorkout, selectTrainee]);

  const handleQuickCreateTrainee = useCallback(async (name: string) => {
    const result = await handleSaveTrainee({ full_name: name.trim(), status: 'active' });
    return result?.id || null;
  }, [handleSaveTrainee]);

  const handleWorkoutSaved = useCallback(async () => {
    refreshWorkouts();
    setSelectedWorkout(null);
    setPreviousWorkoutForNew(null);
    setSelectedPairMember(null);
    setActiveView(selectedWorkout ? 'workouts-list' : 'trainee-profile');
  }, [refreshWorkouts, selectedWorkout]);

  const handleMeasurementSaved = useCallback(async () => {
    refreshMeasurements();
    setEditingMeasurement(null);
    setActiveView('measurements-view');
  }, [refreshMeasurements]);

  const traineeDisplay = useMemo(() => {
    return selectedTrainee ? convertTraineeToDisplayFormat(selectedTrainee) : null;
  }, [selectedTrainee]);

  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-lime-500 to-lime-600 flex items-center justify-center shadow-glow animate-pulse">
              <Users className="w-7 h-7 text-dark-500" />
            </div>
            <p className="mt-4 text-theme-muted">טוען נתונים...</p>
          </div>
        </div>
      );
    }

    switch (activeView) {
      case 'dashboard':
        return (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <Dashboard
              onViewChange={handleViewChange}
              trainees={trainees}
              trainerName={trainerName}
              onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
              onToggleHeader={() => setHeaderCollapsed(!headerCollapsed)}
              scaleReadings={recentReadings}
              isScaleListening={isScaleListening}
              onTraineeClick={(traineeId: string) => {
                const trainee = trainees.find((t: Trainee) => t.id === traineeId);
                if (trainee) handleTraineeClick(trainee);
              }}
              onSaveMeasurement={handleSaveScaleMeasurement}
              onNewWorkout={handleNewWorkout}
              onNewPreparedWorkout={handleNewPreparedWorkout}
              onViewWorkoutPlan={(trainee: Trainee) => { selectTrainee(trainee.id); setActiveView('workout-plans'); }}
              onViewMealPlan={(trainee: Trainee) => { selectTrainee(trainee.id); setActiveView('meal-plans'); }}
            />
          </Suspense>
        );

      case 'trainees':
        return (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <TraineesList
              trainees={trainees}
              onTraineeClick={handleTraineeClick}
              onAddTrainee={() => setActiveView('add-trainee')}
              onQuickEdit={handleQuickEditLastWorkout}
              unseenWeightsCounts={unseenWeightsCounts}
            />
          </Suspense>
        );

      case 'trainee-profile':
        return selectedTrainee && traineeDisplay ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <TraineeProfile
              trainee={traineeDisplay}
              workouts={workouts}
              measurements={measurements}
              selfWeights={selfWeights}
              onBack={() => { selectTrainee(null); setSelectedWorkout(null); setActiveView('trainees'); }}
              onEdit={() => setActiveView('edit-trainee')}
              onNewWorkout={() => handleNewWorkout(selectedTrainee)}
              onNewMeasurement={() => { setEditingMeasurement(null); setActiveView('measurement-form'); }}
              onViewMeasurements={() => setActiveView('measurements-view')}
              onViewWorkouts={() => setActiveView('workouts-list')}
              onViewProgress={() => setActiveView('workout-progress')}
              onDelete={() => handleDeleteTrainee(selectedTrainee.id)}
              onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
              onToggleHeader={() => setHeaderCollapsed(!headerCollapsed)}
              onViewWorkoutPlans={() => setActiveView('workout-plans')}
              onViewMealPlans={() => setActiveView('meal-plans')}
              onViewFoodDiary={() => setActiveView('food-diary')}
              onViewTraineeAccess={() => setActiveView('trainee-access')}
              onMarkSelfWeightsSeen={handleMarkSelfWeightsSeen}
              onViewMentalTools={() => setActiveView('mental-tools')}
              onViewCardio={() => setActiveView('cardio-manager')}
              onDuplicateWorkout={handleNewWorkoutFromExisting}
            />
          </Suspense>
        ) : null;

      case 'add-trainee':
        return (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <AddTraineeForm
              onBack={() => { setInitialTraineeName(undefined); setActiveView('trainees'); }}
              onSave={(trainee: any) => { setInitialTraineeName(undefined); handleSaveNewTrainee(trainee); }}
              initialName={initialTraineeName}
            />
          </Suspense>
        );

      case 'edit-trainee':
        return selectedTrainee && traineeDisplay ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <EditTraineeForm
              trainee={traineeDisplay}
              onBack={() => setActiveView('trainee-profile')}
              onSave={async () => { refreshTrainees(); setActiveView('trainee-profile'); }}
            />
          </Suspense>
        ) : null;

      case 'workout-type-selection':
        return selectedTrainee?.is_pair && traineeDisplay ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <WorkoutTypeSelection
              trainee={traineeDisplay}
              onSelectPersonal={(memberIndex: 1 | 2) => { setSelectedPairMember(memberIndex === 1 ? 'member_1' : 'member_2'); setActiveView('workout-session'); }}
              onSelectPair={() => setActiveView('pair-workout-session')}
              onBack={() => setActiveView('trainee-profile')}
            />
          </Suspense>
        ) : null;

      case 'prepared-workout-session':
        return selectedTrainee && traineeDisplay ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <PreparedWorkoutSession
              trainee={traineeDisplay}
              initialSelectedMember={selectedPairMember}
              isTablet={isTablet}
              scheduledWorkoutId={selectedWorkout?.id}
              editingWorkout={selectedWorkout ? { id: selectedWorkout.id, exercises: selectedWorkout.exercises || [] } : undefined}
              onBack={() => { setActiveView(selectedWorkout ? 'workouts-list' : 'trainee-profile'); setSelectedPairMember(null); }}
              onSave={handleWorkoutSaved}
              previousWorkout={previousWorkoutForNew || undefined}
            />
          </Suspense>
        ) : null;

      case 'pair-workout-session':
        return selectedTrainee?.is_pair && traineeDisplay ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <PairWorkoutSession
              trainee={traineeDisplay}
              onBack={() => setActiveView('trainee-profile')}
              onComplete={async () => { refreshWorkouts(); setActiveView('trainee-profile'); }}
              isTablet={isTablet}
            />
          </Suspense>
        ) : null;

      case 'workout-session':
        return selectedTrainee && traineeDisplay ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <WorkoutSession
              trainee={traineeDisplay}
              initialSelectedMember={selectedPairMember}
              isTablet={isTablet}
              onBack={() => { setActiveView(selectedWorkout ? 'workouts-list' : 'trainee-profile'); setSelectedPairMember(null); }}
              onSave={handleWorkoutSaved}
              previousWorkout={previousWorkoutForNew || undefined}
              editingWorkout={selectedWorkout ? { id: selectedWorkout.id, exercises: selectedWorkout.exercises || [] } : undefined}
            />
          </Suspense>
        ) : null;

      case 'measurement-form':
        return selectedTrainee && traineeDisplay ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <MeasurementForm
              trainee={traineeDisplay}
              onBack={() => setActiveView('trainee-profile')}
              onSave={handleMeasurementSaved}
              previousMeasurement={undefined}
              editingMeasurement={editingMeasurement}
            />
          </Suspense>
        ) : null;

      case 'measurements-view':
        return selectedTrainee && traineeDisplay ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <MeasurementsView
              trainee={traineeDisplay}
              measurements={measurements}
              onNewMeasurement={() => { setEditingMeasurement(null); setActiveView('measurement-form'); }}
              onEditMeasurement={(m: any) => { setEditingMeasurement(m); setActiveView('measurement-form'); }}
              onMeasurementDeleted={refreshMeasurements}
              onRefresh={refreshMeasurements}
              onBack={() => setActiveView('trainee-profile')}
            />
          </Suspense>
        ) : null;

      case 'workouts-list':
        return selectedTrainee && traineeDisplay ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <WorkoutsList
              trainee={traineeDisplay}
              workouts={workouts}
              onBack={() => { setActiveView('trainee-profile'); }}
              onViewWorkout={(w: any) => { setSelectedWorkout(w); setActiveView('workout-details'); }}
              onEditWorkout={handleEditWorkout}
              onDuplicateWorkout={handleDuplicateWorkout}
              onWorkoutsUpdated={refreshWorkouts}
              onRefresh={refreshWorkouts}
            />
          </Suspense>
        ) : null;

      case 'workout-details':
        return selectedTrainee && selectedWorkout && traineeDisplay ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <WorkoutDetails
              workoutId={selectedWorkout.id}
              trainee={traineeDisplay}
              onBack={() => setActiveView('workouts-list')}
              onEdit={() => handleEditWorkout(selectedWorkout)}
              onDuplicate={() => handleDuplicateWorkout(selectedWorkout)}
              onDelete={() => handleDeleteWorkout(selectedWorkout.id)}
            />
          </Suspense>
        ) : null;

      case 'workout-progress':
        return selectedTrainee && traineeDisplay ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <WorkoutProgress trainee={traineeDisplay} onBack={() => setActiveView('trainee-profile')} />
          </Suspense>
        ) : null;

      case 'workout-plans':
        return selectedTrainee ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <WorkoutPlanBuilder traineeId={selectedTrainee.id} traineeName={selectedTrainee.full_name} onBack={() => setActiveView('trainee-profile')} />
          </Suspense>
        ) : null;

      case 'meal-plans':
        return selectedTrainee && user ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <MealPlanBuilder traineeId={selectedTrainee.id} traineeName={selectedTrainee.full_name} trainerId={user.id} onBack={() => setActiveView('trainee-profile')} />
          </Suspense>
        ) : null;

      case 'trainee-access':
        return selectedTrainee ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <TraineeAccessManager traineeId={selectedTrainee.id} traineeName={selectedTrainee.full_name} onBack={() => setActiveView('trainee-profile')} />
          </Suspense>
        ) : null;

      case 'mental-tools':
        return selectedTrainee ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <MentalToolsEditor traineeId={selectedTrainee.id} traineeName={selectedTrainee.full_name} onBack={() => setActiveView('trainee-profile')} />
          </Suspense>
        ) : null;

      case 'food-diary':
        return selectedTrainee ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <TraineeFoodDiaryView traineeId={selectedTrainee.id} traineeName={selectedTrainee.full_name} onBack={() => setActiveView('trainee-profile')} />
          </Suspense>
        ) : null;

      case 'cardio-manager':
        return selectedTrainee && user ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <CardioManager traineeId={selectedTrainee.id} trainerId={user.id} traineeName={selectedTrainee.full_name} onBack={() => setActiveView('trainee-profile')} />
          </Suspense>
        ) : null;

      case 'calendar':
        return (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <CalendarView
              onEventClick={(event: any) => toast(`אירוע: ${event.summary}`, { icon: '📅' })}
              onCreateWorkout={() => { setActiveView('trainees'); toast('בחר מתאמן ליצירת אימון חדש', { icon: '💪' }); }}
              onCreateTrainee={(name: string) => { setInitialTraineeName(name); setActiveView('add-trainee'); toast(`יוצר כרטיס מתאמן חדש: ${name}`, { icon: '👤' }); }}
              onQuickCreateTrainee={handleQuickCreateTrainee}
            />
          </Suspense>
        );

      case 'tools':
        return <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}><ToolsView /></Suspense>;
      case 'reports':
        return <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}><ReportsView /></Suspense>;
      case 'smart-report':
        return <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}><SmartReportView /></Suspense>;
      case 'health-check':
        return <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}><HealthCheckView /></Suspense>;
      case 'error-reporting':
        return <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}><ErrorReportingSettings /></Suspense>;
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center glass-card p-8 rounded-2xl">
              <h3 className="text-lg font-medium text-theme-primary mb-2">בפיתוח</h3>
              <p className="text-theme-muted">תכונה זו תהיה זמינה בקרוב</p>
            </div>
          </div>
        );
    }
  };

  const isWorkoutSession = activeView === 'workout-session' || activeView === 'pair-workout-session';
  const showCollapseControls = isWorkoutSession;
  const isThemeShowcase = import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('theme') === 'showcase';

  if (isThemeShowcase) return <ThemeShowcase />;

  if (activeView === 'studio-tv') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-zinc-950 to-black flex items-center justify-center"><LoadingSpinner size="lg" text="טוען מצב טלוויזיה..." /></div>}>
        <StudioTvView />
      </Suspense>
    );
  }

  return (
    <div className={`min-h-screen flex touch-manipulation ${isTablet ? 'tablet' : ''}`} dir="rtl">
      {!sidebarCollapsed && (
        <Sidebar activeView={activeView} onViewChange={handleViewChange} collapsed={sidebarCollapsed} isTablet={isTablet} />
      )}
      <MobileSidebar isOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} activeView={activeView} onViewChange={handleViewChange} />
      <div className="flex-1 flex flex-col pb-20 md:pb-0">
        {!headerCollapsed && (
          <Header onLogout={signOut} trainerName={trainerName} collapsed={headerCollapsed} onNavigateToTrainee={handleNavigateToTrainee} onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
        )}
        <main id="main-content" className={`flex-1 overflow-auto ${headerCollapsed ? 'p-2' : 'p-3 md:p-6'}`} role="main" aria-label="תוכן ראשי">
          {showCollapseControls && (
            <div className="hidden lg:flex gap-3 mb-4 justify-end" role="toolbar" aria-label="בקרות תצוגה">
              <button type="button" onClick={() => setHeaderCollapsed(!headerCollapsed)} className="btn-glass px-4 py-2 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50" aria-label={headerCollapsed ? 'הצג כותרת' : 'הסתר כותרת'} aria-pressed={!headerCollapsed}>
                {headerCollapsed ? 'הצג כותרת' : 'הסתר כותרת'}
              </button>
              <button type="button" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="btn-glass px-4 py-2 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50" aria-label={sidebarCollapsed ? 'הצג תפריט' : 'הסתר תפריט'} aria-pressed={!sidebarCollapsed}>
                {sidebarCollapsed ? 'הצג תפריט' : 'הסתר תפריט'}
              </button>
            </div>
          )}
          {renderMainContent()}
        </main>
        <nav id="main-navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-4" role="navigation" aria-label="ניווט ראשי">
          <div className="glass-card px-2 py-2 rounded-2xl shadow-dark-lg">
            <div className="flex justify-around items-center max-w-lg mx-auto">
              <button onClick={() => handleViewChange('dashboard')} aria-label="דף הבית" aria-current={activeView === 'dashboard' ? 'page' : undefined} className={`flex flex-col items-center px-4 py-2 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${activeView === 'dashboard' ? 'text-lime-500' : 'text-muted hover:text-foreground'}`}>
                <Home className={`h-6 w-6 mb-1 ${activeView === 'dashboard' ? 'drop-shadow-[0_0_8px_rgba(170,255,0,0.6)]' : ''}`} aria-hidden="true" />
                <span className="text-xs font-medium">בית</span>
              </button>
              <button onClick={() => handleViewChange('trainees')} aria-label="מתאמנים" aria-current={activeView.includes('trainee') ? 'page' : undefined} className={`flex flex-col items-center px-4 py-2 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${activeView.includes('trainee') ? 'text-lime-500' : 'text-muted hover:text-foreground'}`}>
                <Users className={`h-6 w-6 mb-1 ${activeView.includes('trainee') ? 'drop-shadow-[0_0_8px_rgba(170,255,0,0.6)]' : ''}`} aria-hidden="true" />
                <span className="text-xs font-medium">מתאמנים</span>
              </button>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
