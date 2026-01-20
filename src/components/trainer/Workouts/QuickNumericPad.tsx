import { X } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useIsTouchDevice } from '../../../hooks/useIsTouchDevice';

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
  const isRpeMode = maxValue === 10 && minValue === 1;
  const isTouchDevice = useIsTouchDevice();
  const preventKeyboard = isTablet || isTouchDevice;
  const padRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentValue(value);
    setInputValue(value.toString());
  }, [value]);

  // Prevent keyboard from opening on touch devices - disable all inputs when pad is open
  useEffect(() => {
    if (!preventKeyboard) return;

    // Disable all inputs/textarea/contentEditable elements in the document
    const disableInputs = () => {
      const inputs = document.querySelectorAll('input, textarea, [contenteditable="true"]');
      inputs.forEach((input) => {
        if (input instanceof HTMLElement) {
          input.setAttribute('readonly', 'true');
          input.setAttribute('inputmode', 'none');
          input.style.pointerEvents = 'none';
          input.setAttribute('data-numeric-pad-disabled', 'true');
        }
      });
    };

    // Re-enable inputs when pad closes
    const enableInputs = () => {
      const inputs = document.querySelectorAll('[data-numeric-pad-disabled="true"]');
      inputs.forEach((input) => {
        if (input instanceof HTMLElement) {
          input.removeAttribute('readonly');
          input.removeAttribute('inputmode');
          input.style.pointerEvents = '';
          input.removeAttribute('data-numeric-pad-disabled');
        }
      });
    };

    // Prevent focus on any element when pad is open
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && padRef.current && !padRef.current.contains(target)) {
        // If focus is outside the pad, blur it
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
          target.blur();
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    // Prevent touch events that might trigger keyboard
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target && padRef.current && !padRef.current.contains(target)) {
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
          e.preventDefault();
          target.blur();
        }
      }
    };

    disableInputs();
    document.addEventListener('focusin', handleFocus, true);
    document.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });

    return () => {
      enableInputs();
      document.removeEventListener('focusin', handleFocus, true);
      document.removeEventListener('touchstart', handleTouchStart, { capture: true });
    };
  }, [preventKeyboard]);


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
      } else if (e.key === 'Enter') {
        handleConfirm();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleAdd(allowDecimal ? 0.5 : 1, false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleAdd(allowDecimal ? -0.5 : -1, false);
      } else if (e.key >= '0' && e.key <= '9') {
        // Allow direct number input
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
            const finalValue = allowDecimal ? Math.round(clamped * 10) / 10 : Math.round(clamped);
            setInputValue(finalValue.toString());
            return finalValue;
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, allowDecimal, minValue, maxValue, isRpeMode, handleConfirm, handleAdd]);

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

  // Tablet-optimized sizes
  const isTabletMode = isTablet && !compact;
  const displaySize = isTabletMode ? 'text-7xl md:text-8xl' : compact ? 'text-4xl' : 'text-6xl lg:text-8xl';
  const buttonSize = isTabletMode ? 'text-4xl md:text-5xl py-8 md:py-10' : compact ? (isRpeMode ? 'py-3 text-xl' : 'py-4 text-xl') : (isRpeMode ? 'py-6 lg:py-8 text-3xl lg:text-4xl' : 'py-8 lg:py-12 text-3xl lg:text-4xl');
  const containerPadding = isTabletMode ? 'p-8 md:p-10' : compact ? 'p-4' : 'p-6 lg:p-10';
  const displayPadding = isTabletMode ? 'p-10 md:p-12' : compact ? 'p-4' : 'p-8';
  const titleSize = isTabletMode ? 'text-3xl md:text-4xl' : compact ? 'text-xl' : 'text-2xl lg:text-4xl';

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm bg-black/70 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
      onTouchStart={(e) => {
        // Prevent any touch events from bubbling to inputs
        if (preventKeyboard && e.target !== e.currentTarget) {
          const target = e.target as HTMLElement;
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }}
    >
      <div
        ref={padRef}
        className={`bg-zinc-900 border-2 border-zinc-800 rounded-3xl shadow-2xl ${compact ? 'max-w-md w-full' : isTabletMode ? 'max-w-3xl w-full' : 'max-w-2xl w-full'} ${containerPadding} transition-all`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between ${compact ? 'mb-4' : isTabletMode ? 'mb-8' : 'mb-6'}`}>
          <h2 className={`font-bold text-emerald-400 ${titleSize} select-none`}>
            {label}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`${isTabletMode ? 'p-4' : 'p-3'} hover:bg-zinc-800 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 touch-manipulation`}
            aria-label="סגור לוח מספרים"
          >
            <X className={`${isTabletMode ? 'h-8 w-8 md:h-10 md:w-10' : 'h-7 w-7 lg:h-9 lg:w-9'} text-zinc-500`} aria-hidden="true" />
          </button>
        </div>

        <div className={compact ? 'mb-4' : isTabletMode ? 'mb-10' : 'mb-8'}>
          <div className={`bg-gradient-to-br from-zinc-800/80 to-zinc-800/50 border-4 border-emerald-500/60 rounded-3xl ${displayPadding} text-center shadow-inner`}>
            {/* Always use div to prevent keyboard - use virtual buttons below */}
            <div
              className={`w-full bg-transparent font-bold text-emerald-400 tabular-nums text-center ${displaySize} select-none ${isTabletMode ? 'leading-tight' : ''}`}
              aria-label={`${label} - ${inputValue}${allowDecimal ? ' קילוגרמים' : isRpeMode ? ' RPE' : ' חזרות'}`}
              role="textbox"
              aria-readonly="true"
              tabIndex={-1}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onFocus={(e) => {
                e.preventDefault();
                e.stopPropagation();
                (e.target as HTMLElement).blur();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              style={{
                WebkitUserSelect: 'none',
                userSelect: 'none',
                WebkitTouchCallout: 'none',
                touchAction: 'none',
              }}
            >
              {inputValue}
            </div>
            <div className={`text-zinc-400 mt-3 font-semibold ${compact ? 'text-base' : isTabletMode ? 'text-2xl md:text-3xl' : 'text-xl lg:text-2xl'} select-none`} aria-hidden="true">
              {allowDecimal ? 'ק״ג' : isRpeMode ? 'RPE' : 'חזרות'}
            </div>
            <div id="numeric-pad-instructions" className="sr-only">
              לחץ Enter לאישור, Esc לביטול, או השתמש בחצים למעלה ולמטה לשינוי הערך
            </div>
            {!compact && (
              <div className={`text-zinc-500 mt-3 font-medium ${isTabletMode ? 'text-base md:text-lg' : 'text-sm'} select-none`} aria-hidden="true">
                השתמש בכפתורים למטה
              </div>
            )}
          </div>
        </div>

        <div className={`grid ${compact ? 'gap-2 mb-4' : isTabletMode ? 'gap-4 md:gap-5 mb-8' : 'gap-3 lg:gap-4 mb-6'} ${isRpeMode ? 'grid-cols-5' : 'grid-cols-3'}`} dir="rtl" role="group" aria-label="כפתורי מספרים">
          {buttons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAdd(btn.value, btn.isAbsolute);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
              }}
              aria-label={`הוסף ${btn.label}${isRpeMode ? ' RPE' : allowDecimal ? ' קילוגרם' : ' חזרות'}`}
              aria-pressed={isRpeMode && currentValue === btn.value}
              className={`${
                isRpeMode && currentValue === btn.value
                  ? 'bg-emerald-500 ring-4 ring-emerald-500/40 shadow-lg shadow-emerald-500/30'
                  : 'bg-cyan-500/15 border-2 border-cyan-500/30 hover:bg-cyan-500/25 hover:border-cyan-500/50 text-cyan-400'
              } ${isRpeMode && currentValue === btn.value ? 'text-white' : ''} ${buttonSize} px-4 md:px-6 rounded-2xl font-bold transition-all active:scale-[0.95] touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500/50 select-none`}
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className={`grid grid-cols-2 ${compact ? 'gap-2' : isTabletMode ? 'gap-4 md:gap-5' : 'gap-4'}`} dir="rtl" role="group" aria-label="פעולות">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleReset();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
            }}
            aria-label="איפוס ערך"
            className={`bg-amber-500/15 border-2 border-amber-500/30 hover:bg-amber-500/25 hover:border-amber-500/50 text-amber-400 ${compact ? 'py-3 px-4 rounded-xl text-lg' : isTabletMode ? 'py-8 md:py-10 px-6 rounded-2xl text-3xl md:text-4xl' : 'py-6 lg:py-8 px-6 rounded-xl text-2xl lg:text-3xl'} font-bold transition-all active:scale-[0.95] touch-manipulation focus:outline-none focus:ring-2 focus:ring-amber-500/50 select-none`}
            style={{
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
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
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
            }}
            aria-label={`אישור ערך${allowDecimal ? ' בקילוגרמים' : isRpeMode ? ' RPE' : ' בחזרות'}`}
            className={`bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30 ${compact ? 'py-3 px-4 rounded-xl text-lg' : isTabletMode ? 'py-8 md:py-10 px-6 rounded-2xl text-3xl md:text-4xl' : 'py-6 lg:py-8 px-6 rounded-xl text-2xl lg:text-3xl'} font-bold transition-all active:scale-[0.95] touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500/50 select-none`}
            style={{
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
          >
            אישור
          </button>
        </div>
      </div>
    </div>
  );
}
