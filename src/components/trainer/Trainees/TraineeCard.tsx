import { memo } from 'react';
import { Calendar, Phone, TrendingDown, TrendingUp, User, Users, Scale, ChevronLeft } from 'lucide-react';

interface TraineeCardProps {
  trainee: {
    full_name: string;
    is_pair?: boolean;
    gender?: string;
    status: string;
    phone?: string;
    pair_name_1?: string;
    pair_name_2?: string;
    lastWorkout?: string;
    notes?: string;
  };
  onClick: () => void;
  unseenWeightsCount?: number;
}

function TraineeCard({ trainee, onClick, unseenWeightsCount = 0 }: TraineeCardProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          bg: 'bg-emerald-500/15',
          text: 'text-emerald-400',
          border: 'border-emerald-500/30',
          label: 'פעיל',
        };
      case 'vacation':
        return {
          bg: 'bg-amber-500/15',
          text: 'text-amber-400',
          border: 'border-amber-500/30',
          label: 'חופשה',
        };
      case 'inactive':
        return {
          bg: 'bg-red-500/15',
          text: 'text-red-400',
          border: 'border-red-500/30',
          label: 'לא פעיל',
        };
      case 'new':
        return {
          bg: 'bg-cyan-500/15',
          text: 'text-cyan-400',
          border: 'border-cyan-500/30',
          label: 'חדש',
        };
      default:
        return {
          bg: 'bg-zinc-500/15',
          text: 'text-zinc-400',
          border: 'border-zinc-500/30',
          label: status,
        };
    }
  };

  const daysSinceLastWorkout = trainee.lastWorkout
    ? Math.floor((new Date().getTime() - new Date(trainee.lastWorkout).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const statusConfig = getStatusConfig(trainee.status);

  return (
    <div
      onClick={onClick}
      className="premium-card p-5 cursor-pointer group"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`פתח פרופיל של ${trainee.full_name}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center group-hover:from-emerald-500/30 group-hover:to-emerald-600/20 transition-all">
              {trainee.is_pair ? (
                <Users className="h-6 w-6 text-emerald-400" />
              ) : (
                <span className="text-lg font-bold text-emerald-400">
                  {trainee.full_name.charAt(0)}
                </span>
              )}
            </div>
            {trainee.status === 'active' && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-zinc-900" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-white text-base group-hover:text-emerald-400 transition-colors">
              {trainee.full_name}
            </h3>
            <p className="text-sm text-zinc-500">
              {trainee.is_pair ? 'זוג אימונים' : (trainee.gender === 'male' ? 'זכר' : 'נקבה')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unseenWeightsCount > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-cyan-500/15 text-cyan-400 rounded-lg text-xs font-semibold animate-pulse border border-cyan-500/20">
              <Scale className="h-3 w-3" />
              <span>{unseenWeightsCount}</span>
            </div>
          )}
          <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {!trainee.is_pair && trainee.phone && (
          <div className="flex items-center text-sm text-zinc-400">
            <Phone className="h-4 w-4 ml-2 text-zinc-500" />
            <span dir="ltr">{trainee.phone}</span>
          </div>
        )}

        {trainee.is_pair && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center text-zinc-400 bg-zinc-800/50 rounded-lg px-3 py-2">
              <User className="h-4 w-4 ml-2 text-zinc-500" />
              {trainee.pair_name_1}
            </div>
            <div className="flex items-center text-zinc-400 bg-zinc-800/50 rounded-lg px-3 py-2">
              <User className="h-4 w-4 ml-2 text-zinc-500" />
              {trainee.pair_name_2}
            </div>
          </div>
        )}

        {trainee.lastWorkout && (
          <div className="flex items-center justify-between bg-zinc-800/30 rounded-lg px-3 py-2">
            <div className="flex items-center text-sm text-zinc-400">
              <Calendar className="h-4 w-4 ml-2 text-zinc-500" />
              אימון אחרון: {new Date(trainee.lastWorkout).toLocaleDateString('he-IL')}
            </div>
            {daysSinceLastWorkout !== null && (
              <div className={`flex items-center text-xs px-2 py-1 rounded-lg ${
                daysSinceLastWorkout > 7
                  ? 'bg-red-500/15 text-red-400'
                  : 'bg-emerald-500/15 text-emerald-400'
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
          <div className="text-sm text-zinc-500 bg-zinc-800/30 p-3 rounded-lg border border-zinc-700/30">
            {trainee.notes}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end mt-4 pt-4 border-t border-zinc-800/50">
        <div className="flex items-center text-sm text-zinc-500 group-hover:text-emerald-400 transition-colors">
          <span>לפרופיל</span>
          <ChevronLeft className="h-4 w-4 mr-1" />
        </div>
      </div>
    </div>
  );
}

export default memo(TraineeCard);
