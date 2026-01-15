import { X, Plus } from 'lucide-react';
import type { NoteTemplate } from '../types/mealPlanTypes';

interface NoteTemplateModalProps {
  templates: NoteTemplate[];
  onSelect: (template: NoteTemplate) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

export function NoteTemplateModal({ templates, onSelect, onCreateNew, onClose }: NoteTemplateModalProps) {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-white/10 max-w-md w-full max-h-[80vh] overflow-y-auto animate-fade-in">
        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-gradient-to-br from-gray-900 to-gray-800">
          <h2 className="text-xl font-bold text-white">Add Note from Template</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all duration-300">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className="w-full text-right p-5 border-2 border-gray-700/50 rounded-2xl hover:border-emerald-500/30 hover:bg-gradient-to-br hover:from-emerald-500/5 hover:to-teal-500/5 transition-all duration-300 group"
            >
              <p className="font-semibold text-white group-hover:text-emerald-300 transition-colors">{template.title}</p>
              <p className="text-sm text-gray-500 mt-2">{template.content}</p>
            </button>
          ))}
          <button
            onClick={onCreateNew}
            className="w-full p-5 border-2 border-dashed border-gray-700/50 rounded-2xl text-gray-500 hover:text-emerald-400 hover:border-emerald-500/30 transition-all duration-300 flex items-center justify-center gap-3"
          >
            <Plus className="h-5 w-5" />
            Create New Template
          </button>
        </div>
      </div>
    </div>
  );
}
