import { ArrowRight, Dumbbell, Copy, Edit2, Trash2, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Workout {
  id: string;
  date: string;
  exercises: Array<{
    name: string;
    sets: number;
  }>;
  totalVolume: number;
  duration: number;
}

interface WorkoutsListProps {
  trainee: any;
  workouts: Workout[];
  onBack: () => void;
  onViewWorkout: (workout: Workout) => void;
  onEditWorkout: (workout: Workout) => void;
  onDuplicateWorkout: (workout: Workout) => void;
  onWorkoutsUpdated: () => void;
}

export default function WorkoutsList({
  trainee,
  workouts,
  onBack,
  onViewWorkout,
  onEditWorkout,
  onDuplicateWorkout,
  onWorkoutsUpdated
}: WorkoutsListProps) {

  const handleDeleteWorkout = async (workoutId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('האם אתה בטוח שברצונך למחוק אימון זה? הפעולה אינה ניתנת לביטול!')) {
      return;
    }

    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', workoutId);

    if (!error) {
      onWorkoutsUpdated();
    } else {
      alert('שגיאה במחיקת האימון');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">אימונים של {trainee.name}</h1>
            <p className="text-gray-600">{workouts.length} אימונים כולל</p>
          </div>
        </div>
      </div>

      {workouts.length > 0 ? (
        <div className="space-y-4">
          {workouts.map((workout) => (
            <div
              key={workout.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => onViewWorkout(workout)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse mb-3">
                    <div className="bg-green-50 p-2 rounded-lg">
                      <Dumbbell className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {new Date(workout.date).toLocaleDateString('he-IL', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {workout.exercises.length} תרגילים
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">נפח כולל:</span>
                      <span className="font-semibold text-gray-900">
                        {workout.totalVolume.toLocaleString()} ק״ג
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {workout.exercises.slice(0, 3).map((ex, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                        >
                          {ex.name}
                        </span>
                      ))}
                      {workout.exercises.length > 3 && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          +{workout.exercises.length - 3} עוד
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2 rtl:space-x-reverse mr-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateWorkout(workout);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="שכפל אימון"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditWorkout(workout);
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="ערוך אימון"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteWorkout(workout.id, e)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="מחק אימון"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">אין אימונים עדיין</h3>
          <p className="text-gray-500 mb-6">התחל לעקוב אחר האימונים של {trainee.name}</p>
          <button
            onClick={onBack}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            חזור לפרופיל
          </button>
        </div>
      )}
    </div>
  );
}
