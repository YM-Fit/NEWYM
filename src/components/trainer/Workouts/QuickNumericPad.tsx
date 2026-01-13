import { X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface QuickNumericPadProps {
  value: number;
  label: string;
  onConfirm: (value: number) => void;
  onClose: () => void;
  step?: number;
  allowDecimal?: boolean;
  minValue?: number;
  maxValue?: number;
}

export default function QuickNumericPad({
  value,
  label,
  onConfirm,
  onClose,
  allowDecimal = false,
  minValue,
  maxValue
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

  const isRpeMode = maxValue === 10 && minValue === 1;

  const buttons = isRpeMode
    ? [
        { label: '1', value: 1, isAbsolute: true },
        { label: '2', value: 2, isAbsolute: true },
        { label: '3', value: 3, isAbsolute: true },
        { label: '4', value: 4, isAbsolute: true },
        { label: '5', value: 5, isAbsolute: true },
        { label: '6', value: 6, isAbsolute: true },
        { label: '7', value: 7, isAbsolute: true },
        { label: '8', value: 8, isAbsolute: true },
        { label: '9', value: 9, isAbsolute: true },
        { label: '10', value: 10, isAbsolute: true },
      ]
    : allowDecimal
    ? [
        { label: '+0.5', value: 0.5, isAbsolute: false },
        { label: '+1', value: 1, isAbsolute: false },
        { label: '+2.5', value: 2.5, isAbsolute: false },
        { label: '+5', value: 5, isAbsolute: false },
        { label: '+10', value: 10, isAbsolute: false },
        { label: '+20', value: 20, isAbsolute: false },
      ]
    : [
        { label: '+1', value: 1, isAbsolute: false },
        { label: '+2', value: 2, isAbsolute: false },
        { label: '+3', value: 3, isAbsolute: false },
        { label: '+5', value: 5, isAbsolute: false },
        { label: '+10', value: 10, isAbsolute: false },
        { label: '+20', value: 20, isAbsolute: false },
      ];

  const handleAdd = (amount: number, isAbsolute: boolean = false) => {
    setCurrentValue(prev => {
      let newValue = isAbsolute ? amount : prev + amount;
      if (minValue !== undefined && newValue < minValue) newValue = minValue;
      if (maxValue !== undefined && newValue > maxValue) newValue = maxValue;
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
      className="fixed inset-0 backdrop-blur-sm bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 lg:p-10 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl lg:text-4xl font-bold text-emerald-400">
            {label}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-3 hover:bg-zinc-800 rounded-xl transition-all"
          >
            <X className="h-7 w-7 lg:h-9 lg:w-9 text-zinc-500" />
          </button>
        </div>

        <div className="mb-8">
          <div className="bg-zinc-800/50 border-4 border-emerald-500/50 rounded-2xl p-8 text-center">
            <div className="text-6xl lg:text-8xl font-bold text-emerald-400 tabular-nums">
              {currentValue}
            </div>
            <div className="text-xl lg:text-2xl text-zinc-500 mt-2 font-medium">
              {allowDecimal ? 'kg' : ''}
            </div>
          </div>
        </div>

        <div className={`grid gap-3 lg:gap-4 mb-6 ${isRpeMode ? 'grid-cols-5' : 'grid-cols-3'}`}>
          {buttons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={() => handleAdd(btn.value, btn.isAbsolute)}
              className={`${
                isRpeMode && currentValue === btn.value
                  ? 'bg-emerald-500 ring-4 ring-emerald-500/30'
                  : 'bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 text-cyan-400'
              } ${isRpeMode && currentValue === btn.value ? 'text-white' : ''} ${isRpeMode ? 'py-6 lg:py-8' : 'py-8 lg:py-12'} px-4 rounded-xl text-3xl lg:text-4xl font-bold transition-all active:scale-95 touch-manipulation`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={handleReset}
            className="bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-400 py-6 lg:py-8 px-6 rounded-xl text-2xl lg:text-3xl font-bold transition-all active:scale-95 touch-manipulation"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="bg-emerald-500 hover:bg-emerald-600 text-white py-6 lg:py-8 px-6 rounded-xl text-2xl lg:text-3xl font-bold transition-all active:scale-95 touch-manipulation"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
