import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'dark' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('ym-coach-theme');
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      // localStorage not available
    }
    return defaultTheme;
  });

  useEffect(() => {
    try {
      localStorage.setItem('ym-coach-theme', theme);
    } catch {
      // localStorage not available
    }

    // Update document class for Tailwind dark mode
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        theme === 'dark' ? '#09090b' : '#f4f4f5'
      );
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Hook for components that need theme-aware classes
export function useThemeClasses() {
  const { isDark } = useTheme();

  return {
    // Background classes
    bgBase: isDark ? 'bg-zinc-950' : 'bg-zinc-100',
    bgElevated: isDark ? 'bg-zinc-900' : 'bg-white',
    bgSurface: isDark ? 'bg-zinc-800' : 'bg-zinc-200',
    bgCard: isDark ? 'bg-zinc-900/90' : 'bg-white/90',

    // Text classes
    textPrimary: isDark ? 'text-white' : 'text-zinc-900',
    textSecondary: isDark ? 'text-zinc-400' : 'text-zinc-600',
    textMuted: isDark ? 'text-zinc-500' : 'text-zinc-500',

    // Border classes
    border: isDark ? 'border-zinc-800' : 'border-zinc-200',
    borderHover: isDark ? 'border-zinc-700' : 'border-zinc-300',

    // Input classes
    inputBg: isDark ? 'bg-zinc-800/50' : 'bg-white',
    inputBorder: isDark ? 'border-zinc-700' : 'border-zinc-300',
    inputText: isDark ? 'text-white' : 'text-zinc-900',
    inputPlaceholder: isDark ? 'placeholder-zinc-500' : 'placeholder-zinc-400',
  };
}
