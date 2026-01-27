import { X } from 'lucide-react';

interface CreateNoteTemplateModalProps {
  data: { title: string; content: string };
  onChange: (data: { title: string; content: string }) => void;
  onSave: () => void;
  onClose: () => void;
}

export function CreateNoteTemplateModal({ data, onChange, onSave, onClose }: CreateNoteTemplateModalProps) {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-white/10 max-w-md w-full animate-fade-in">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">New Note Template</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all duration-300">
            <X className="h-5 w-5 text-muted400" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-muted300 mb-2">Title</label>
            <input
              type="text"
              value={data.title}
              onChange={(e) => onChange({ ...data, title: e.target.value })}
              className="w-full px-4 py-3 bg-surface800/80 border-2 border-border700/50 rounded-xl text-foreground focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
              placeholder="e.g., Drink Water"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-muted300 mb-2">Note Content</label>
            <textarea
              value={data.content}
              onChange={(e) => onChange({ ...data, content: e.target.value })}
              className="w-full px-4 py-3 bg-surface800/80 border-2 border-border700/50 rounded-xl text-foreground focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
              rows={3}
              placeholder="e.g., Drink a glass of water before each meal"
            />
          </div>
        </div>
        <div className="p-6 border-t border-white/10 flex gap-4">
          <button
            onClick={onSave}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-foreground py-3.5 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-emerald-500/25"
          >
            Save Template
          </button>
          <button onClick={onClose} className="flex-1 bg-surface700/50 hover:bg-surface700 text-muted300 py-3.5 rounded-xl font-semibold transition-all duration-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
