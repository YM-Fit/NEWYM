import { Plus, Users, Search, Sparkles, Filter, Grid3x3, List, TrendingUp, Calendar, Scale, X, User } from 'lucide-react';
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

type SortOption = 'name' | 'lastWorkout' | 'recent';
type FilterOption = 'all' | 'male' | 'female' | 'pair' | 'active' | 'inactive';

function TraineesList({ trainees, onTraineeClick, onAddTrainee, unseenWeightsCounts }: TraineesListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = trainees.length;
    const pairs = trainees.filter(t => t.is_pair).length;
    const individuals = total - pairs;
    const withUnseenWeights = Array.from(unseenWeightsCounts?.values() || []).reduce((sum, count) => sum + (count > 0 ? 1 : 0), 0);
    const active = trainees.filter(t => {
      if (!t.lastWorkout) return false;
      const daysSince = Math.floor((new Date().getTime() - new Date(t.lastWorkout).getTime()) / (1000 * 60 * 60 * 24));
      return daysSince <= 7;
    }).length;
    
    return { total, pairs, individuals, withUnseenWeights, active };
  }, [trainees, unseenWeightsCounts]);

  const filteredTrainees = useMemo(() => {
    let filtered = trainees.filter(trainee => {
      // Search filter
      const searchLower = debouncedSearchQuery.toLowerCase();
      const matchesSearch = 
        trainee.full_name.toLowerCase().includes(searchLower) ||
        trainee.phone?.includes(debouncedSearchQuery) ||
        trainee.email?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;

      // Category filter
      switch (filterBy) {
        case 'male':
          return !trainee.is_pair && trainee.gender === 'male';
        case 'female':
          return !trainee.is_pair && trainee.gender === 'female';
        case 'pair':
          return trainee.is_pair;
        case 'active':
          if (!trainee.lastWorkout) return false;
          const daysSince = Math.floor((new Date().getTime() - new Date(trainee.lastWorkout).getTime()) / (1000 * 60 * 60 * 24));
          return daysSince <= 7;
        case 'inactive':
          if (!trainee.lastWorkout) return true;
          const daysSinceInactive = Math.floor((new Date().getTime() - new Date(trainee.lastWorkout).getTime()) / (1000 * 60 * 60 * 24));
          return daysSinceInactive > 7;
        default:
          return true;
      }
    });

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.full_name.localeCompare(b.full_name, 'he');
        case 'lastWorkout':
          if (!a.lastWorkout && !b.lastWorkout) return 0;
          if (!a.lastWorkout) return 1;
          if (!b.lastWorkout) return -1;
          return new Date(b.lastWorkout).getTime() - new Date(a.lastWorkout).getTime();
        case 'recent':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [trainees, debouncedSearchQuery, filterBy, sortBy]);

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
      {/* Header */}
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
            className="btn-primary px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all"
          >
            <Plus className="h-5 w-5" />
            <span>הוסף מתאמן</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="premium-card-static p-4 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-5 w-5 text-emerald-400" />
            <span className="text-2xl font-bold text-emerald-400">{stats.total}</span>
          </div>
          <p className="text-xs text-zinc-400">סה״כ מתאמנים</p>
        </div>

        <div className="premium-card-static p-4 bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-5 w-5 text-cyan-400" />
            <span className="text-2xl font-bold text-cyan-400">{stats.active}</span>
          </div>
          <p className="text-xs text-zinc-400">פעילים (7 ימים)</p>
        </div>

        <div className="premium-card-static p-4 bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-5 w-5 text-amber-400" />
            <span className="text-2xl font-bold text-amber-400">{stats.pairs}</span>
          </div>
          <p className="text-xs text-zinc-400">זוגות</p>
        </div>

        <div className="premium-card-static p-4 bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <User className="h-5 w-5 text-purple-400" />
            <span className="text-2xl font-bold text-purple-400">{stats.individuals}</span>
          </div>
          <p className="text-xs text-zinc-400">יחידים</p>
        </div>

        <div className="premium-card-static p-4 bg-gradient-to-br from-rose-500/20 to-rose-500/5 border border-rose-500/20">
          <div className="flex items-center justify-between mb-2">
            <Scale className="h-5 w-5 text-rose-400" />
            <span className="text-2xl font-bold text-rose-400">{stats.withUnseenWeights}</span>
          </div>
          <p className="text-xs text-zinc-400">שקילות חדשות</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="premium-card-static p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <input
              type="text"
              placeholder="חיפוש מתאמן לפי שם, טלפון או אימייל..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-12 pl-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-xl flex items-center gap-2 font-medium transition-all ${
                showFilters || filterBy !== 'all' || sortBy !== 'name'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-700/50'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>סינון</span>
              {(filterBy !== 'all' || sortBy !== 'name') && (
                <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
              )}
            </button>

            <div className="flex items-center gap-1 bg-zinc-800/50 rounded-xl p-1 border border-zinc-700/50">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-zinc-800/50 animate-fade-in">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400">סינון:</span>
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                  className="px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="all">הכל</option>
                  <option value="active">פעילים</option>
                  <option value="inactive">לא פעילים</option>
                  <option value="male">גברים</option>
                  <option value="female">נשים</option>
                  <option value="pair">זוגות</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400">מיון:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="name">לפי שם</option>
                  <option value="lastWorkout">לפי אימון אחרון</option>
                  <option value="recent">לפי הוספה אחרונה</option>
                </select>
              </div>

              {(filterBy !== 'all' || sortBy !== 'name') && (
                <button
                  onClick={() => {
                    setFilterBy('all');
                    setSortBy('name');
                  }}
                  className="px-3 py-2 text-sm text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <X className="h-4 w-4" />
                  <span>נקה סינון</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {filteredTrainees.length > 0 ? (
        <>
          <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'}`}>
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
                  viewMode={viewMode}
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
