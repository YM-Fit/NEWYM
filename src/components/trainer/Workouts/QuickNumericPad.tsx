import { X } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

interface QuickNumericPadProps {
  value: number;
  label: string;
  onConfirm: (value: number) => void;
  onClose: () => void;
  step?: number;
  allowDecimal?: boolean;
  minValue?: number;
  maxValue?: number;
  compact?: boolean; // גרסה קטנה יותר לאימון זוגי
  isTablet?: boolean;
}

export default function QuickNumericPad({
  value,
  label,
  onConfirm,
  onClose,
  allowDecimal = false,
  minValue,
  maxValue,
  compact = false,
  isTablet
}: QuickNumericPadProps) {
  const [currentValue, setCurrentValue] = useState(value);
  const [inputValue, setInputValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);
  const isRpeMode = maxValue === 10 && minValue === 1;

  useEffect(() => {
    setCurrentValue(value);
    setInputValue(value.toString());
  }, [value]);

  useEffect(() => {
    // Focus input on mount only if not tablet
    if (inputRef.current && !isTablet) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isTablet]);

  const handleAdd = useCallback((amount: number, isAbsolute: boolean = false) => {
    setCurrentValue(prev => {
      let newValue = isAbsolute ? amount : prev + amount;
      if (minValue !== undefined && newValue < minValue) newValue = minValue;
      if (maxValue !== undefined && newValue > maxValue) newValue = maxValue;
      const finalValue = allowDecimal ? Math.round(newValue * 10) / 10 : Math.round(newValue);
      setInputValue(finalValue.toString());
      return finalValue;
    });
  }, [allowDecimal, minValue, maxValue]);

  const handleConfirm = useCallback(() => {
    const finalValue = allowDecimal ? parseFloat(inputValue) : parseInt(inputValue);
    if (!isNaN(finalValue)) {
      const clamped = minValue !== undefined && finalValue < minValue ? minValue :
                    maxValue !== undefined && finalValue > maxValue ? maxValue : finalValue;
      onConfirm(clamped);
    } else {
      onConfirm(currentValue);
    }
  }, [allowDecimal, inputValue, currentValue, minValue, maxValue, onConfirm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && document.activeElement !== inputRef.current) {
        const finalValue = allowDecimal ? parseFloat(inputValue) : parseInt(inputValue);
        if (!isNaN(finalValue)) {
          const clamped = minValue !== undefined && finalValue < minValue ? minValue :
                        maxValue !== undefined && finalValue > maxValue ? maxValue : finalValue;
          onConfirm(clamped);
        } else {
          onConfirm(currentValue);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleAdd(allowDecimal ? 0.5 : 1, false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleAdd(allowDecimal ? -0.5 : -1, false);
      } else if (e.key >= '0' && e.key <= '9' && document.activeElement !== inputRef.current) {
        // Allow direct number input when not focused on input
        const num = parseInt(e.key);
        if (isRpeMode) {
          if (num >= 1 && num <= 10) {
            handleAdd(num, true);
          }
        } else {
          setCurrentValue(prev => {
            const newValue = prev * 10 + num;
            const clamped = minValue !== undefined && newValue < minValue ? minValue :
                          maxValue !== undefined && newValue > maxValue ? maxValue : newValue;
            return allowDecimal ? Math.round(clamped * 10) / 10 : Math.round(clamped);
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, allowDecimal, minValue, maxValue, isRpeMode, inputValue, currentValue, onConfirm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Allow empty input for better UX
    if (input === '' || input === '-') {
      setInputValue(input);
      return;
    }
    
    const num = allowDecimal ? parseFloat(input) : parseInt(input);
    if (!isNaN(num)) {
      const clamped = minValue !== undefined && num < minValue ? minValue :
                    maxValue !== undefined && num > maxValue ? maxValue : num;
      setCurrentValue(clamped);
      setInputValue(input);
    }
  };

  const handleInputBlur = () => {
    // Validate and clamp on blur
    const num = allowDecimal ? parseFloat(inputValue) : parseInt(inputValue);
    if (isNaN(num) || num < (minValue || 0)) {
      setInputValue((minValue || 0).toString());
      setCurrentValue(minValue || 0);
    } else if (maxValue !== undefined && num > maxValue) {
      setInputValue(maxValue.toString());
      setCurrentValue(maxValue);
    } else {
      setInputValue(currentValue.toString());
    }
  };

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

  const handleReset = useCallback(() => {
    const resetValue = minValue || 0;
    setCurrentValue(resetValue);
    setInputValue(resetValue.toString());
  }, [minValue]);

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl ${compact ? 'max-w-md w-full p-4' : 'max-w-2xl w-full p-6 lg:p-10'} transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between ${compact ? 'mb-4' : 'mb-6'}`}>
          <h2 className={`font-bold text-emerald-400 ${compact ? 'text-xl' : 'text-2xl lg:text-4xl'}`}>
            {label}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-3 hover:bg-zinc-800 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            aria-label="סגור לוח מספרים"
          >
            <X className="h-7 w-7 lg:h-9 lg:w-9 text-zinc-500" aria-hidden="true" />
          </button>
        </div>

        <div className={compact ? 'mb-4' : 'mb-8'}>
          <div className={`bg-zinc-800/50 border-4 border-emerald-500/50 rounded-2xl ${compact ? 'p-4' : 'p-8'} text-center`}>
            {isTablet ? (
              // On tablet, use div instead of input to completely prevent keyboard
              <div
                className={`w-full bg-transparent font-bold text-emerald-400 tabular-nums text-center ${compact ? 'text-4xl' : 'text-6xl lg:text-8xl'}`}
                aria-label={`${label} - ${inputValue}${allowDecimal ? ' קילוגרמים' : isRpeMode ? ' RPE' : ' חזרות'}`}
                role="textbox"
                tabIndex={-1}
                onTouchStart={(e) => e.preventDefault()}
                onTouchEnd={(e) => e.preventDefault()}
              >
                {inputValue}
              </div>
            ) : (
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirm();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    onClose();
                  }
                }}
                aria-label={`${label} - הזן ערך${allowDecimal ? ' בקילוגרמים' : isRpeMode ? ' RPE' : ' בחזרות'}`}
                aria-describedby="numeric-pad-instructions"
                className={`w-full bg-transparent font-bold text-emerald-400 tabular-nums text-center border-none outline-none focus:ring-0 ${compact ? 'text-4xl' : 'text-6xl lg:text-8xl'}`}
                style={{ caretColor: 'transparent' }}
              />
            )}
            <div className={`text-zinc-500 mt-2 font-medium ${compact ? 'text-base' : 'text-xl lg:text-2xl'}`} aria-hidden="true">
              {allowDecimal ? 'kg' : isRpeMode ? 'RPE' : 'reps'}
            </div>
            <div id="numeric-pad-instructions" className="sr-only">
              לחץ Enter לאישור, Esc לביטול, או השתמש בחצים למעלה ולמטה לשינוי הערך
            </div>
            {!compact && (
              <div className="text-sm text-zinc-600 mt-2" aria-hidden="true">
                {isTablet ? 'השתמש בכפתורים למטה' : 'לחץ Enter לאישור • Esc לביטול • חצים למעלה/למטה'}
              </div>
            )}
          </div>
        </div>

        <div className={`grid ${compact ? 'gap-2 mb-4' : 'gap-3 lg:gap-4 mb-6'} ${isRpeMode ? 'grid-cols-5' : 'grid-cols-3'}`} dir="rtl" role="group" aria-label="כפתורי מספרים">
          {buttons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAdd(btn.value, btn.isAbsolute);
              }}
              aria-label={`הוסף ${btn.label}${isRpeMode ? ' RPE' : allowDecimal ? ' קילוגרם' : ' חזרות'}`}
              aria-pressed={isRpeMode && currentValue === btn.value}
              className={`${
                isRpeMode && currentValue === btn.value
                  ? 'bg-emerald-500 ring-4 ring-emerald-500/30'
                  : 'bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 text-cyan-400'
              } ${isRpeMode && currentValue === btn.value ? 'text-white' : ''} ${compact ? (isRpeMode ? 'py-3' : 'py-4') : (isRpeMode ? 'py-6 lg:py-8' : 'py-8 lg:py-12')} px-4 rounded-xl ${compact ? 'text-xl' : 'text-3xl lg:text-4xl'} font-bold transition-all active:scale-95 touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-4'}`} dir="rtl" role="group" aria-label="פעולות">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleReset();
            }}
            aria-label="איפוס ערך"
            className={`bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-400 ${compact ? 'py-3 px-4 rounded-xl text-lg' : 'py-6 lg:py-8 px-6 rounded-xl text-2xl lg:text-3xl'} font-bold transition-all active:scale-95 touch-manipulation focus:outline-none focus:ring-2 focus:ring-amber-500/50`}
          >
            איפוס
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleConfirm();
            }}
            aria-label={`אישור ערך${allowDecimal ? ' בקילוגרמים' : isRpeMode ? ' RPE' : ' בחזרות'}`}
            className={`bg-emerald-500 hover:bg-emerald-600 text-white ${compact ? 'py-3 px-4 rounded-xl text-lg' : 'py-6 lg:py-8 px-6 rounded-xl text-2xl lg:text-3xl'} font-bold transition-all active:scale-95 touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
          >
            אישור
          </button>
        </div>
      </div>
    </div>
  );
}
