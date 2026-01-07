import { AlertCircle, FileText, Trash2 } from 'lucide-react';

interface DraftModalProps {
  title: string;
  message: string;
  onRestore: () => void;
  onDiscard: () => void;
}

export default function DraftModal({ title, message, onRestore, onDiscard }: DraftModalProps) {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-fade-in hover:shadow-2xl transition-all duration-300">
        {/* Premium gradient header */}
        <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600 p-6">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl shadow-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">{title}</h2>
          </div>
        </div>

        <div className="p-6">
          {/* Warning message with amber styling */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4 mb-6 shadow-md">
            <div className="flex items-start space-x-2 rtl:space-x-reverse">
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-1.5 rounded-lg shadow-md flex-shrink-0">
                <AlertCircle className="h-4 w-4 text-white" />
              </div>
              <p className="text-gray-700 text-base leading-relaxed">{message}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onDiscard}
              className="flex items-center justify-center space-x-2 rtl:space-x-reverse px-6 py-4 rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-rose-100 text-red-700 hover:from-red-100 hover:to-rose-200 hover:shadow-lg active:shadow-md transition-all duration-300 font-semibold group"
            >
              <Trash2 className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
              <span>התחל מחדש</span>
            </button>
            <button
              onClick={onRestore}
              className="flex items-center justify-center space-x-2 rtl:space-x-reverse px-6 py-4 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 hover:shadow-xl active:shadow-lg transition-all duration-300 font-semibold shadow-lg group"
            >
              <FileText className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
              <span>טען טיוטה</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
