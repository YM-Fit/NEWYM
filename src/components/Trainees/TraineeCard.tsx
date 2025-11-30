import { Calendar, Phone, TrendingDown, TrendingUp, User, Users } from 'lucide-react';

interface TraineeCardProps {
  trainee: any;
  onClick: () => void;
}

export default function TraineeCard({ trainee, onClick }: TraineeCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'vacation':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'inactive':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'new':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'פעיל';
      case 'vacation':
        return 'חופשה';
      case 'inactive':
        return 'לא פעיל';
      case 'new':
        return 'חדש';
      default:
        return status;
    }
  };

  const daysSinceLastWorkout = trainee.lastWorkout 
    ? Math.floor((new Date().getTime() - new Date(trainee.lastWorkout).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group active:scale-98"
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex items-center space-x-2 sm:space-x-3 rtl:space-x-reverse">
          <div className="bg-gray-100 p-2 sm:p-3 rounded-full group-hover:bg-green-50 transition-colors">
            {trainee.is_pair ? (
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 group-hover:text-green-600" />
            ) : (
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 group-hover:text-green-600" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-base sm:text-lg">{trainee.full_name}</h3>
            {trainee.is_pair ? (
              <p className="text-xs sm:text-sm text-gray-500">זוג אימונים</p>
            ) : (
              <p className="text-sm text-gray-500">{trainee.gender === 'male' ? 'זכר' : 'נקבה'}</p>
            )}
          </div>
        </div>
        
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(trainee.status)}`}>
          {getStatusText(trainee.status)}
        </span>
      </div>

      <div className="space-y-3">
        {!trainee.is_pair && (
          <div className="flex items-center text-sm text-gray-600">
            <Phone className="h-4 w-4 ml-2" />
            {trainee.phone}
          </div>
        )}
        {trainee.is_pair && (
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
            <div className="flex items-center">
              <User className="h-4 w-4 ml-2" />
              {trainee.pair_name_1}
            </div>
            <div className="flex items-center">
              <User className="h-4 w-4 ml-2" />
              {trainee.pair_name_2}
            </div>
          </div>
        )}
        
        {trainee.lastWorkout && (
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 ml-2" />
              אימון אחרון: {new Date(trainee.lastWorkout).toLocaleDateString('he-IL')}
            </div>
            {daysSinceLastWorkout !== null && (
              <div className={`flex items-center text-xs px-2 py-1 rounded-full ${
                daysSinceLastWorkout > 7 
                  ? 'bg-red-50 text-red-600' 
                  : 'bg-green-50 text-green-600'
              }`}>
                {daysSinceLastWorkout > 7 ? (
                  <TrendingDown className="h-3 w-3 ml-1" />
                ) : (
                  <TrendingUp className="h-3 w-3 ml-1" />
                )}
                {daysSinceLastWorkout} ימים
              </div>
            )}
          </div>
        )}
        
        {trainee.notes && (
          <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded-lg">
            {trainee.notes}
          </div>
        )}
      </div>
    </div>
  );
}