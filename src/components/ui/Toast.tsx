import toast from 'react-hot-toast';

interface ToastOptions {
  duration?: number;
  icon?: React.ReactNode;
}

export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    return toast.success(message, {
      duration: options?.duration || 4000,
      icon: options?.icon,
      style: {
        background: '#18181b',
        color: '#fff',
        border: '1px solid #27272a',
        borderRadius: '12px',
        padding: '12px 16px',
        fontSize: '14px',
        fontFamily: 'inherit',
      },
      iconTheme: {
        primary: '#10b981',
        secondary: '#fff',
      },
    });
  },

  error: (message: string, options?: ToastOptions) => {
    return toast.error(message, {
      duration: options?.duration || 5000,
      icon: options?.icon,
      style: {
        background: '#18181b',
        color: '#fff',
        border: '1px solid #dc2626',
        borderRadius: '12px',
        padding: '12px 16px',
        fontSize: '14px',
        fontFamily: 'inherit',
      },
      iconTheme: {
        primary: '#dc2626',
        secondary: '#fff',
      },
    });
  },

  loading: (message: string, options?: ToastOptions) => {
    return toast.loading(message, {
      duration: options?.duration || Infinity,
      icon: options?.icon,
      style: {
        background: '#18181b',
        color: '#fff',
        border: '1px solid #27272a',
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
            primary: '#10b981',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#dc2626',
            secondary: '#fff',
          },
        },
      }
    );
  },
};
