import { X, Copy } from 'lucide-react';
import type { MealPlanTemplate } from '../types/mealPlanTypes';

interface LoadTemplateModalProps {
  templates: MealPlanTemplate[];
  onLoad: (template: MealPlanTemplate) => void;
  onClose: () => void;
}

export function LoadTemplateModal({ templates, onLoad, onClose }: LoadTemplateModalProps) {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-white/10 max-w-lg w-full max-h-[80vh] overflow-y-auto animate-fade-in">
        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-gradient-to-br from-gray-900 to-gray-800">
          <h2 className="text-xl font-bold text-white">Load from Template</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all duration-300">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6">
          {templates.length === 0 ? (
            <div className="text-center text-gray-500 py-12">No saved templates</div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onLoad(template)}
                  className="w-full text-right p-5 border-2 border-gray-700/50 rounded-2xl hover:border-emerald-500/30 hover:bg-gradient-to-br hover:from-emerald-500/5 hover:to-teal-500/5 transition-all duration-300 group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white group-hover:text-emerald-300 transition-colors">{template.name}</p>
                      {template.description && (
                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                      )}
                      <div className="flex gap-4 mt-3 text-xs text-gray-500">
                        {template.daily_calories && <span>{template.daily_calories} cal</span>}
                        {template.protein_grams && <span>{template.protein_grams}g protein</span>}
                      </div>
                    </div>
                    <Copy className="h-5 w-5 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
