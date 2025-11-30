import { ArrowRight, CreditCard as Edit, Share, Calendar, Scale, BarChart3, User, Phone, Mail, Trash2, TrendingUp } from 'lucide-react';
import { Trainee, BodyMeasurement, Workout } from '../../types';

interface TraineeProfileProps {
  trainee: Trainee;
  measurements: BodyMeasurement[];
  workouts: Workout[];
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
}

export default function TraineeProfile({
  trainee,
  measurements,
  workouts,
  onBack,
  onEdit,
  onNewWorkout,
  onNewMeasurement,
  onViewMeasurements,
  onViewWorkouts,
  onViewProgress,
  onDelete,
  onToggleSidebar,
  onToggleHeader
}: TraineeProfileProps) {
  const latestMeasurement = measurements[0];
  const previousMeasurement = measurements[1];
  
  const weightChange = latestMeasurement && previousMeasurement 
    ? latestMeasurement.weight - previousMeasurement.weight
    : 0;

  return (
    <div className="space-y-4 lg:space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{trainee.name}</h1>
            <p className="text-gray-600">פרופיל מתאמן</p>
          </div>
        </div>

        <div className="flex space-x-3 rtl:space-x-reverse flex-wrap">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
            >
              הסתר תפריט
            </button>
          )}
          {onToggleHeader && (
            <button
              type="button"
              onClick={onToggleHeader}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
            >
              הסתר כותרת
            </button>
          )}
          <button
            onClick={onEdit}
            className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg flex items-center space-x-2 rtl:space-x-reverse transition-colors"
          >
            <Edit className="h-4 w-4" />
            <span>ערוך פרופיל</span>
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg flex items-center space-x-2 rtl:space-x-reverse transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span>מחק מתאמן</span>
            </button>
          )}
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="bg-blue-50 p-3 rounded-lg">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">גיל</p>
              <p className="font-semibold">{trainee.age} שנים</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="bg-green-50 p-3 rounded-lg">
              <Phone className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">טלפון</p>
              <p className="font-semibold">{trainee.phone}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="bg-purple-50 p-3 rounded-lg">
              <Mail className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">אימייל</p>
              <p className="font-semibold">{trainee.email}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="bg-orange-50 p-3 rounded-lg">
              <Calendar className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">התחיל</p>
              <p className="font-semibold">{new Date(trainee.startDate).toLocaleDateString('he-IL')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {latestMeasurement && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
            <Scale className="h-8 w-8 text-blue-500 mx-auto mb-3" />
            <p className="text-2xl font-bold text-gray-900">{latestMeasurement.weight} ק״ג</p>
            <p className="text-sm text-gray-500">משקל נוכחי</p>
            {weightChange !== 0 && (
              <div className={`text-sm mt-2 ${weightChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} ק״ג
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
            <BarChart3 className="h-8 w-8 text-green-500 mx-auto mb-3" />
            <p className="text-2xl font-bold text-gray-900">{latestMeasurement.bodyFat?.toFixed(1)}%</p>
            <p className="text-sm text-gray-500">אחוז שומן</p>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
            <User className="h-8 w-8 text-purple-500 mx-auto mb-3" />
            <p className="text-2xl font-bold text-gray-900">{latestMeasurement.muscleMass?.toFixed(1)} ק״ג</p>
            <p className="text-sm text-gray-500">מסת שריר</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={onNewWorkout}
          className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-xl flex items-center justify-center space-x-3 rtl:space-x-reverse transition-colors touch-manipulation"
        >
          <Calendar className="h-5 w-5" />
          <span className="font-medium">אימון חדש</span>
        </button>

        <button
          onClick={onNewMeasurement}
          className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-xl flex items-center justify-center space-x-3 rtl:space-x-reverse transition-colors touch-manipulation"
        >
          <Scale className="h-5 w-5" />
          <span className="font-medium">שקילה חדשה</span>
        </button>

        <button
          onClick={onViewMeasurements}
          className="bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-xl flex items-center justify-center space-x-3 rtl:space-x-reverse transition-colors touch-manipulation"
        >
          <BarChart3 className="h-5 w-5" />
          <span className="font-medium">גרף משקל</span>
        </button>

        {onViewProgress && (
          <button
            onClick={onViewProgress}
            className="bg-teal-500 hover:bg-teal-600 text-white p-4 rounded-xl flex items-center justify-center space-x-3 rtl:space-x-reverse transition-colors touch-manipulation"
          >
            <TrendingUp className="h-5 w-5" />
            <span className="font-medium">גרף אימונים</span>
          </button>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Workouts */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">אימונים אחרונים</h3>
            {onViewWorkouts && workouts.length > 0 && (
              <button
                onClick={onViewWorkouts}
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                כל האימונים ←
              </button>
            )}
          </div>
          <div className="p-6">
            {workouts.length > 0 ? (
              <div className="space-y-4">
                {workouts.slice(0, 3).map((workout) => (
                  <div key={workout.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{new Date(workout.date).toLocaleDateString('he-IL')}</p>
                      <p className="text-sm text-gray-500">{workout.exercises.length} תרגילים</p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{workout.totalVolume.toLocaleString()} ק״ג</p>
                      <p className="text-xs text-gray-500">נפח כולל</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">אין אימונים עדיין</p>
            )}
          </div>
        </div>

        {/* Recent Measurements */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">מדידות אחרונות</h3>
          </div>
          <div className="p-6">
            {measurements.length > 0 ? (
              <div className="space-y-4">
                {measurements.slice(0, 3).map((measurement) => (
                  <div key={measurement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{new Date(measurement.date).toLocaleDateString('he-IL')}</p>
                      <p className="text-sm text-gray-500">{measurement.source === 'tanita' ? 'Tanita' : 'ידני'}</p>
                    </div>
                    <div className="text-left space-y-1">
                      <p className="text-sm font-medium text-gray-900">{measurement.weight} ק״ג</p>
                      {measurement.bodyFat && (
                        <p className="text-xs text-gray-500">{measurement.bodyFat.toFixed(1)}% שומן</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">אין מדידות עדיין</p>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {trainee.notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">הערות מאמן</h3>
          <p className="text-yellow-700">{trainee.notes}</p>
        </div>
      )}
    </div>
  );
}