import { User, Users, ArrowRight, Dumbbell } from 'lucide-react';

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
  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] transition-colors duration-300 p-4 md:p-6">
      <div className="premium-card-static p-6 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-surface text-muted hover:text-foreground hover:bg-elevated/50 transition-all"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/15">
              <Dumbbell className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{trainee.full_name}</h1>
              <p className="text-sm text-muted">בחר סוג אימון</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <button
            onClick={onSelectPair}
            className="premium-card-static p-8 text-right group hover:border-emerald-500/30 transition-all"
          >
            <div className="w-20 h-20 mx-auto mb-4 bg-emerald-500/15 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500/25 transition-all">
              <Users className="h-10 w-10 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2 text-center group-hover:text-emerald-400 transition-all">אימון זוגי</h3>
            <p className="text-muted text-center">{trainee.pairName1 || ''} (1) ו{trainee.pairName2 || ''} (2) ביחד</p>
            <div className="mt-4 py-2 px-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-center">
              <span className="text-sm font-medium text-emerald-400">לחץ להתחלה</span>
            </div>
          </button>

          <div className="premium-card-static p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-blue-500/15 rounded-2xl flex items-center justify-center">
                <User className="h-8 w-8 text-blue-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-foreground text-center mb-4">אימון אישי</h3>
            <p className="text-muted text-center mb-6">בחר מי מגיע לאימון:</p>

            <div className="space-y-3">
              <button
                onClick={() => onSelectPersonal(1)}
                className="w-full bg-surface hover:bg-blue-500/15 border border-border hover:border-blue-500/30 text-foreground p-4 rounded-xl transition-all font-medium group"
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/20 group-hover:bg-blue-500/30 rounded-lg flex items-center justify-center transition-all">
                    <span className="text-blue-400 font-bold text-sm">1</span>
                  </div>
                  <span className="text-lg group-hover:text-blue-400 transition-all">{trainee.pairName1 || ''} (1)</span>
                </div>
              </button>
              <button
                onClick={() => onSelectPersonal(2)}
                className="w-full bg-surface hover:bg-amber-500/15 border border-border hover:border-amber-500/30 text-foreground p-4 rounded-xl transition-all font-medium group"
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="w-8 h-8 bg-amber-500/20 group-hover:bg-amber-500/30 rounded-lg flex items-center justify-center transition-all">
                    <span className="text-amber-400 font-bold text-sm">2</span>
                  </div>
                  <span className="text-lg group-hover:text-amber-400 transition-all">{trainee.pairName2 || ''} (2)</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
