import { useState, useEffect } from 'react';
import { Home, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Header from './Layout/Header';
import Sidebar from './Layout/Sidebar';
import Dashboard from './Dashboard/Dashboard';
import TraineesList from './Trainees/TraineesList';
import TraineeProfile from './Trainees/TraineeProfile';
import AddTraineeForm from './Trainees/AddTraineeForm';
import EditTraineeForm from './Trainees/EditTraineeForm';
import WorkoutSession from './Workouts/WorkoutSession';
import WorkoutsList from './Workouts/WorkoutsList';
import WorkoutDetails from './Workouts/WorkoutDetails';
import WorkoutProgress from './Workouts/WorkoutProgress';
import WorkoutTypeSelection from './Workouts/WorkoutTypeSelection';
import PairWorkoutSession from './Workouts/PairWorkoutSession';
import MeasurementForm from './Measurements/MeasurementForm';
import MeasurementsView from './Measurements/MeasurementsView';

interface Trainee {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  gender: 'male' | 'female' | null;
  birth_date: string | null;
  height: number | null;
  status: 'active' | 'inactive' | 'vacation' | 'new';
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

export default function MainApp() {
  const { signOut, user } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<any | null>(null);
  const [editingMeasurement, setEditingMeasurement] = useState<any | null>(null);
  const [selectedPairMember, setSelectedPairMember] = useState<'member_1' | 'member_2' | null>(null);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trainerName, setTrainerName] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  useEffect(() => {
    loadTrainees();
    loadTrainerProfile();
  }, []);

  const loadTrainees = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('trainees')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTrainees(data);
    }
    setLoading(false);
  };

  const loadTrainerProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('trainers')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (!error && data) {
      setTrainerName(data.full_name);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleHeader = () => {
    setHeaderCollapsed(!headerCollapsed);
  };

  const convertTraineeToDisplayFormat = (trainee: Trainee) => {
    return {
      id: trainee.id,
      name: trainee.full_name,
      email: trainee.email || '',
      phone: trainee.phone || '',
      age: trainee.birth_date ? new Date().getFullYear() - new Date(trainee.birth_date).getFullYear() : 0,
      gender: (trainee.gender || 'male') as 'male' | 'female',
      height: trainee.height || 0,
      startDate: trainee.start_date,
      status: trainee.status,
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
  };

  const handleViewChange = (view: string) => {
    setActiveView(view);
    if (!['trainee-profile', 'workout-session', 'measurement-form', 'measurements-view'].includes(view)) {
      setSelectedTrainee(null);
    }
  };

  const handleTraineeClick = async (trainee: Trainee) => {
    setSelectedTrainee(trainee);
    setActiveView('trainee-profile');
    await loadMeasurements(trainee.id);
    await loadWorkouts(trainee.id);
  };

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
    if (!confirm('האם אתה בטוח שברצונך למחוק מתאמן זה? הפעולה אינה ניתנת לביטול!')) {
      return;
    }

    const { error } = await supabase
      .from('trainees')
      .delete()
      .eq('id', traineeId);

    if (!error) {
      setTrainees((prev) => prev.filter(t => t.id !== traineeId));
      setActiveView('trainees');
      setSelectedTrainee(null);
    } else {
      alert('שגיאה במחיקת המתאמן');
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

  const loadMeasurements = async (traineeId: string) => {
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
        visceralFat: m.visceral_fat || undefined,
        bmi: m.bmi || undefined,
        source: m.source as 'tanita' | 'manual',
        pairMember: m.pair_member as 'member_1' | 'member_2' | null,
        measurements: {
          chest: m.chest || 0,
          waist: m.waist || 0,
          hips: m.hips || 0,
          arms: m.right_arm || 0,
          thighs: m.right_thigh || 0,
        }
      }));
      setMeasurements(formattedMeasurements);
    }
  };

  const loadWorkouts = async (traineeId: string) => {
    const { data: workoutTrainees, error } = await supabase
      .from('workout_trainees')
      .select(`
        workouts!inner (
          id,
          workout_date,
          is_completed,
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
            duration: 0
          };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setWorkouts(formattedWorkouts);
    }
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

        await supabase.from('exercise_sets').insert(setsToInsert);
      }
    }

    alert('האימון שוכפל בהצלחה!');
    await loadWorkouts(selectedTrainee.id);
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק אימון זה?')) {
      return;
    }

    const { error } = await supabase.from('workouts').delete().eq('id', workoutId);

    if (!error) {
      if (selectedTrainee) {
        await loadWorkouts(selectedTrainee.id);
      }
      setActiveView('workouts-list');
    } else {
      alert('שגיאה במחיקת האימון');
    }
  };

  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">טוען נתונים...</p>
          </div>
        </div>
      );
    }

    switch (activeView) {
      case 'dashboard':
        return (
          <Dashboard
            onViewChange={handleViewChange}
            trainees={trainees}
            trainerName={trainerName}
            onToggleSidebar={toggleSidebar}
            onToggleHeader={toggleHeader}
          />
        );

      case 'trainees':
        return (
          <TraineesList
            trainees={trainees}
            onTraineeClick={handleTraineeClick}
            onAddTrainee={handleAddTrainee}
          />
        );

      case 'trainee-profile':
        return selectedTrainee ? (
          <TraineeProfile
            trainee={convertTraineeToDisplayFormat(selectedTrainee)}
            workouts={workouts}
            measurements={measurements}
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
          />
        ) : null;

      case 'add-trainee':
        return (
          <AddTraineeForm
            onBack={() => setActiveView('trainees')}
            onSave={handleSaveTrainee}
          />
        );

      case 'edit-trainee':
        return selectedTrainee ? (
          <EditTraineeForm
            trainee={convertTraineeToDisplayFormat(selectedTrainee)}
            onBack={() => setActiveView('trainee-profile')}
            onSave={async () => {
              await loadTrainees();
              await handleTraineeClick(selectedTrainee);
              setActiveView('trainee-profile');
            }}
          />
        ) : null;

      case 'workout-type-selection':
        return selectedTrainee && selectedTrainee.is_pair ? (
          <WorkoutTypeSelection
            trainee={convertTraineeToDisplayFormat(selectedTrainee)}
            onSelectPersonal={handleSelectPersonalWorkout}
            onSelectPair={handleSelectPairWorkout}
            onBack={handleBack}
          />
        ) : null;

      case 'pair-workout-session':
        return selectedTrainee && selectedTrainee.is_pair ? (
          <PairWorkoutSession
            trainee={convertTraineeToDisplayFormat(selectedTrainee)}
            onBack={handleBack}
            onComplete={async (workoutData) => {
              await loadWorkouts(selectedTrainee.id);
              setActiveView('trainee-profile');
            }}
          />
        ) : null;

      case 'workout-session':
        return selectedTrainee ? (
          <WorkoutSession
            trainee={convertTraineeToDisplayFormat(selectedTrainee)}
            initialSelectedMember={selectedPairMember}
            onBack={() => {
              if (selectedWorkout) {
                setActiveView('workouts-list');
              } else {
                handleBack();
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
        ) : null;

      case 'measurement-form':
        return selectedTrainee ? (
          <MeasurementForm
            trainee={convertTraineeToDisplayFormat(selectedTrainee)}
            onBack={handleBack}
            onSave={async (measurement) => {
              await loadMeasurements(selectedTrainee.id);
              setEditingMeasurement(null);
              setActiveView('measurements-view');
            }}
            previousMeasurement={undefined}
            editingMeasurement={editingMeasurement}
          />
        ) : null;

      case 'measurements-view':
        return selectedTrainee ? (
          <MeasurementsView
            trainee={convertTraineeToDisplayFormat(selectedTrainee)}
            measurements={measurements}
            onNewMeasurement={() => handleNewMeasurement(selectedTrainee)}
            onEditMeasurement={handleEditMeasurement}
            onMeasurementDeleted={() => loadMeasurements(selectedTrainee.id)}
          />
        ) : null;

      case 'workouts-list':
        return selectedTrainee ? (
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
        ) : null;

      case 'workout-details':
        return selectedTrainee && selectedWorkout ? (
          <WorkoutDetails
            workoutId={selectedWorkout.id}
            trainee={convertTraineeToDisplayFormat(selectedTrainee)}
            onBack={() => setActiveView('workouts-list')}
            onEdit={() => handleEditWorkout(selectedWorkout)}
            onDuplicate={() => handleDuplicateWorkout(selectedWorkout)}
            onDelete={() => handleDeleteWorkout(selectedWorkout.id)}
          />
        ) : null;

      case 'workout-progress':
        return selectedTrainee ? (
          <WorkoutProgress
            trainee={convertTraineeToDisplayFormat(selectedTrainee)}
            onBack={() => setActiveView('trainee-profile')}
          />
        ) : null;

      default:
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">בפיתוח</h3>
              <p className="text-gray-500">תכונה זו תהיה זמינה בקרוב</p>
            </div>
          </div>
        );
    }
  };

  const isWorkoutSession = activeView === 'workout-session' || activeView === 'pair-workout-session';
  const showCollapseControls = isWorkoutSession;

  return (
    <div className="min-h-screen bg-gray-50 flex touch-manipulation" dir="rtl">
      {!sidebarCollapsed && (
        <Sidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          collapsed={sidebarCollapsed}
        />
      )}

      <div className="flex-1 flex flex-col pb-16 md:pb-0">
        {!headerCollapsed && (
          <Header
            onLogout={signOut}
            trainerName={trainerName}
            collapsed={headerCollapsed}
          />
        )}

        <main className={`flex-1 overflow-auto ${headerCollapsed ? 'p-2' : 'p-3 md:p-6'}`}>
          {showCollapseControls && (
            <div className="hidden lg:flex gap-3 mb-4 justify-end">
              <button
                type="button"
                onClick={() => setHeaderCollapsed(!headerCollapsed)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {headerCollapsed ? 'הצג כותרת' : 'הסתר כותרת'}
              </button>
              <button
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {sidebarCollapsed ? 'הצג תפריט' : 'הסתר תפריט'}
              </button>
            </div>
          )}
          {renderMainContent()}
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 z-40">
          <div className="flex justify-around items-center max-w-lg mx-auto">
            <button
              onClick={() => handleViewChange('dashboard')}
              className={`flex flex-col items-center px-3 py-2 rounded-lg transition-colors ${
                activeView === 'dashboard'
                  ? 'text-green-600'
                  : 'text-gray-500'
              }`}
            >
              <Home className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">בית</span>
            </button>
            <button
              onClick={() => handleViewChange('trainees')}
              className={`flex flex-col items-center px-3 py-2 rounded-lg transition-colors ${
                activeView.includes('trainee')
                  ? 'text-green-600'
                  : 'text-gray-500'
              }`}
            >
              <Users className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">מתאמנים</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
