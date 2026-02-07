import { X, Minus, Plus, RotateCcw, Check, ChevronUp, ChevronDown, Delete } from 'lucide-react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  previousValue?: number; // ערך מהסט הקודם להשוואה
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
  isTablet,
  previousValue
}: QuickNumericPadProps) {
  const [currentValue, setCurrentValue] = useState(value);
  const [inputValue, setInputValue] = useState(value.toString());
  const [isDirectInput, setIsDirectInput] = useState(false);
  const [directInputBuffer, setDirectInputBuffer] = useState('');
  const isRpeMode = maxValue === 10 && minValue === 1;
  const isTouchDevice = useIsTouchDevice();
  const preventKeyboard = isTablet || isTouchDevice;
  const padRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  
  // Swipe gesture tracking
  const touchStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const [swipeIndicator, setSwipeIndicator] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    setCurrentValue(value);
    setInputValue(value.toString());
    setDirectInputBuffer('');
    setIsDirectInput(false);
  }, [value]);
  
  // Swipe gesture handlers for quick value changes
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  }, []);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const deltaY = touchStartY.current - e.touches[0].clientY;
    const deltaX = Math.abs(touchStartX.current - e.touches[0].clientX);
    
    // Only handle vertical swipes (not horizontal)
    if (Math.abs(deltaY) > 20 && deltaX < 50) {
      setSwipeIndicator(deltaY > 0 ? 'up' : 'down');
    } else {
      setSwipeIndicator(null);
    }
  }, []);
  
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    const deltaX = Math.abs(touchStartX.current - e.changedTouches[0].clientX);
    
    // Swipe up = increase, swipe down = decrease
    if (Math.abs(deltaY) > 50 && deltaX < 50) {
      const step = allowDecimal ? 2.5 : (isRpeMode ? 1 : 5);
      if (deltaY > 0) {
        // Swipe up - increase
        handleAdd(step, false);
      } else {
        // Swipe down - decrease
        handleAdd(-step, false);
      }
    }
    setSwipeIndicator(null);
  }, [allowDecimal, isRpeMode]);

  // Handle direct number input from virtual keypad
  const handleDigitInput = useCallback((digit: string) => {
    setIsDirectInput(true);
    setDirectInputBuffer(prev => {
      let newBuffer = prev + digit;
      
      // Handle decimal point
      if (allowDecimal && digit === '.') {
        if (prev.includes('.')) return prev; // Only one decimal point
        return newBuffer;
      }
      
      // Parse and clamp value
      const numValue = parseFloat(newBuffer) || 0;
      const clamped = minValue !== undefined && numValue < minValue ? minValue :
                      maxValue !== undefined && numValue > maxValue ? maxValue : numValue;
      
      if (clamped !== numValue) {
        newBuffer = clamped.toString();
      }
      
      setCurrentValue(parseFloat(newBuffer) || 0);
      setInputValue(newBuffer);
      return newBuffer;
    });
  }, [allowDecimal, minValue, maxValue]);

  const handleBackspace = useCallback(() => {
    if (directInputBuffer.length > 0) {
      const newBuffer = directInputBuffer.slice(0, -1);
      setDirectInputBuffer(newBuffer);
      const numValue = parseFloat(newBuffer) || 0;
      setCurrentValue(numValue);
      setInputValue(newBuffer || '0');
    } else {
      setCurrentValue(0);
      setInputValue('0');
    }
  }, [directInputBuffer]);

  const clearDirectInput = useCallback(() => {
    setIsDirectInput(false);
    setDirectInputBuffer('');
  }, []);

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
    clearDirectInput();
    setCurrentValue(prev => {
      let newValue = isAbsolute ? amount : prev + amount;
      if (minValue !== undefined && newValue < minValue) newValue = minValue;
      if (maxValue !== undefined && newValue > maxValue) newValue = maxValue;
      if (newValue < 0) newValue = 0;
      const finalValue = allowDecimal ? Math.round(newValue * 10) / 10 : Math.round(newValue);
      setInputValue(finalValue.toString());
      return finalValue;
    });
  }, [allowDecimal, minValue, maxValue, clearDirectInput]);

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

  // Quick increment buttons
  const incrementButtons = useMemo(() => {
    if (isRpeMode) {
      return [
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
      ];
    }
    if (allowDecimal) {
      return [
        { label: '+0.5', value: 0.5, isAbsolute: false, color: 'emerald' },
        { label: '+1', value: 1, isAbsolute: false, color: 'emerald' },
        { label: '+2.5', value: 2.5, isAbsolute: false, color: 'emerald' },
        { label: '+5', value: 5, isAbsolute: false, color: 'blue' },
        { label: '+10', value: 10, isAbsolute: false, color: 'blue' },
        { label: '+20', value: 20, isAbsolute: false, color: 'blue' },
      ];
    }
    return [
      { label: '+1', value: 1, isAbsolute: false, color: 'emerald' },
      { label: '+2', value: 2, isAbsolute: false, color: 'emerald' },
      { label: '+3', value: 3, isAbsolute: false, color: 'emerald' },
      { label: '+5', value: 5, isAbsolute: false, color: 'blue' },
      { label: '+10', value: 10, isAbsolute: false, color: 'blue' },
      { label: '+15', value: 15, isAbsolute: false, color: 'blue' },
    ];
  }, [isRpeMode, allowDecimal]);

  // Quick decrement buttons
  const decrementButtons = useMemo(() => {
    if (isRpeMode) return [];
    if (allowDecimal) {
      return [
        { label: '-0.5', value: -0.5, color: 'red' },
        { label: '-1', value: -1, color: 'red' },
        { label: '-2.5', value: -2.5, color: 'red' },
      ];
    }
    return [
      { label: '-1', value: -1, color: 'red' },
      { label: '-2', value: -2, color: 'red' },
      { label: '-5', value: -5, color: 'red' },
    ];
  }, [isRpeMode, allowDecimal]);

  // Virtual numeric keypad (0-9)
  const numericKeypad = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', allowDecimal ? '.' : '', 'backspace'];
  
  const buttons = incrementButtons;

  const handleReset = useCallback(() => {
    const resetValue = minValue || 0;
    setCurrentValue(resetValue);
    setInputValue(resetValue.toString());
  }, [minValue]);

  // Tablet-optimized sizes
  const isTabletMode = isTablet && !compact;
  const displaySize = isTabletMode ? 'text-7xl md:text-8xl' : compact ? 'text-4xl' : 'text-6xl lg:text-8xl';
  const buttonSize = isTabletMode ? 'text-3xl md:text-4xl py-6 md:py-8' : compact ? (isRpeMode ? 'py-3 text-xl' : 'py-4 text-xl') : (isRpeMode ? 'py-5 lg:py-6 text-2xl lg:text-3xl' : 'py-6 lg:py-8 text-2xl lg:text-3xl');
  const containerPadding = isTabletMode ? 'p-6 md:p-8' : compact ? 'p-4' : 'p-5 lg:p-8';
  const displayPadding = isTabletMode ? 'p-8 md:p-10' : compact ? 'p-4' : 'p-6';
  const titleSize = isTabletMode ? 'text-2xl md:text-3xl' : compact ? 'text-xl' : 'text-xl lg:text-3xl';

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
        className={`bg-card border-2 border-border rounded-3xl shadow-2xl ${compact ? 'max-w-md w-full' : isTabletMode ? 'max-w-4xl w-full' : 'max-w-2xl w-full'} ${containerPadding} transition-all animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between ${compact ? 'mb-4' : isTabletMode ? 'mb-6' : 'mb-5'}`}>
          <h2 className={`font-bold text-emerald-400 ${titleSize} select-none`}>
            {label}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`${isTabletMode ? 'p-3' : 'p-2'} hover:bg-surface rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 touch-manipulation`}
            aria-label="סגור לוח מספרים"
          >
            <X className={`${isTabletMode ? 'h-7 w-7 md:h-8 md:w-8' : 'h-6 w-6 lg:h-7 lg:w-7'} text-muted`} aria-hidden="true" />
          </button>
        </div>

        {/* Display area with swipe support */}
        <div className={compact ? 'mb-4' : isTabletMode ? 'mb-6' : 'mb-5'}>
          <div 
            ref={displayRef}
            className={`relative bg-gradient-to-br from-zinc-800/80 to-zinc-800/50 border-4 ${swipeIndicator ? 'border-blue-500/80' : 'border-emerald-500/60'} rounded-2xl ${displayPadding} text-center shadow-inner transition-colors`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Swipe indicator */}
            {swipeIndicator && (
              <div className="absolute inset-x-0 top-2 flex justify-center animate-pulse">
                {swipeIndicator === 'up' ? (
                  <ChevronUp className="h-6 w-6 text-blue-400" />
                ) : (
                  <ChevronDown className="h-6 w-6 text-blue-400" />
                )}
              </div>
            )}
            
            {/* Value display */}
            <div
              className={`w-full bg-transparent font-bold text-emerald-400 tabular-nums text-center ${displaySize} select-none ${isTabletMode ? 'leading-tight' : ''}`}
              aria-label={`${label} - ${inputValue}${allowDecimal ? ' קילוגרמים' : isRpeMode ? ' RPE' : ' חזרות'}`}
              role="textbox"
              aria-readonly="true"
              tabIndex={-1}
              style={{
                WebkitUserSelect: 'none',
                userSelect: 'none',
                WebkitTouchCallout: 'none',
                touchAction: 'none',
              }}
            >
              {inputValue}
            </div>
            <div className={`text-muted mt-2 font-semibold ${compact ? 'text-base' : isTabletMode ? 'text-xl md:text-2xl' : 'text-lg lg:text-xl'} select-none`} aria-hidden="true">
              {allowDecimal ? 'ק״ג' : isRpeMode ? 'RPE' : 'חזרות'}
            </div>
            
            {/* Previous value hint */}
            {previousValue !== undefined && previousValue !== value && !compact && (
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="text-muted text-sm">סט קודם:</span>
                <button
                  type="button"
                  onClick={() => handleAdd(previousValue, true)}
                  className="text-blue-400 text-sm font-medium hover:underline"
                >
                  {previousValue}
                </button>
              </div>
            )}
            
            {!compact && !isRpeMode && (
              <div className={`text-muted mt-2 font-medium ${isTabletMode ? 'text-sm' : 'text-xs'} select-none flex items-center justify-center gap-1`} aria-hidden="true">
                <ChevronUp className="h-3 w-3" />
                <span>החלק למעלה/מטה לשינוי מהיר</span>
                <ChevronDown className="h-3 w-3" />
              </div>
            )}
          </div>
        </div>

        {isTabletMode && !isRpeMode ? (
          /* Tablet layout: Two columns - Quick buttons + Numeric keypad */
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Left column: Quick increment/decrement buttons */}
            <div className="space-y-3">
              {/* Increment buttons */}
              <div className="grid grid-cols-3 gap-2">
                {incrementButtons.slice(0, 6).map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAdd(btn.value, btn.isAbsolute);
                    }}
                    className={`py-4 px-2 rounded-xl font-bold text-xl transition-all active:scale-[0.95] touch-manipulation ${
                      btn.color === 'emerald' 
                        ? 'bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                        : 'bg-blue-500/15 border-2 border-blue-500/30 text-blue-400 hover:bg-blue-500/25'
                    }`}
                    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              
              {/* Decrement buttons */}
              {decrementButtons.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {decrementButtons.map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAdd(btn.value, false);
                      }}
                      className="py-4 px-2 rounded-xl font-bold text-xl transition-all active:scale-[0.95] touch-manipulation bg-red-500/15 border-2 border-red-500/30 text-red-400 hover:bg-red-500/25"
                      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="py-4 px-3 rounded-xl font-bold text-lg transition-all active:scale-[0.95] touch-manipulation bg-amber-500/15 border-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/25 flex items-center justify-center gap-2"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  <RotateCcw className="h-5 w-5" />
                  <span>איפוס</span>
                </button>
                {previousValue !== undefined && (
                  <button
                    type="button"
                    onClick={() => handleAdd(previousValue, true)}
                    className="py-4 px-3 rounded-xl font-bold text-lg transition-all active:scale-[0.95] touch-manipulation bg-slate-500/15 border-2 border-slate-500/30 text-slate-400 hover:bg-slate-500/25"
                    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                  >
                    קודם ({previousValue})
                  </button>
                )}
              </div>
            </div>
            
            {/* Right column: Numeric keypad */}
            <div className="grid grid-cols-3 gap-2">
              {numericKeypad.map((key, index) => {
                if (key === '') return <div key={index} />;
                if (key === 'backspace') {
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={handleBackspace}
                      className="py-5 rounded-xl font-bold text-2xl transition-all active:scale-[0.95] touch-manipulation bg-surface border-2 border-border text-muted hover:bg-elevated/50 flex items-center justify-center"
                      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    >
                      <Delete className="h-6 w-6" />
                    </button>
                  );
                }
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleDigitInput(key)}
                    className="py-5 rounded-xl font-bold text-2xl transition-all active:scale-[0.95] touch-manipulation bg-surface border-2 border-border text-foreground hover:bg-elevated/50"
                    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Standard layout for non-tablet or RPE mode */
          <>
            <div className={`grid ${compact ? 'gap-2 mb-4' : isTabletMode ? 'gap-3 md:gap-4 mb-6' : 'gap-2 lg:gap-3 mb-4'} ${isRpeMode ? 'grid-cols-5' : 'grid-cols-3'}`} dir="rtl" role="group" aria-label="כפתורי מספרים">
              {buttons.map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAdd(btn.value, btn.isAbsolute);
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  aria-label={`הוסף ${btn.label}${isRpeMode ? ' RPE' : allowDecimal ? ' קילוגרם' : ' חזרות'}`}
                  aria-pressed={isRpeMode && currentValue === btn.value}
                  className={`${
                    isRpeMode && currentValue === btn.value
                      ? 'bg-emerald-500 ring-4 ring-emerald-500/40 shadow-lg shadow-emerald-500/30 text-foreground'
                      : 'bg-blue-500/15 border-2 border-blue-500/30 hover:bg-blue-500/25 hover:border-blue-500/50 text-blue-400'
                  } ${buttonSize} px-3 md:px-4 rounded-xl font-bold transition-all active:scale-[0.95] touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500/50 select-none`}
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
            
            {/* Decrement buttons for non-tablet */}
            {!isRpeMode && decrementButtons.length > 0 && (
              <div className={`grid grid-cols-3 ${compact ? 'gap-2 mb-4' : 'gap-2 lg:gap-3 mb-4'}`} dir="rtl">
                {decrementButtons.map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAdd(btn.value, false);
                    }}
                    className={`${compact ? 'py-3 text-lg' : 'py-4 lg:py-5 text-xl lg:text-2xl'} px-3 rounded-xl font-bold transition-all active:scale-[0.95] touch-manipulation bg-red-500/15 border-2 border-red-500/30 text-red-400 hover:bg-red-500/25`}
                    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Confirm and Reset buttons */}
        <div className={`grid grid-cols-2 ${compact ? 'gap-2' : isTabletMode ? 'gap-3 md:gap-4' : 'gap-3'}`} dir="rtl" role="group" aria-label="פעולות">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleReset();
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            aria-label="איפוס ערך"
            className={`bg-amber-500/15 border-2 border-amber-500/30 hover:bg-amber-500/25 hover:border-amber-500/50 text-amber-400 ${compact ? 'py-3 px-4 rounded-xl text-lg' : isTabletMode ? 'py-5 md:py-6 px-4 rounded-xl text-xl md:text-2xl' : 'py-4 lg:py-5 px-4 rounded-xl text-xl lg:text-2xl'} font-bold transition-all active:scale-[0.95] touch-manipulation focus:outline-none focus:ring-2 focus:ring-amber-500/50 select-none flex items-center justify-center gap-2`}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          >
            <RotateCcw className={`${compact ? 'h-5 w-5' : 'h-6 w-6'}`} />
            <span>איפוס</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleConfirm();
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            aria-label={`אישור ערך${allowDecimal ? ' בקילוגרמים' : isRpeMode ? ' RPE' : ' בחזרות'}`}
            className={`bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30 ${compact ? 'py-3 px-4 rounded-xl text-lg' : isTabletMode ? 'py-5 md:py-6 px-4 rounded-xl text-xl md:text-2xl' : 'py-4 lg:py-5 px-4 rounded-xl text-xl lg:text-2xl'} font-bold transition-all active:scale-[0.95] touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500/50 select-none flex items-center justify-center gap-2`}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          >
            <Check className={`${compact ? 'h-5 w-5' : 'h-6 w-6'}`} />
            <span>אישור</span>
          </button>
        </div>
      </div>
    </div>
  );
}
