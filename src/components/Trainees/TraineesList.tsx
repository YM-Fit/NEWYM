import { Search, Plus, Filter } from 'lucide-react';
import TraineeCard from './TraineeCard';

interface TraineesListProps {
  trainees: any[];
  onTraineeClick: (trainee: any) => void;
  onAddTrainee: () => void;
}

export default function TraineesList({ trainees, onTraineeClick, onAddTrainee }: TraineesListProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">מתאמנים</h1>
          <p className="text-sm sm:text-base text-gray-600">נהל את כל המתאמנים שלך במקום אחד</p>
        </div>

        <button
          onClick={onAddTrainee}
          className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white px-4 py-3 sm:py-2 rounded-lg flex items-center justify-center space-x-2 rtl:space-x-reverse transition-colors min-h-[48px] sm:min-h-0 font-medium"
        >
          <Plus className="h-5 w-5" />
          <span>הוסף מתאמן</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="חפש מתאמן..."
              className="w-full pl-4 pr-11 py-3 sm:py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-base"
            />
          </div>
          <button className="flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-3 sm:py-2 border border-gray-200 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[48px] sm:min-h-0">
            <Filter className="h-5 w-5" />
            <span>מסנן</span>
          </button>
        </div>
      </div>

      {/* Trainees Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {trainees.map((trainee) => (
          <TraineeCard
            key={trainee.id}
            trainee={trainee}
            onClick={() => onTraineeClick(trainee)}
          />
        ))}
      </div>

      {trainees.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">אין מתאמנים עדיין</h3>
          <p className="text-gray-500 mb-6">התחל בהוספת המתאמן הראשון שלך</p>
          <button
            onClick={onAddTrainee}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            הוסף מתאמן ראשון
          </button>
        </div>
      )}
    </div>
  );
}