import { useEffect, useState } from 'react';

/**
 * Detects whether the device is a touch device (phone, tablet, etc.)
 * This is used to prevent virtual keyboard from opening on touch devices.
 */
export function useIsTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkIsTouchDevice = () => {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    };

    // Initial check
    setIsTouchDevice(checkIsTouchDevice());

    // Listen for pointer events to detect touch capability
    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        setIsTouchDevice(true);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  return isTouchDevice;
}
