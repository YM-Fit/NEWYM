import { useCallback, useRef, useEffect } from 'react';
import { logger } from '../utils/logger';

const SOUND_ENABLED_KEY = 'scale_sound_enabled';

function createBeep(frequency: number, duration: number, volume: number = 0.3): void {
  try {
    const audioContext = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.value = volume;

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration / 1000);

    setTimeout(() => {
      audioContext.close();
    }, duration + 100);
  } catch (e) {
    logger.warn('Audio not supported:', e, 'useScaleSound');
  }
}

export function useScaleSound() {
  const enabledRef = useRef<boolean>(true);

  useEffect(() => {
    const saved = localStorage.getItem(SOUND_ENABLED_KEY);
    if (saved !== null) {
      enabledRef.current = saved === 'true';
    }
  }, []);

  const playDataReceived = useCallback(() => {
    if (!enabledRef.current) return;
    createBeep(880, 150, 0.2);
    setTimeout(() => createBeep(1100, 150, 0.2), 150);
  }, []);

  const playWarning = useCallback(() => {
    if (!enabledRef.current) return;
    createBeep(400, 200, 0.3);
    setTimeout(() => createBeep(300, 300, 0.3), 200);
  }, []);

  const playSuccess = useCallback(() => {
    if (!enabledRef.current) return;
    createBeep(523, 100, 0.2);
    setTimeout(() => createBeep(659, 100, 0.2), 100);
    setTimeout(() => createBeep(784, 150, 0.2), 200);
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  }, []);

  const isEnabled = useCallback(() => enabledRef.current, []);

  return {
    playDataReceived,
    playWarning,
    playSuccess,
    setEnabled,
    isEnabled,
  };
}
