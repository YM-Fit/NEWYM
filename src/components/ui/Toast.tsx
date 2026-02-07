import toast from 'react-hot-toast';

interface ToastOptions {
  duration?: number;
  icon?: React.ReactNode;
}

/**
 * Helper to get RGB color from CSS variable
 * Returns RGB string like "rgb(24, 24, 27)"
 */
function getColorFromCSSVar(varName: string): string {
  if (typeof window === 'undefined') {
    // Fallback for SSR
    const fallbacks: Record<string, string> = {
      '--color-toast-bg': 'rgb(24, 24, 27)',
      '--color-toast-text': 'rgb(255, 255, 255)',
      '--color-toast-border': 'rgb(39, 39, 42)',
      '--color-toast-success-icon': 'rgb(16, 185, 129)',
      '--color-toast-error-icon': 'rgb(220, 38, 38)',
    };
    return fallbacks[varName] || 'rgb(24, 24, 27)';
  }

  const root = document.documentElement;
  const rgbValues = getComputedStyle(root).getPropertyValue(varName).trim();
  if (rgbValues) {
    const [r, g, b] = rgbValues.split(' ').map(v => parseInt(v, 10));
    return `rgb(${r}, ${g}, ${b})`;
  }
  return 'rgb(24, 24, 27)';
}

export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    return toast.success(message, {
      duration: options?.duration || 4000,
      icon: options?.icon,
      style: {
        background: getColorFromCSSVar('--color-toast-bg'),
        color: getColorFromCSSVar('--color-toast-text'),
        border: `1px solid ${getColorFromCSSVar('--color-toast-border')}`,
        borderRadius: '12px',
        padding: '12px 16px',
        fontSize: '14px',
        fontFamily: 'inherit',
      },
      iconTheme: {
        primary: getColorFromCSSVar('--color-toast-success-icon'),
        secondary: getColorFromCSSVar('--color-toast-text'),
      },
    });
  },

  error: (message: string, options?: ToastOptions) => {
    return toast.error(message, {
      duration: options?.duration || 5000,
      icon: options?.icon,
      style: {
        background: getColorFromCSSVar('--color-toast-bg'),
        color: getColorFromCSSVar('--color-toast-text'),
        border: `1px solid ${getColorFromCSSVar('--color-toast-error-icon')}`,
        borderRadius: '12px',
        padding: '12px 16px',
        fontSize: '14px',
        fontFamily: 'inherit',
      },
      iconTheme: {
        primary: getColorFromCSSVar('--color-toast-error-icon'),
        secondary: getColorFromCSSVar('--color-toast-text'),
      },
    });
  },

  loading: (message: string, options?: ToastOptions) => {
    return toast.loading(message, {
      duration: options?.duration || Infinity,
      icon: options?.icon,
      style: {
        background: getColorFromCSSVar('--color-toast-bg'),
        color: getColorFromCSSVar('--color-toast-text'),
        border: `1px solid ${getColorFromCSSVar('--color-toast-border')}`,
        borderRadius: '12px',
        padding: '12px 16px',
        fontSize: '14px',
        fontFamily: 'inherit',
      },
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    },
    options?: ToastOptions
  ) => {
    return toast.promise(
      promise,
      {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      },
      {
        style: {
          background: '#18181b',
          color: '#fff',
          border: '1px solid #27272a',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '14px',
          fontFamily: 'inherit',
        },
        success: {
          iconTheme: {
            primary: getColorFromCSSVar('--color-toast-success-icon'),
            secondary: getColorFromCSSVar('--color-toast-text'),
          },
        },
        error: {
          iconTheme: {
            primary: getColorFromCSSVar('--color-toast-error-icon'),
            secondary: getColorFromCSSVar('--color-toast-text'),
          },
        },
      }
    );
  },
};
