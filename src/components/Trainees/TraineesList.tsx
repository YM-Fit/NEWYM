import { useState } from 'react';
import { Search, Plus, Filter, X } from 'lucide-react';
import TraineeCard from './TraineeCard';

interface TraineesListProps {
  trainees: any[];
  onTraineeClick: (trainee: any) => void;
  onAddTrainee: () => void;
}

export default function TraineesList({ trainees, onTraineeClick, onAddTrainee }: TraineesListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'vacation' | 'new'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filter trainees based on search term and status
  const filteredTrainees = trainees.filter((trainee) => {
    const matchesSearch =
      trainee.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainee.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainee.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || trainee.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="חפש לפי שם, טלפון או אימייל..."
              className="w-full pl-4 pr-11 py-3 sm:py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-base"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-3 sm:py-2 border rounded-lg transition-colors min-h-[48px] sm:min-h-0 ${
              showFilters || statusFilter !== 'all'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 hover:bg-gray-50 active:bg-gray-100'
            }`}
          >
            <Filter className="h-5 w-5" />
            <span>מסנן</span>
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">סנן לפי סטטוס:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'הכל' },
                { value: 'active', label: 'פעילים' },
                { value: 'new', label: 'חדשים' },
                { value: 'vacation', label: 'בחופשה' },
                { value: 'inactive', label: 'לא פעילים' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value as typeof statusFilter)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === filter.value
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {(searchTerm || statusFilter !== 'all') && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <span>מציג {filteredTrainees.length} מתוך {trainees.length} מתאמנים</span>
            {(searchTerm || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="text-green-600 hover:text-green-700 font-medium"
              >
                נקה הכל
              </button>
            )}
          </div>
        )}
      </div>

      {/* Trainees Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredTrainees.map((trainee) => (
          <TraineeCard
            key={trainee.id}
            trainee={trainee}
            onClick={() => onTraineeClick(trainee)}
          />
        ))}
      </div>

      {/* No Results Message */}
      {filteredTrainees.length === 0 && trainees.length > 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">לא נמצאו תוצאות</h3>
          <p className="text-gray-500 mb-6">נסה לשנות את קריטריוני החיפוש או הסינון</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            נקה מסננים
          </button>
        </div>
      )}

      {/* No Trainees at All */}
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