import { X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface QuickNumericPadProps {
  value: number;
  label: string;
  onConfirm: (value: number) => void;
  onClose: () => void;
  step?: number;
  allowDecimal?: boolean;
}

export default function QuickNumericPad({
  value,
  label,
  onConfirm,
  onClose,
  allowDecimal = false
}: QuickNumericPadProps) {
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const buttons = allowDecimal
    ? [
        { label: '+0.5', value: 0.5 },
        { label: '+1', value: 1 },
        { label: '+2.5', value: 2.5 },
        { label: '+5', value: 5 },
        { label: '+10', value: 10 },
        { label: '+20', value: 20 },
      ]
    : [
        { label: '+1', value: 1 },
        { label: '+2', value: 2 },
        { label: '+3', value: 3 },
        { label: '+5', value: 5 },
        { label: '+10', value: 10 },
        { label: '+20', value: 20 },
      ];

  const handleAdd = (amount: number) => {
    setCurrentValue(prev => {
      const newValue = prev + amount;
      return allowDecimal ? Math.round(newValue * 10) / 10 : Math.round(newValue);
    });
  };

  const handleReset = () => {
    setCurrentValue(0);
  };

  const handleConfirm = () => {
    onConfirm(currentValue);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 lg:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl lg:text-4xl font-bold text-gray-900">{label}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-3 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="h-7 w-7 lg:h-9 lg:w-9" />
          </button>
        </div>

        <div className="mb-8">
          <div className="bg-green-50 border-4 border-green-500 rounded-2xl p-8 text-center">
            <div className="text-6xl lg:text-8xl font-bold text-green-600 tabular-nums">
              {currentValue}
            </div>
            <div className="text-xl lg:text-2xl text-gray-600 mt-2">
              {allowDecimal ? 'ק"ג' : ''}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-6">
          {buttons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={() => handleAdd(btn.value)}
              className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white py-8 lg:py-12 px-4 rounded-2xl text-3xl lg:text-4xl font-bold transition-all shadow-lg hover:shadow-xl active:scale-95 touch-manipulation"
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={handleReset}
            className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white py-6 lg:py-8 px-6 rounded-2xl text-2xl lg:text-3xl font-bold transition-all shadow-lg hover:shadow-xl active:scale-95 touch-manipulation"
          >
            איפוס
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white py-6 lg:py-8 px-6 rounded-2xl text-2xl lg:text-3xl font-bold transition-all shadow-lg hover:shadow-xl active:scale-95 touch-manipulation"
          >
            אישור ✓
          </button>
        </div>
      </div>
    </div>
  );
}
