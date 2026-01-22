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
        theme === 'dark' ? '#1a2e16' : '#f0f5ed'
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
    // Background classes - nature-inspired colors
    bgBase: isDark ? 'bg-zinc-950' : 'bg-[#f0f5ed]',
    bgElevated: isDark ? 'bg-zinc-900' : 'bg-white',
    bgSurface: isDark ? 'bg-zinc-800' : 'bg-[#e8f0e0]',
    bgCard: isDark ? 'bg-zinc-900/90' : 'bg-white/97',

    // Text classes - use CSS variables for theme-aware typography
    textPrimary: 'text-theme-primary',
    textSecondary: 'text-theme-secondary',
    textMuted: 'text-theme-muted',

    // Border classes - nature-inspired olive green for light mode
    border: isDark ? 'border-zinc-800' : 'border-emerald-700/10',
    borderHover: isDark ? 'border-zinc-700' : 'border-emerald-700/20',

    // Input classes
    inputBg: isDark ? 'bg-zinc-800/50' : 'bg-white/95',
    inputBorder: isDark ? 'border-zinc-700' : 'border-emerald-700/15',
    inputText: 'text-theme-primary',
    inputPlaceholder: isDark ? 'placeholder-zinc-500' : 'placeholder-[#6b7f72]',

    // Card background
    cardBg: isDark ? 'bg-zinc-900/90' : 'bg-white/95',
    cardBorder: isDark ? 'border-zinc-800' : 'border-emerald-700/12',
    cardShadow: isDark ? 'shadow-lg shadow-black/20' : 'shadow-lg shadow-emerald-950/8',
  };
}
