import React from 'react';

interface SaveTemplateModalProps {
  isOpen: boolean;
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function SaveTemplateModal({
  isOpen,
  templateName,
  onTemplateNameChange,
  onSave,
  onClose,
}: SaveTemplateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transition-all duration-300">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">שמור כתבנית</h3>
        <p className="text-gray-600 mb-6">תוכל לטעון תבנית זו בעתיד</p>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">שם התבנית</label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => onTemplateNameChange(e.target.value)}
            className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-lg"
            placeholder="לדוגמה: תוכנית כוח בסיסית"
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onSave}
            className="flex-1 py-4 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            שמור
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-all duration-300"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
