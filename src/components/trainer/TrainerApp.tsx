import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Home, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, logSupabaseError } from '../../lib/supabase';
import { logger } from '../../utils/logger';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useGlobalScaleListener, IdentifiedReading } from '../../hooks/useGlobalScaleListener';
import { ScaleReading } from '../../hooks/useScaleListener';
import { useTraineeData } from '../../hooks/useTraineeData';
import Header from '../layout/Header';
import Sidebar from '../layout/Sidebar';
import MobileSidebar from '../layout/MobileSidebar';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ThemeShowcase } from '../ui/ThemeShowcase';

// Lazy load heavy components - including main views for better code splitting
const Dashboard = lazy(() => import('./Dashboard/Dashboard'));
const TraineesList = lazy(() => import('./Trainees/TraineesList'));
const TraineeProfile = lazy(() => import('./Trainees/TraineeProfile'));
const AddTraineeForm = lazy(() => import('./Trainees/AddTraineeForm'));
const EditTraineeForm = lazy(() => import('./Trainees/EditTraineeForm'));
const WorkoutSession = lazy(() => import('./Workouts/WorkoutSession'));
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
// Settings & Management Components
const HealthCheckView = lazy(() => import('../settings/HealthCheckView'));
const ErrorReportingSettings = lazy(() => import('../settings/ErrorReportingSettings'));

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
}

interface TrainerAppProps {
  isTablet?: boolean;
}

export default function TrainerApp({ isTablet }: TrainerAppProps) {
  const { signOut, user } = useAuth();
  const { handleError } = useErrorHandler();
  const { loadTraineeData } = useTraineeData();
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<any | null>(null);
  const [editingMeasurement, setEditingMeasurement] = useState<any | null>(null);
  const [selectedPairMember, setSelectedPairMember] = useState<'member_1' | 'member_2' | null>(null);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [initialTraineeName, setInitialTraineeName] = useState<string | undefined>(undefined);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trainerName, setTrainerName] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selfWeights, setSelfWeights] = useState<any[]>([]);
  const [unseenWeightsCounts, setUnseenWeightsCounts] = useState<Map<string, number>>(new Map());

  const handleScaleReading = useCallback((reading: IdentifiedReading) => {
    const weight = reading.reading.weight_kg?.toFixed(1);
    const bodyFat = reading.reading.body_fat_percent?.toFixed(1);

    if (reading.bestMatch) {
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full glass-card shadow-dark-lg pointer-events-auto flex`}
            dir="rtl"
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-lime-500 to-lime-600 flex items-center justify-center shadow-glow-sm">
                    <span className="text-dark-500 font-bold text-lg">
                      {reading.bestMatch!.traineeName.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="mr-3 flex-1">
                  <p className="text-sm font-medium text-white">
                    שקילה חדשה - {reading.bestMatch!.traineeName}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    {weight} ק"ג
                    {bodyFat && ` | ${bodyFat}% שומן`}
                  </p>
                  <p className="mt-1 text-xs text-lime-500">
                    דיוק: {reading.bestMatch!.confidenceScore}%
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-r border-white/10">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  const trainee = trainees.find(tr => tr.id === reading.bestMatch!.traineeId);
                  if (trainee) {
                    handleTraineeClick(trainee);
                  }
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
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full glass-card shadow-dark-lg pointer-events-auto flex`}
            dir="rtl"
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <span className="text-amber-400 font-bold text-lg">?</span>
                  </div>
                </div>
                <div className="mr-3 flex-1">
                  <p className="text-sm font-medium text-white">
                    שקילה חדשה - לא זוהה
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    {weight} ק"ג
                    {bodyFat && ` | ${bodyFat}% שומן`}
                  </p>
                  <p className="mt-1 text-xs text-amber-400">
                    לא נמצאה התאמה למתאמן
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-r border-white/10">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-l-2xl p-4 flex items-center justify-center text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 focus:outline-none transition-colors"
              >
                סגור
              </button>
            </div>
          </div>
        ),
        { duration: 6000 }
      );
    }
  }, [trainees]);

  const handleSaveScaleMeasurement = useCallback(async (
    traineeId: string,
    traineeName: string,
    reading: ScaleReading,
    customDate?: string
  ): Promise<boolean> => {
    try {
      const measurementDate = customDate || new Date(reading.created_at).toISOString().split('T')[0];

      const { error: measurementError } = await supabase
        .from('measurements')
        .insert({
          trainee_id: traineeId,
          measurement_date: measurementDate,
          weight: reading.weight_kg,
          body_fat_percentage: reading.body_fat_percent,
          muscle_mass: reading.fat_free_mass_kg,
          water_percentage: reading.water_percent,
          bmi: reading.bmi,
          source: 'tanita',
          notes: reading.notes || '',
        });

      if (measurementError) {
        logger.error('Error saving measurement:', measurementError, 'TrainerApp');
        toast.error('שגיאה בשמירת המדידה');
        return false;
      }

      if (reading.notes) {
        const { error: notesError } = await supabase
          .from('scale_readings')
          .update({
            notes: reading.notes,
          })
          .eq('id', reading.id);
      }

      const { error: traineeUpdateError } = await supabase
        .from('trainees')
        .update({
          last_known_weight: reading.weight_kg,
          last_known_body_fat: reading.body_fat_percent,
        })
        .eq('id', traineeId);

      toast.success(`המדידה נשמרה עבור ${traineeName}`);
      return true;
    } catch (err) {
      logger.error('Error in handleSaveScaleMeasurement:', err, 'TrainerApp');
      toast.error('שגיאה בשמירת המדידה');
      return false;
    }
  }, []);

  const { recentReadings, isListening: isScaleListening } = useGlobalScaleListener(
    user?.id || null,
    handleScaleReading
  );

  useEffect(() => {
    if (!user) return;

    // Load all data in parallel for better performance
    Promise.all([
      loadTrainees(),
      loadTrainerProfile(),
      loadUnseenWeightsCounts(),
    ]).finally(() => {
      setLoading(false);
    });
  }, [user?.id]);

  const loadTrainees = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('trainees')
      .select('*')
      .eq('trainer_id', user.id)
      .neq('status', 'deleted') // Filter out deleted trainees
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTrainees(data);
    } else if (error) {
      logger.error('Error loading trainees:', error, 'TrainerApp');
    }
  }, [user?.id]);

  const loadTrainerProfile = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('trainers')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (!error && data) {
      setTrainerName(data.full_name);
    }
  }, [user?.id]);

  const loadUnseenWeightsCounts = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('trainee_self_weights')
      .select('trainee_id')
      .eq('is_seen_by_trainer', false);

    if (data) {
      const counts = new Map<string, number>();
      data.forEach((item) => {
        counts.set(item.trainee_id, (counts.get(item.trainee_id) || 0) + 1);
      });
      setUnseenWeightsCounts(counts);
    }
  }, [user?.id]);

  const loadSelfWeights = useCallback(async (traineeId: string) => {
    const { data, error } = await supabase
      .from('trainee_self_weights')
      .select('*')
      .eq('trainee_id', traineeId)
      .order('weight_date', { ascending: false });

    if (data) {
      setSelfWeights(data);
    }
  }, []);

  const loadMeasurements = useCallback(async (traineeId: string) => {
    const { data, error } = await supabase
      .from('measurements')
      .select('*')
      .eq('trainee_id', traineeId)
      .order('measurement_date', { ascending: false });

    if (!error && data) {
      const formattedMeasurements = data.map(m => ({
        id: m.id,
        traineeId: m.trainee_id,
        date: m.measurement_date,
        weight: m.weight || 0,
        bodyFat: m.body_fat_percentage || undefined,
        muscleMass: m.muscle_mass || undefined,
        waterPercentage: m.water_percentage || undefined,
        bmr: m.bmr || undefined,
        bmi: m.bmi || undefined,
        metabolicAge: m.metabolic_age || undefined,
        source: m.source as 'tanita' | 'manual',
        notes: m.notes || undefined,
        pairMember: m.pair_member as 'member_1' | 'member_2' | null,
        measurements: {
          chestBack: m.chest_back || 0,
          belly: m.belly || 0,
          glutes: m.glutes || 0,
          thigh: m.thigh || 0,
          rightArm: m.right_arm || 0,
          leftArm: m.left_arm || 0,
        }
      }));
      setMeasurements(formattedMeasurements);
    }
  }, []);

  const loadWorkouts = useCallback(async (traineeId: string) => {
    const { data: workoutTrainees, error } = await supabase
      .from('workout_trainees')
      .select(`
        workouts!inner (
          id,
          workout_date,
          is_completed,
          is_self_recorded,
          synced_from_google,
          google_event_summary,
          created_at,
          workout_exercises (
            id,
            exercises (
              name
            ),
            exercise_sets (
              id,
              weight,
              reps,
              superset_weight,
              superset_reps,
              dropset_weight,
              dropset_reps,
              superset_dropset_weight,
              superset_dropset_reps
            )
          )
        )
      `)
      .eq('trainee_id', traineeId)
      .eq('workouts.is_completed', true);

    if (!error && workoutTrainees) {
      const formattedWorkouts = workoutTrainees
        .filter(wt => wt.workouts)
        .map(wt => {
          const w = wt.workouts;
          const exercises = w.workout_exercises || [];
          const totalVolume = exercises.reduce((sum, ex) => {
            const sets = ex.exercise_sets || [];
            return sum + sets.reduce((setSum, set) => {
              let setVolume = (set.weight || 0) * (set.reps || 0);

              // Add superset volume
              if (set.superset_weight && set.superset_reps) {
                setVolume += set.superset_weight * set.superset_reps;
              }

              // Add dropset volume
              if (set.dropset_weight && set.dropset_reps) {
                setVolume += set.dropset_weight * set.dropset_reps;
              }

              // Add superset dropset volume
              if (set.superset_dropset_weight && set.superset_dropset_reps) {
                setVolume += set.superset_dropset_weight * set.superset_dropset_reps;
              }

              return setSum + setVolume;
            }, 0);
          }, 0);

          return {
            id: w.id,
            date: w.workout_date,
            exercises: exercises.map(ex => ({
              name: ex.exercises?.name || 'תרגיל',
              sets: ex.exercise_sets?.length || 0
            })),
            totalVolume,
            duration: 0,
            isSelfRecorded: w.is_self_recorded || false,
            syncedFromGoogle: w.synced_from_google || false,
            googleEventSummary: w.google_event_summary || null
          };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setWorkouts(formattedWorkouts);
    } else {
      setWorkouts([]);
    }
  }, []);

  const markSelfWeightsSeen = async () => {
    if (!selectedTrainee) return;

    await supabase
      .from('trainee_self_weights')
      .update({ is_seen_by_trainer: true })
      .eq('trainee_id', selectedTrainee.id)
      .eq('is_seen_by_trainer', false);

    await loadSelfWeights(selectedTrainee.id);
    await loadUnseenWeightsCounts();
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleHeader = () => {
    setHeaderCollapsed(!headerCollapsed);
  };

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  const convertTraineeToDisplayFormat = useCallback((trainee: Trainee) => {
    return {
      id: trainee.id,
      name: trainee.full_name,
      email: trainee.email || '',
      phone: trainee.phone || '',
      age: trainee.birth_date ? new Date().getFullYear() - new Date(trainee.birth_date).getFullYear() : 0,
      gender: (trainee.gender || 'male') as 'male' | 'female',
      height: trainee.height || 0,
      startDate: trainee.start_date,
      notes: trainee.notes || '',
      isPair: trainee.is_pair || false,
      pairName1: trainee.pair_name_1,
      pairName2: trainee.pair_name_2,
      pairPhone1: trainee.pair_phone_1,
      pairPhone2: trainee.pair_phone_2,
      pairEmail1: trainee.pair_email_1,
      pairEmail2: trainee.pair_email_2,
      pairGender1: trainee.pair_gender_1,
      pairGender2: trainee.pair_gender_2,
      pairBirthDate1: trainee.pair_birth_date_1,
      pairBirthDate2: trainee.pair_birth_date_2,
      pairHeight1: trainee.pair_height_1,
      pairHeight2: trainee.pair_height_2,
    };
  }, []);

  const handleViewChange = (view: string) => {
    setActiveView(view);
    if (!['trainee-profile', 'workout-session', 'measurement-form', 'measurements-view'].includes(view)) {
      setSelectedTrainee(null);
    }
  };

  const handleTraineeClick = useCallback(async (trainee: Trainee) => {
    setSelectedTrainee(trainee);
    setActiveView('trainee-profile');
    // Load all data in parallel for better performance
    await Promise.all([
      loadMeasurements(trainee.id),
      loadWorkouts(trainee.id),
      loadSelfWeights(trainee.id),
    ]);
  }, [loadMeasurements, loadWorkouts, loadSelfWeights]);

  const handleNavigateToTrainee = useCallback(async (traineeId: string, tab?: string) => {
    const trainee = trainees.find(t => t.id === traineeId);
    if (!trainee) return;

    setSelectedTrainee(trainee);
    // Load all data in parallel for better performance
    await Promise.all([
      loadMeasurements(trainee.id),
      loadWorkouts(trainee.id),
      loadSelfWeights(trainee.id),
    ]);

    if (tab === 'food_diary') {
      setActiveView('food-diary');
    } else {
      setActiveView('trainee-profile');
    }
  }, [trainees, loadMeasurements, loadWorkouts, loadSelfWeights]);

  const handleAddTrainee = () => {
    setActiveView('add-trainee');
  };

  const handleSaveTrainee = async (traineeData: any) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('trainees')
      .insert([
        {
          trainer_id: user.id,
          ...traineeData,
        },
      ])
      .select()
      .single();

    if (!error && data) {
      setTrainees((prev) => [data, ...prev]);
      setActiveView('trainees');
    }
  };

  const handleDeleteTrainee = async (traineeId: string) => {
    // Use a more professional confirmation dialog
    const confirmed = window.confirm('האם אתה בטוח שברצונך למחוק מתאמן זה? הפעולה אינה ניתנת לביטול!');
    if (!confirmed) {
      return;
    }

    try {
      // Use soft delete by setting status to 'deleted' instead of hard delete
      // This preserves historical data and avoids foreign key constraint issues
      const { error } = await supabase
        .from('trainees')
        .update({ status: 'deleted' })
        .eq('id', traineeId);

      if (!error) {
        setTrainees((prev) => prev.filter(t => t.id !== traineeId));
        setActiveView('trainees');
        setSelectedTrainee(null);
        toast.success('המתאמן נמחק בהצלחה');
      } else {
        throw error;
      }
    } catch (err) {
      logger.error('Error deleting trainee:', err, 'TrainerApp');
      toast.error('שגיאה במחיקת המתאמן');
    }
  };

  const handleNewWorkout = (trainee: Trainee) => {
    setSelectedTrainee(trainee);
    if (trainee.is_pair) {
      setActiveView('workout-type-selection');
    } else {
      setActiveView('workout-session');
    }
  };

  const handleViewWorkoutPlan = (trainee: Trainee) => {
    setSelectedTrainee(trainee);
    setActiveView('workout-plans');
  };

  const handleViewMealPlan = (trainee: Trainee) => {
    setSelectedTrainee(trainee);
    setActiveView('meal-plans');
  };

  const handleSelectPersonalWorkout = (memberIndex: 1 | 2) => {
    setSelectedPairMember(memberIndex === 1 ? 'member_1' : 'member_2');
    setActiveView('workout-session');
  };

  const handleSelectPairWorkout = () => {
    setActiveView('pair-workout-session');
  };

  const handleNewMeasurement = (trainee: Trainee) => {
    setSelectedTrainee(trainee);
    setEditingMeasurement(null);
    setActiveView('measurement-form');
  };

  const handleEditMeasurement = (measurement: any) => {
    setEditingMeasurement(measurement);
    setActiveView('measurement-form');
  };

  const handleViewMeasurements = async (trainee: Trainee) => {
    setSelectedTrainee(trainee);
    setActiveView('measurements-view');
    await loadMeasurements(trainee.id);
  };

  const handleViewProgress = (trainee: Trainee) => {
    setSelectedTrainee(trainee);
    setActiveView('workout-progress');
  };

  const handleBack = () => {
    setSelectedTrainee(null);
    setSelectedWorkout(null);
    setActiveView('trainees');
  };

  const handleViewWorkouts = async (trainee: Trainee) => {
    setSelectedTrainee(trainee);
    setActiveView('workouts-list');
    await loadWorkouts(trainee.id);
  };

  const handleViewWorkout = (workout: any) => {
    setSelectedWorkout(workout);
    setActiveView('workout-details');
  };

  const handleEditWorkout = async (workout: any) => {
    const { data: workoutExercises } = await supabase
      .from('workout_exercises')
      .select(`
        id,
        exercise_id,
        order_index,
        exercises (
          id,
          name,
          muscle_group_id
        ),
        exercise_sets (
          id,
          set_number,
          weight,
          reps,
          rpe,
          set_type,
          superset_exercise_id,
          superset_weight,
          superset_reps,
          dropset_weight,
          dropset_reps
        )
      `)
      .eq('workout_id', workout.id)
      .order('order_index', { ascending: true });

    if (workoutExercises && selectedTrainee) {
      const formattedExercises = workoutExercises.map((we) => ({
        tempId: we.id,
        exercise: {
          id: we.exercises.id,
          name: we.exercises.name,
          muscle_group_id: we.exercises.muscle_group_id,
        },
        sets: (we.exercise_sets || [])
          .sort((a, b) => a.set_number - b.set_number)
          .map((set) => ({
            id: set.id,
            set_number: set.set_number,
            weight: set.weight,
            reps: set.reps,
            rpe: set.rpe,
            set_type: set.set_type as 'regular' | 'superset' | 'dropset',
            superset_exercise_id: set.superset_exercise_id,
            superset_weight: set.superset_weight,
            superset_reps: set.superset_reps,
            dropset_weight: set.dropset_weight,
            dropset_reps: set.dropset_reps,
          })),
      }));

      setSelectedWorkout({
        ...workout,
        exercises: formattedExercises,
      });
      setActiveView('workout-session');
    }
  };

  const handleDuplicateWorkout = async (workout: any) => {
    if (!selectedTrainee || !user) return;

    const { data: workoutExercises } = await supabase
      .from('workout_exercises')
      .select(`
        exercise_id,
        order_index,
        exercises (
          id,
          name
        ),
        exercise_sets (
          set_number,
          weight,
          reps,
          rpe,
          set_type
        )
      `)
      .eq('workout_id', workout.id)
      .order('order_index', { ascending: true });

    if (!workoutExercises) {
      alert('שגיאה בטעינת האימון');
      return;
    }

    const { data: newWorkout, error: workoutError } = await supabase
      .from('workouts')
      .insert([
        {
          trainer_id: user.id,
          workout_date: new Date().toISOString().split('T')[0],
          workout_type: 'personal',
        },
      ])
      .select()
      .single();

    if (workoutError || !newWorkout) {
      alert('שגיאה ביצירת אימון חדש');
      return;
    }

    await supabase
      .from('workout_trainees')
      .insert([{ workout_id: newWorkout.id, trainee_id: selectedTrainee.id }]);

    for (const ex of workoutExercises) {
      const { data: newWorkoutExercise } = await supabase
        .from('workout_exercises')
        .insert([
          {
            workout_id: newWorkout.id,
            trainee_id: selectedTrainee.id,
            exercise_id: ex.exercise_id,
            order_index: ex.order_index,
          },
        ])
        .select()
        .single();

      if (newWorkoutExercise) {
        const setsToInsert = ex.exercise_sets.map((set) => ({
          workout_exercise_id: newWorkoutExercise.id,
          set_number: set.set_number,
          weight: set.weight,
          reps: set.reps,
          rpe: set.rpe,
          set_type: set.set_type,
        }));

        const { error: setsError } = await supabase.from('exercise_sets').insert(setsToInsert);
        if (setsError) {
          logSupabaseError(setsError, 'TrainerApp.duplicateWorkout.exercise_sets', { 
            table: 'exercise_sets',
            workoutId: workout.id,
          });
        }
      }
    }

    alert('האימון שוכפל בהצלחה!');
    await loadWorkouts(selectedTrainee.id);
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    const confirmed = window.confirm('האם אתה בטוח שברצונך למחוק אימון זה?');
    if (!confirmed) {
      return;
    }

    try {
      const { error } = await supabase.from('workouts').delete().eq('id', workoutId);

      if (!error) {
        if (selectedTrainee) {
          await loadWorkouts(selectedTrainee.id);
        }
        setActiveView('workouts-list');
        toast.success('האימון נמחק בהצלחה');
      } else {
        throw error;
      }
    } catch (err) {
      logger.error('Error deleting workout:', err, 'TrainerApp');
      toast.error('שגיאה במחיקת האימון');
    }
  };

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
            onToggleSidebar={toggleSidebar}
            onToggleHeader={toggleHeader}
            scaleReadings={recentReadings}
            isScaleListening={isScaleListening}
            onTraineeClick={(traineeId) => {
              const trainee = trainees.find(t => t.id === traineeId);
              if (trainee) {
                handleTraineeClick(trainee);
              }
            }}
            onSaveMeasurement={handleSaveScaleMeasurement}
            onNewWorkout={handleNewWorkout}
            onViewWorkoutPlan={handleViewWorkoutPlan}
            onViewMealPlan={handleViewMealPlan}
          />
          </Suspense>
        );

      case 'trainees':
        return (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <TraineesList
              trainees={trainees}
              onTraineeClick={handleTraineeClick}
              onAddTrainee={handleAddTrainee}
              unseenWeightsCounts={unseenWeightsCounts}
            />
          </Suspense>
        );

      case 'trainee-profile':
        return selectedTrainee ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <TraineeProfile
            trainee={convertTraineeToDisplayFormat(selectedTrainee)}
            workouts={workouts}
            measurements={measurements}
            selfWeights={selfWeights}
            onBack={handleBack}
            onEdit={() => setActiveView('edit-trainee')}
            onNewWorkout={() => handleNewWorkout(selectedTrainee)}
            onNewMeasurement={() => handleNewMeasurement(selectedTrainee)}
            onViewMeasurements={() => handleViewMeasurements(selectedTrainee)}
            onViewWorkouts={() => handleViewWorkouts(selectedTrainee)}
            onViewProgress={() => handleViewProgress(selectedTrainee)}
            onDelete={() => handleDeleteTrainee(selectedTrainee.id)}
            onToggleSidebar={toggleSidebar}
            onToggleHeader={toggleHeader}
            onViewWorkoutPlans={() => setActiveView('workout-plans')}
            onViewMealPlans={() => setActiveView('meal-plans')}
            onViewFoodDiary={() => setActiveView('food-diary')}
            onViewTraineeAccess={() => setActiveView('trainee-access')}
            onMarkSelfWeightsSeen={markSelfWeightsSeen}
            onViewMentalTools={() => setActiveView('mental-tools')}
            onViewCardio={() => setActiveView('cardio-manager')}
          />
          </Suspense>
        ) : null;

      case 'add-trainee':
        return (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <AddTraineeForm
              onBack={() => {
                setInitialTraineeName(undefined);
                setActiveView('trainees');
              }}
              onSave={(trainee) => {
                setInitialTraineeName(undefined);
                handleSaveTrainee(trainee);
              }}
              initialName={initialTraineeName}
            />
          </Suspense>
        );

      case 'edit-trainee':
        return selectedTrainee ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <EditTraineeForm
              trainee={convertTraineeToDisplayFormat(selectedTrainee)}
              onBack={() => setActiveView('trainee-profile')}
              onSave={async () => {
                await loadTrainees();
                await handleTraineeClick(selectedTrainee);
                setActiveView('trainee-profile');
              }}
            />
          </Suspense>
        ) : null;

      case 'workout-type-selection':
        return selectedTrainee && selectedTrainee.is_pair ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <WorkoutTypeSelection
              trainee={convertTraineeToDisplayFormat(selectedTrainee)}
              onSelectPersonal={handleSelectPersonalWorkout}
              onSelectPair={handleSelectPairWorkout}
              onBack={() => setActiveView('trainee-profile')}
            />
          </Suspense>
        ) : null;

      case 'pair-workout-session':
        return selectedTrainee && selectedTrainee.is_pair ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <PairWorkoutSession
              trainee={convertTraineeToDisplayFormat(selectedTrainee)}
              onBack={() => setActiveView('trainee-profile')}
              onComplete={async (workoutData) => {
                await loadWorkouts(selectedTrainee.id);
                setActiveView('trainee-profile');
              }}
              isTablet={isTablet}
            />
          </Suspense>
        ) : null;

      case 'workout-session':
        return selectedTrainee ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <WorkoutSession
              trainee={convertTraineeToDisplayFormat(selectedTrainee)}
              initialSelectedMember={selectedPairMember}
              isTablet={isTablet}
              onBack={() => {
                if (selectedWorkout) {
                  setActiveView('workouts-list');
                } else {
                  setActiveView('trainee-profile');
                }
                setSelectedPairMember(null);
              }}
              onSave={async (workout) => {
                await loadWorkouts(selectedTrainee.id);
                setSelectedWorkout(null);
                setSelectedPairMember(null);
                if (selectedWorkout) {
                  setActiveView('workouts-list');
                } else {
                  setActiveView('trainee-profile');
                }
              }}
              previousWorkout={undefined}
              editingWorkout={
                selectedWorkout
                  ? {
                      id: selectedWorkout.id,
                      exercises: selectedWorkout.exercises || [],
                    }
                  : undefined
              }
            />
          </Suspense>
        ) : null;

      case 'measurement-form':
        return selectedTrainee ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <MeasurementForm
              trainee={convertTraineeToDisplayFormat(selectedTrainee)}
              onBack={() => setActiveView('trainee-profile')}
              onSave={async (measurement) => {
                await loadMeasurements(selectedTrainee.id);
                setEditingMeasurement(null);
                setActiveView('measurements-view');
              }}
              previousMeasurement={undefined}
              editingMeasurement={editingMeasurement}
            />
          </Suspense>
        ) : null;

      case 'measurements-view':
        return selectedTrainee ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <MeasurementsView
              trainee={convertTraineeToDisplayFormat(selectedTrainee)}
              measurements={measurements}
              onNewMeasurement={() => handleNewMeasurement(selectedTrainee)}
              onEditMeasurement={handleEditMeasurement}
              onMeasurementDeleted={() => loadMeasurements(selectedTrainee.id)}
              onBack={() => setActiveView('trainee-profile')}
            />
          </Suspense>
        ) : null;

      case 'workouts-list':
        return selectedTrainee ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <WorkoutsList
              trainee={convertTraineeToDisplayFormat(selectedTrainee)}
              workouts={workouts}
              onBack={() => {
                setActiveView('trainee-profile');
                handleTraineeClick(selectedTrainee);
              }}
              onViewWorkout={handleViewWorkout}
              onEditWorkout={handleEditWorkout}
              onDuplicateWorkout={handleDuplicateWorkout}
              onWorkoutsUpdated={() => loadWorkouts(selectedTrainee.id)}
            />
          </Suspense>
        ) : null;

      case 'workout-details':
        return selectedTrainee && selectedWorkout ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <WorkoutDetails
              workoutId={selectedWorkout.id}
              trainee={convertTraineeToDisplayFormat(selectedTrainee)}
              onBack={() => setActiveView('workouts-list')}
              onEdit={() => handleEditWorkout(selectedWorkout)}
              onDuplicate={() => handleDuplicateWorkout(selectedWorkout)}
              onDelete={() => handleDeleteWorkout(selectedWorkout.id)}
            />
          </Suspense>
        ) : null;

      case 'workout-progress':
        return selectedTrainee ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <WorkoutProgress
              trainee={convertTraineeToDisplayFormat(selectedTrainee)}
              onBack={() => setActiveView('trainee-profile')}
            />
          </Suspense>
        ) : null;

      case 'workout-plans':
        return selectedTrainee ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <WorkoutPlanBuilder
              traineeId={selectedTrainee.id}
              traineeName={selectedTrainee.full_name}
              onBack={() => setActiveView('trainee-profile')}
            />
          </Suspense>
        ) : null;

      case 'meal-plans':
        return selectedTrainee && user ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <MealPlanBuilder
              traineeId={selectedTrainee.id}
              traineeName={selectedTrainee.full_name}
              trainerId={user.id}
              onBack={() => setActiveView('trainee-profile')}
            />
          </Suspense>
        ) : null;

      case 'trainee-access':
        return selectedTrainee ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <TraineeAccessManager
              traineeId={selectedTrainee.id}
              traineeName={selectedTrainee.full_name}
              onBack={() => setActiveView('trainee-profile')}
            />
          </Suspense>
        ) : null;

      case 'mental-tools':
        return selectedTrainee ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <MentalToolsEditor
              traineeId={selectedTrainee.id}
              traineeName={selectedTrainee.full_name}
              onBack={() => setActiveView('trainee-profile')}
            />
          </Suspense>
        ) : null;

      case 'food-diary':
        return selectedTrainee ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <TraineeFoodDiaryView
              traineeId={selectedTrainee.id}
              traineeName={selectedTrainee.full_name}
              onBack={() => setActiveView('trainee-profile')}
            />
          </Suspense>
        ) : null;

      case 'cardio-manager':
        return selectedTrainee && user ? (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <CardioManager
              traineeId={selectedTrainee.id}
              trainerId={user.id}
              traineeName={selectedTrainee.full_name}
              onBack={() => setActiveView('trainee-profile')}
            />
          </Suspense>
        ) : null;

      case 'calendar':
        return (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <CalendarView
              onEventClick={(event) => {
                // TODO: Handle event click - could open workout or create new one
                toast(`אירוע: ${event.summary}`, { icon: '📅' });
              }}
              onCreateWorkout={() => {
                setActiveView('trainees');
                toast('בחר מתאמן ליצירת אימון חדש', { icon: '💪' });
              }}
              onCreateTrainee={(name) => {
                setInitialTraineeName(name);
                setActiveView('add-trainee');
                toast(`יוצר כרטיס מתאמן חדש: ${name}`, { icon: '👤' });
              }}
              onQuickCreateTrainee={async (name) => {
                if (!user) return null;
                try {
                  const { data, error } = await supabase
                    .from('trainees')
                    .insert([{
                      trainer_id: user.id,
                      full_name: name.trim(),
                      status: 'active',
                    }])
                    .select()
                    .single();
                  
                  if (error) {
                    logger.error('Error quick creating trainee', error, 'TrainerApp');
                    toast.error('שגיאה ביצירת מתאמן');
                    return null;
                  }
                  
                  // Add to local state
                  if (data) {
                    setTrainees(prev => [data, ...prev]);
                  }
                  
                  return data?.id || null;
                } catch (err) {
                  logger.error('Error in quick create trainee', err, 'TrainerApp');
                  return null;
                }
              }}
            />
          </Suspense>
        );

      case 'tools':
        return (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <ToolsView />
          </Suspense>
        );

      case 'reports':
        return (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <ReportsView />
          </Suspense>
        );

      case 'smart-report':
        return (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <SmartReportView />
          </Suspense>
        );

      // Settings & Management Views
      case 'health-check':
        return (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <HealthCheckView />
          </Suspense>
        );

      case 'error-reporting':
        return (
          <Suspense fallback={<LoadingSpinner size="lg" text="טוען..." />}>
            <ErrorReportingSettings />
          </Suspense>
        );

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
  const isThemeShowcase =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('theme') === 'showcase';

  if (isThemeShowcase) {
    return <ThemeShowcase />;
  }

  return (
      <div
        className={`min-h-screen flex touch-manipulation ${isTablet ? 'tablet' : ''}`}
        dir="rtl"
      >
        {/* Desktop Sidebar */}
        {!sidebarCollapsed && (
          <Sidebar
            activeView={activeView}
            onViewChange={handleViewChange}
            collapsed={sidebarCollapsed}
            isTablet={isTablet}
          />
        )}

        {/* Mobile Sidebar */}
        <MobileSidebar
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          activeView={activeView}
          onViewChange={handleViewChange}
        />

        <div className="flex-1 flex flex-col pb-20 md:pb-0">
          {!headerCollapsed && (
            <Header
              onLogout={signOut}
              trainerName={trainerName}
              collapsed={headerCollapsed}
              onNavigateToTrainee={handleNavigateToTrainee}
              onToggleSidebar={toggleMobileSidebar}
            />
          )}

          <main 
            id="main-content"
            className={`flex-1 overflow-auto ${headerCollapsed ? 'p-2' : 'p-3 md:p-6'}`}
            role="main"
            aria-label="תוכן ראשי"
          >
            {showCollapseControls && (
              <div className="hidden lg:flex gap-3 mb-4 justify-end" role="toolbar" aria-label="בקרות תצוגה">
                <button
                  type="button"
                  onClick={() => setHeaderCollapsed(!headerCollapsed)}
                  className="btn-glass px-4 py-2 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  aria-label={headerCollapsed ? 'הצג כותרת' : 'הסתר כותרת'}
                  aria-pressed={!headerCollapsed}
                >
                  {headerCollapsed ? 'הצג כותרת' : 'הסתר כותרת'}
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="btn-glass px-4 py-2 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  aria-label={sidebarCollapsed ? 'הצג תפריט' : 'הסתר תפריט'}
                  aria-pressed={!sidebarCollapsed}
                >
                  {sidebarCollapsed ? 'הצג תפריט' : 'הסתר תפריט'}
                </button>
              </div>
            )}
            {renderMainContent()}
          </main>

          <nav 
            id="main-navigation"
            className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-4"
            role="navigation"
            aria-label="ניווט ראשי"
          >
            <div className="glass-card px-2 py-2 rounded-2xl shadow-dark-lg">
              <div className="flex justify-around items-center max-w-lg mx-auto">
                <button
                  onClick={() => handleViewChange('dashboard')}
                  aria-label="דף הבית"
                  aria-current={activeView === 'dashboard' ? 'page' : undefined}
                  className={`flex flex-col items-center px-4 py-2 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    activeView === 'dashboard'
                      ? 'text-lime-500'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Home className={`h-6 w-6 mb-1 ${activeView === 'dashboard' ? 'drop-shadow-[0_0_8px_rgba(170,255,0,0.6)]' : ''}`} aria-hidden="true" />
                  <span className="text-xs font-medium">בית</span>
                </button>
                <button
                  onClick={() => handleViewChange('trainees')}
                  aria-label="מתאמנים"
                  aria-current={activeView.includes('trainee') ? 'page' : undefined}
                  className={`flex flex-col items-center px-4 py-2 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    activeView.includes('trainee')
                      ? 'text-lime-500'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
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
