import { memo } from 'react';
import { Calendar, Phone, TrendingDown, TrendingUp, User, Users, Scale, ChevronLeft, Mail, Clock, AlertCircle, Link2 } from 'lucide-react';

interface TraineeCardProps {
  trainee: {
    full_name: string;
    is_pair?: boolean;
    gender?: string;
    phone?: string;
    email?: string;
    pair_name_1?: string;
    pair_name_2?: string;
    lastWorkout?: string;
    notes?: string;
    created_at?: string;
    google_calendar_client_id?: string;
  };
  onClick: () => void;
  unseenWeightsCount?: number;
  viewMode?: 'grid' | 'list';
}

function TraineeCard({ trainee, onClick, unseenWeightsCount = 0, viewMode = 'grid' }: TraineeCardProps) {
  const daysSinceLastWorkout = trainee.lastWorkout
    ? Math.floor((new Date().getTime() - new Date(trainee.lastWorkout).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isActive = daysSinceLastWorkout !== null && daysSinceLastWorkout <= 7;
  const isInactive = daysSinceLastWorkout !== null && daysSinceLastWorkout > 7;

  if (viewMode === 'list') {
    return (
      <div
        onClick={onClick}
        className="premium-card p-4 cursor-pointer group hover:bg-zinc-800/50 transition-all"
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
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center group-hover:from-emerald-500/30 group-hover:to-emerald-600/20 transition-all">
                {trainee.is_pair ? (
                  <Users className="h-6 w-6 text-emerald-400" />
                ) : (
                  <span className="text-lg font-bold text-emerald-400">
                    {trainee.full_name.charAt(0)}
                  </span>
                )}
              </div>
              {unseenWeightsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-400 rounded-full flex items-center justify-center text-xs font-bold text-dark-900 border-2 border-zinc-900">
                  {unseenWeightsCount}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-white text-base group-hover:text-emerald-400 transition-colors truncate">
                  {trainee.full_name}
                </h3>
                {isInactive && (
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                )}
                {trainee.google_calendar_client_id && (
                  <Link2 className="h-4 w-4 text-emerald-400 flex-shrink-0" title="מסונכרן עם Google Calendar" />
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-zinc-400">
                <span>{trainee.is_pair ? 'זוג אימונים' : (trainee.gender === 'male' ? 'זכר' : 'נקבה')}</span>
                {trainee.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span dir="ltr" className="truncate">{trainee.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              {trainee.lastWorkout ? (
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm text-zinc-400">
                      {new Date(trainee.lastWorkout).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                  {daysSinceLastWorkout !== null && (
                    <div className={`flex items-center justify-end text-xs px-2 py-1 rounded-lg ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-red-500/15 text-red-400'
                    }`}>
                      {daysSinceLastWorkout} ימים
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-zinc-500">אין אימונים</div>
              )}

              <ChevronLeft className="h-5 w-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="premium-card p-5 cursor-pointer group hover:scale-[1.02] transition-all relative overflow-hidden"
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
      {/* Status indicator */}
      {isActive && (
        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
      )}
      {isInactive && (
        <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
      )}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center group-hover:from-emerald-500/30 group-hover:to-emerald-600/20 transition-all shadow-lg">
              {trainee.is_pair ? (
                <Users className="h-7 w-7 text-emerald-400" />
              ) : (
                <span className="text-xl font-bold text-emerald-400">
                  {trainee.full_name.charAt(0)}
                </span>
              )}
            </div>
            {unseenWeightsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-cyan-400 rounded-full flex items-center justify-center text-xs font-bold text-dark-900 border-2 border-zinc-900 animate-pulse">
                {unseenWeightsCount}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-white text-base group-hover:text-emerald-400 transition-colors truncate">
                {trainee.full_name}
              </h3>
              {isInactive && (
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              )}
              {trainee.google_calendar_client_id && (
                <Link2 className="h-4 w-4 text-emerald-400 flex-shrink-0" title="מסונכרן עם Google Calendar" />
              )}
            </div>
            <p className="text-sm text-zinc-500">
              {trainee.is_pair ? 'זוג אימונים' : (trainee.gender === 'male' ? 'זכר' : 'נקבה')}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Contact Info */}
        <div className="flex flex-wrap items-center gap-3">
          {trainee.phone && (
            <div className="flex items-center gap-1.5 text-sm text-zinc-400 bg-zinc-800/30 px-3 py-1.5 rounded-lg">
              <Phone className="h-3.5 w-3.5 text-zinc-500" />
              <span dir="ltr" className="text-xs">{trainee.phone}</span>
            </div>
          )}
          {trainee.email && (
            <div className="flex items-center gap-1.5 text-sm text-zinc-400 bg-zinc-800/30 px-3 py-1.5 rounded-lg">
              <Mail className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-xs truncate max-w-[120px]">{trainee.email}</span>
            </div>
          )}
        </div>

        {/* Pair Members */}
        {trainee.is_pair && (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-zinc-400 bg-zinc-800/30 rounded-lg px-3 py-2 text-sm">
              <User className="h-4 w-4 text-zinc-500 flex-shrink-0" />
              <span className="truncate">{trainee.pair_name_1}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400 bg-zinc-800/30 rounded-lg px-3 py-2 text-sm">
              <User className="h-4 w-4 text-zinc-500 flex-shrink-0" />
              <span className="truncate">{trainee.pair_name_2}</span>
            </div>
          </div>
        )}

        {/* Last Workout */}
        {trainee.lastWorkout ? (
          <div className="bg-gradient-to-r from-zinc-800/40 to-zinc-800/20 rounded-lg p-3 border border-zinc-700/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Calendar className="h-4 w-4 text-zinc-500" />
                <span>אימון אחרון</span>
              </div>
              {daysSinceLastWorkout !== null && (
                <div className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {isActive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {daysSinceLastWorkout} ימים
                </div>
              )}
            </div>
            <p className="text-sm font-medium text-white">
              {new Date(trainee.lastWorkout).toLocaleDateString('he-IL', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </p>
          </div>
        ) : (
          <div className="bg-zinc-800/20 rounded-lg p-3 border border-zinc-700/20">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Clock className="h-4 w-4" />
              <span>אין אימונים עדיין</span>
            </div>
          </div>
        )}

        {/* Notes Preview */}
        {trainee.notes && (
          <div className="text-sm text-zinc-400 bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-amber-400">📝</span>
              <p className="line-clamp-2">{trainee.notes}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800/50">
        {unseenWeightsCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/15 text-cyan-400 rounded-lg text-xs font-semibold border border-cyan-500/30">
            <Scale className="h-3 w-3" />
            <span>{unseenWeightsCount} שקילות חדשות</span>
          </div>
        )}
        <div className="flex items-center text-sm text-zinc-500 group-hover:text-emerald-400 transition-colors ml-auto">
          <span>לפרופיל</span>
          <ChevronLeft className="h-4 w-4 mr-1" />
        </div>
      </div>
    </div>
  );
}

export default memo(TraineeCard);
