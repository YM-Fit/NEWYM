import { X } from 'lucide-react';

interface SaveTemplateModalProps {
  templateName: string;
  saving: boolean;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function SaveTemplateModal({ templateName, saving, onNameChange, onSave, onClose }: SaveTemplateModalProps) {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-white/10 max-w-md w-full animate-fade-in">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Save as Template</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all duration-300">
            <X className="h-5 w-5 text-muted400" />
          </button>
        </div>
        <div className="p-6">
          <label className="block text-sm font-semibold text-muted300 mb-2">Template Name</label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full px-4 py-3 bg-surface800/80 border-2 border-border700/50 rounded-xl text-foreground focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
            placeholder="e.g., 1800 calorie plan"
          />
        </div>
        <div className="p-6 border-t border-white/10 flex gap-4">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-foreground py-3.5 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-emerald-500/25"
          >
            {saving ? 'Saving...' : 'Save Template'}
          </button>
          <button onClick={onClose} className="flex-1 bg-surface700/50 hover:bg-surface700 text-muted300 py-3.5 rounded-xl font-semibold transition-all duration-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
