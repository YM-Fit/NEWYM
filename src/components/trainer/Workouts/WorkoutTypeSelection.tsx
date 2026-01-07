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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* Premium Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl shadow-xl p-4 md:p-6 mb-6">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <button
            onClick={onBack}
            className="p-3 hover:bg-white/10 rounded-xl transition-all duration-300 text-white"
          >
            <ArrowRight className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Dumbbell className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{trainee.full_name}</h1>
              <p className="text-emerald-100">בחר סוג אימון</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Pair Workout Card */}
          <button
            onClick={onSelectPair}
            className="bg-white rounded-2xl border-2 border-gray-100 hover:border-emerald-400 shadow-xl hover:shadow-2xl p-8 transition-all duration-300 group text-right"
          >
            <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center group-hover:from-emerald-200 group-hover:to-teal-200 transition-all duration-300 shadow-lg">
              <Users className="h-12 w-12 text-emerald-600 group-hover:text-emerald-700 transition-all duration-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 text-center group-hover:text-emerald-700 transition-all duration-300">אימון זוגי</h3>
            <p className="text-gray-600 text-center">{trainee.pair_name_1} ו{trainee.pair_name_2} ביחד</p>
            <div className="mt-4 py-2 px-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 text-center">
              <span className="text-sm font-medium text-emerald-700">לחץ להתחלה</span>
            </div>
          </button>

          {/* Personal Workout Card */}
          <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-xl hover:shadow-2xl p-6 transition-all duration-300">
            <div className="flex items-center justify-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center shadow-lg">
                <User className="h-10 w-10 text-blue-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-4">אימון אישי</h3>
            <p className="text-gray-600 text-center mb-6">בחר מי מגיע לאימון:</p>

            <div className="space-y-3">
              <button
                onClick={() => onSelectPersonal(1)}
                className="w-full bg-gradient-to-br from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 border-2 border-blue-200 hover:border-blue-400 text-blue-900 p-4 rounded-xl transition-all duration-300 font-medium shadow-md hover:shadow-lg group"
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center group-hover:from-blue-600 group-hover:to-cyan-700 transition-all duration-300">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  <span className="text-lg">{trainee.pair_name_1}</span>
                </div>
              </button>
              <button
                onClick={() => onSelectPersonal(2)}
                className="w-full bg-gradient-to-br from-teal-50 to-emerald-50 hover:from-teal-100 hover:to-emerald-100 border-2 border-teal-200 hover:border-teal-400 text-teal-900 p-4 rounded-xl transition-all duration-300 font-medium shadow-md hover:shadow-lg group"
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center group-hover:from-teal-600 group-hover:to-emerald-700 transition-all duration-300">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  <span className="text-lg">{trainee.pair_name_2}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
