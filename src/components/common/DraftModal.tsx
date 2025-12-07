import { AlertCircle, FileText, Trash2 } from 'lucide-react';

interface DraftModalProps {
  title: string;
  message: string;
  onRestore: () => void;
  onDiscard: () => void;
}

export default function DraftModal({ title, message, onRestore, onDiscard }: DraftModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
        <div className="flex items-center space-x-3 rtl:space-x-reverse mb-4">
          <div className="bg-blue-100 p-3 rounded-xl">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-2 rtl:space-x-reverse">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-gray-700 text-base leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onDiscard}
            className="flex items-center justify-center space-x-2 rtl:space-x-reverse px-6 py-4 rounded-xl border-2 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200 transition-all font-semibold"
          >
            <Trash2 className="h-5 w-5" />
            <span>התחל מחדש</span>
          </button>
          <button
            onClick={onRestore}
            className="flex items-center justify-center space-x-2 rtl:space-x-reverse px-6 py-4 rounded-xl bg-green-500 text-white hover:bg-green-600 active:bg-green-700 transition-all font-semibold shadow-lg"
          >
            <FileText className="h-5 w-5" />
            <span>טען טיוטה</span>
          </button>
        </div>
      </div>
    </div>
  );
}
