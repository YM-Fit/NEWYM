import { Plus, Users, Search, Sparkles } from 'lucide-react';
import { useState, useMemo, memo } from 'react';
import TraineeCard from './TraineeCard';
import { usePagination } from '../../../hooks/usePagination';
import { Pagination, SkeletonTraineeCard } from '../../ui';
import { EmptyState } from '../../common/EmptyState';
import { useDebounce } from '../../../hooks/useDebounce';

interface TraineesListProps {
  trainees: any[];
  onTraineeClick: (trainee: any) => void;
  onAddTrainee: () => void;
  unseenWeightsCounts?: Map<string, number>;
}

function TraineesList({ trainees, onTraineeClick, onAddTrainee, unseenWeightsCounts }: TraineesListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const filteredTrainees = useMemo(() => {
    return trainees.filter(trainee => {
      const searchLower = debouncedSearchQuery.toLowerCase();
      const matchesSearch = 
        trainee.full_name.toLowerCase().includes(searchLower) ||
        trainee.phone?.includes(debouncedSearchQuery) ||
        trainee.email?.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === 'all' || trainee.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [trainees, debouncedSearchQuery, statusFilter]);

  const statusCounts = useMemo(() => {
    return {
      all: trainees.length,
      active: trainees.filter(t => t.status === 'active').length,
      vacation: trainees.filter(t => t.status === 'vacation').length,
      inactive: trainees.filter(t => t.status === 'inactive').length,
      new: trainees.filter(t => t.status === 'new').length,
    };
  }, [trainees]);

  const statusOptions = [
    { value: 'all', label: 'הכל', color: 'zinc' },
    { value: 'active', label: 'פעילים', color: 'emerald' },
    { value: 'vacation', label: 'חופשה', color: 'amber' },
    { value: 'inactive', label: 'לא פעילים', color: 'red' },
    { value: 'new', label: 'חדשים', color: 'cyan' },
  ];

  const {
    paginatedData,
    currentPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    goToPage,
  } = usePagination(filteredTrainees, { initialPageSize: 12 });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="premium-card-static p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">ניהול</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">מתאמנים</h1>
            <p className="text-zinc-400">נהל את כל המתאמנים שלך במקום אחד</p>
          </div>

          <button
            onClick={onAddTrainee}
            className="btn-primary px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 font-semibold"
          >
            <Plus className="h-5 w-5" />
            <span>הוסף מתאמן</span>
          </button>
        </div>
      </div>

      <div className="premium-card-static p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <input
              type="text"
              placeholder="חיפוש מתאמן..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-12 pl-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {statusOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === option.value
                    ? option.color === 'emerald'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : option.color === 'amber'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : option.color === 'red'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : option.color === 'cyan'
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-zinc-700/50 text-white border border-zinc-600/50'
                    : 'bg-zinc-800/30 text-zinc-400 border border-zinc-700/30 hover:bg-zinc-700/30 hover:text-zinc-300'
                }`}
              >
                {option.label}
                <span className="mr-2 text-xs opacity-70">
                  ({statusCounts[option.value as keyof typeof statusCounts]})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredTrainees.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedData.map((trainee, index) => (
              <div
                key={trainee.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TraineeCard
                  trainee={trainee}
                  onClick={() => onTraineeClick(trainee)}
                  unseenWeightsCount={unseenWeightsCounts?.get(trainee.id) || 0}
                />
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="premium-card-static">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                startIndex={startIndex}
                endIndex={endIndex}
                hasNextPage={hasNextPage}
                hasPrevPage={hasPrevPage}
                onNextPage={nextPage}
                onPrevPage={prevPage}
                onGoToPage={goToPage}
              />
            </div>
          )}
        </>
      ) : trainees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="אין מתאמנים עדיין"
          description="התחל בהוספת המתאמן הראשון שלך כדי להתחיל לעקוב אחר ההתקדמות שלהם"
          action={{
            label: 'הוסף מתאמן ראשון',
            onClick: onAddTrainee
          }}
        />
      ) : (
        <EmptyState
          icon={Search}
          title="לא נמצאו תוצאות"
          description="נסה לשנות את מילות החיפוש או את הסינון"
        />
      )}
    </div>
  );
}

export default memo(TraineesList);
