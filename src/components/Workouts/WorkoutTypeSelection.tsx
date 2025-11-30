import { User, Users, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-6">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <button
            onClick={onBack}
            className="p-3 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowRight className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{trainee.full_name}</h1>
            <p className="text-gray-600">בחר סוג אימון</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <button
            onClick={onSelectPair}
            className="bg-white rounded-xl border-2 border-gray-200 hover:border-green-500 hover:shadow-lg p-8 transition-all group"
          >
            <Users className="h-20 w-20 mx-auto mb-4 text-gray-400 group-hover:text-green-600 transition-colors" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">אימון זוגי</h3>
            <p className="text-gray-600">{trainee.pair_name_1} ו{trainee.pair_name_2} ביחד</p>
          </button>

          <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
            <div className="flex items-center justify-center mb-4">
              <User className="h-16 w-16 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-4">אימון אישי</h3>
            <p className="text-gray-600 text-center mb-6">בחר מי מגיע לאימון:</p>

            <div className="space-y-3">
              <button
                onClick={() => onSelectPersonal(1)}
                className="w-full bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-400 text-blue-900 p-4 rounded-xl transition-all font-medium"
              >
                {trainee.pair_name_1}
              </button>
              <button
                onClick={() => onSelectPersonal(2)}
                className="w-full bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 hover:border-purple-400 text-purple-900 p-4 rounded-xl transition-all font-medium"
              >
                {trainee.pair_name_2}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
