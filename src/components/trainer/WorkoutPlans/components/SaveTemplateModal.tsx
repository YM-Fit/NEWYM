import React, { useState } from 'react';
import { themeColors } from '@/utils/themeColors';

interface SaveTemplateModalProps {
  isOpen: boolean;
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  onSave: (isGeneral: boolean) => void;
  onClose: () => void;
  traineeName?: string;
}

export default function SaveTemplateModal({
  isOpen,
  templateName,
  onTemplateNameChange,
  onSave,
  onClose,
  traineeName,
}: SaveTemplateModalProps) {
  const [isGeneralTemplate, setIsGeneralTemplate] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transition-all duration-300">
        <h3 className="text-2xl font-bold text-muted900 mb-4">שמור כתבנית</h3>
        <p className="text-muted600 mb-6">תוכל לטעון תבנית זו בעתיד</p>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-muted700 mb-2">שם התבנית</label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => onTemplateNameChange(e.target.value)}
            className="w-full px-4 py-4 border-2 border-border200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 text-lg"
            placeholder="לדוגמה: תוכנית כוח בסיסית"
            autoFocus
          />
        </div>

        {/* Template Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-muted700 mb-3">סוג תבנית</label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all hover:bg-surface50"
              style={{
                borderColor: isGeneralTemplate ? themeColors.primary : themeColors.borderLight,
                backgroundColor: isGeneralTemplate ? themeColors.primary50 : 'transparent'
              }}>
              <input
                type="radio"
                name="templateType"
                checked={isGeneralTemplate}
                onChange={() => setIsGeneralTemplate(true)}
                className="w-5 h-5 text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1">
                <div className="font-semibold text-muted900">תבנית כללית</div>
                <div className="text-sm text-muted600">ניתן להשתמש עם כל המתאמנים</div>
              </div>
            </label>
            {traineeName && (
              <label className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all hover:bg-surface50"
                style={{
                  borderColor: !isGeneralTemplate ? themeColors.primary : themeColors.borderLight,
                  backgroundColor: !isGeneralTemplate ? themeColors.primary50 : 'transparent'
                }}>
                <input
                  type="radio"
                  name="templateType"
                  checked={!isGeneralTemplate}
                  onChange={() => setIsGeneralTemplate(false)}
                  className="w-5 h-5 text-primary-600 focus:ring-primary-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-muted900">תבנית למתאמן זה</div>
                  <div className="text-sm text-muted600">ספציפי ל-{traineeName}</div>
                </div>
              </label>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onSave(isGeneralTemplate)}
            className="flex-1 py-4 bg-gradient-to-br from-primary-700 to-primary-800 hover:from-primary-800 hover:to-primary-800 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            שמור
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-surface200 hover:bg-surface300 text-muted700 font-bold rounded-xl transition-all duration-300"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
