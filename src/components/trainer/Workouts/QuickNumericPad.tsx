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
      className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 lg:p-10 transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Premium Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            {label}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-3 hover:bg-gray-100 rounded-xl transition-all duration-300"
          >
            <X className="h-7 w-7 lg:h-9 lg:w-9 text-gray-500" />
          </button>
        </div>

        {/* Premium Display Area */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-100 border-4 border-emerald-400 rounded-2xl p-8 text-center shadow-xl">
            <div className="text-6xl lg:text-8xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent tabular-nums">
              {currentValue}
            </div>
            <div className="text-xl lg:text-2xl text-emerald-700 mt-2 font-medium">
              {allowDecimal ? 'kg' : ''}
            </div>
          </div>
        </div>

        {/* Premium Number Buttons */}
        <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-6">
          {buttons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={() => handleAdd(btn.value)}
              className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 active:from-blue-700 active:to-blue-800 text-white py-8 lg:py-12 px-4 rounded-xl text-3xl lg:text-4xl font-bold transition-all duration-300 shadow-lg hover:shadow-2xl active:scale-95 touch-manipulation"
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={handleReset}
            className="bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:from-amber-700 active:to-amber-800 text-white py-6 lg:py-8 px-6 rounded-xl text-2xl lg:text-3xl font-bold transition-all duration-300 shadow-lg hover:shadow-2xl active:scale-95 touch-manipulation"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:from-emerald-700 active:to-teal-800 text-white py-6 lg:py-8 px-6 rounded-xl text-2xl lg:text-3xl font-bold transition-all duration-300 shadow-lg hover:shadow-2xl active:scale-95 touch-manipulation"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
