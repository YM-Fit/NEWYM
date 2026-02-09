import { User, Users, ArrowRight, Dumbbell, Sparkles } from 'lucide-react';
import { useCallback, useMemo } from 'react';

interface WorkoutTypeSelectionProps {
  trainee: any;
  onSelectPersonal: (memberIndex: 1 | 2) => void;
  onSelectPair: () => void;
  onBack: () => void;
}

export default function WorkoutTypeSelection({
  trainee,
  onSelectPersonal,
  onSelectPair,
  onBack
}: WorkoutTypeSelectionProps) {
  const pairName1 = useMemo(() => trainee.pairName1 || trainee.pair_name_1 || 'חבר 1', [trainee]);
  const pairName2 = useMemo(() => trainee.pairName2 || trainee.pair_name_2 || 'חבר 2', [trainee]);
  const traineeName = useMemo(() => trainee.full_name || trainee.name, [trainee]);

  const handleSelectPersonal1 = useCallback(() => {
    onSelectPersonal(1);
  }, [onSelectPersonal]);

  const handleSelectPersonal2 = useCallback(() => {
    onSelectPersonal(2);
  }, [onSelectPersonal]);

  const handleSelectPair = useCallback(() => {
    onSelectPair();
  }, [onSelectPair]);

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] transition-colors duration-300 p-4 sm:p-6 animate-fade-in">
      <div className="premium-card-static p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onBack}
            className="p-2 sm:p-2.5 rounded-xl bg-surface text-muted hover:text-foreground hover:bg-elevated/50 transition-all flex-shrink-0"
            aria-label="חזור"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="p-2 sm:p-3 rounded-xl bg-emerald-500/15 flex-shrink-0">
              <Dumbbell className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">סוג אימון</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">{traineeName}</h1>
              <p className="text-xs sm:text-sm text-muted">בחר סוג אימון</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Pair Workout */}
          <button
            onClick={handleSelectPair}
            className="premium-card-static p-6 sm:p-8 text-center group hover:border-emerald-500/30 hover:shadow-lg transition-all cursor-pointer"
            aria-label="אימון זוגי"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-emerald-500/15 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500/25 group-hover:scale-110 transition-all">
              <Users className="h-8 w-8 sm:h-10 sm:w-10 text-emerald-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 group-hover:text-emerald-400 transition-all">אימון זוגי</h3>
            <p className="text-sm sm:text-base text-muted mb-4">
              {pairName1} (1) ו-{pairName2} (2) ביחד
            </p>
            <div className="mt-4 py-2 px-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl">
              <span className="text-xs sm:text-sm font-medium text-emerald-400">לחץ להתחלה</span>
            </div>
          </button>

          {/* Personal Workout */}
          <div className="premium-card-static p-4 sm:p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-500/15 rounded-2xl flex items-center justify-center">
                <User className="h-7 w-7 sm:h-8 sm:w-8 text-blue-400" />
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-foreground text-center mb-3 sm:mb-4">אימון אישי</h3>
            <p className="text-xs sm:text-sm text-muted text-center mb-4 sm:mb-6">בחר מי מגיע לאימון:</p>

            <div className="space-y-2 sm:space-y-3">
              <button
                onClick={handleSelectPersonal1}
                className="w-full bg-surface hover:bg-blue-500/15 border border-border hover:border-blue-500/30 text-foreground p-3 sm:p-4 rounded-xl transition-all font-medium group active:scale-95"
                aria-label={`אימון אישי - ${pairName1}`}
              >
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 bg-blue-500/20 group-hover:bg-blue-500/30 rounded-lg flex items-center justify-center transition-all">
                    <span className="text-blue-400 font-bold text-sm">1</span>
                  </div>
                  <span className="text-base sm:text-lg group-hover:text-blue-400 transition-all">{pairName1} (1)</span>
                </div>
              </button>
              <button
                onClick={handleSelectPersonal2}
                className="w-full bg-surface hover:bg-amber-500/15 border border-border hover:border-amber-500/30 text-foreground p-3 sm:p-4 rounded-xl transition-all font-medium group active:scale-95"
                aria-label={`אימון אישי - ${pairName2}`}
              >
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 bg-amber-500/20 group-hover:bg-amber-500/30 rounded-lg flex items-center justify-center transition-all">
                    <span className="text-amber-400 font-bold text-sm">2</span>
                  </div>
                  <span className="text-base sm:text-lg group-hover:text-amber-400 transition-all">{pairName2} (2)</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
