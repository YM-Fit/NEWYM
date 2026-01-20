import React from 'react';
import { Dumbbell } from 'lucide-react';
import type { WorkoutPlanTemplate } from '../types';

interface LoadTemplateModalProps {
  isOpen: boolean;
  templates: WorkoutPlanTemplate[];
  onLoad: (template: WorkoutPlanTemplate) => void;
  onClose: () => void;
}

export default function LoadTemplateModal({
  isOpen,
  templates,
  onLoad,
  onClose,
}: LoadTemplateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col transition-all duration-300">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-blue-50 to-sky-50">
          <h3 className="text-2xl font-bold text-gray-900">בחר תבנית</h3>
          <p className="text-gray-600 mt-1">טען תוכנית אימון מוכנה מראש</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Dumbbell className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-lg font-medium text-theme-primary">אין תבניות שמורות</p>
              <p className="text-sm text-theme-muted mt-2">צור תוכנית ושמור אותה כתבנית</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onLoad(template)}
                  className="w-full text-right p-5 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-sky-50 border-2 border-gray-200 hover:border-blue-400 rounded-2xl transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  <h4 className="font-bold text-gray-900 text-lg">{template.name}</h4>
                  {template.description && (
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2 font-medium">
                    {template.days?.length || 0} ימי אימון
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-all duration-300"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
