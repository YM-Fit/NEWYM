import { AlertCircle, FileText, Trash2 } from 'lucide-react';

interface DraftModalProps {
  title: string;
  message: string;
  onRestore: () => void;
  onDiscard: () => void;
}

export default function DraftModal({ title, message, onRestore, onDiscard }: DraftModalProps) {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/70 flex items-center justify-center z-50 p-4 transition-all">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-cyan-500 p-6">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">{title}</h2>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-2 rtl:space-x-reverse">
              <div className="bg-amber-500 p-1.5 rounded-lg flex-shrink-0">
                <AlertCircle className="h-4 w-4 text-white" />
              </div>
              <p className="text-zinc-300 text-base leading-relaxed">{message}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onDiscard}
              className="flex items-center justify-center space-x-2 rtl:space-x-reverse px-6 py-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 active:bg-red-500/30 transition-all font-semibold group"
            >
              <Trash2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span>התחל מחדש</span>
            </button>
            <button
              onClick={onRestore}
              className="flex items-center justify-center space-x-2 rtl:space-x-reverse px-6 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold transition-all group"
            >
              <FileText className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span>טען טיוטה</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
