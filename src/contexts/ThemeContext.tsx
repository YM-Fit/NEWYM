import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';

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

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const value: ThemeContextType = useMemo(() => ({
    theme,
    toggleTheme,
    setTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
  }), [theme, toggleTheme, setTheme]);

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
    // Background classes - use design tokens
    bgBase: 'bg-base',
    bgElevated: 'bg-elevated',
    bgSurface: 'bg-surface',
    bgCard: 'bg-card',

    // Text classes - use design tokens
    textPrimary: 'text-foreground',
    textSecondary: 'text-secondary',
    textMuted: 'text-muted',

    // Border classes - use design tokens
    border: 'border-border',
    borderHover: 'border-border-hover',

    // Input classes - use design tokens
    inputBg: 'bg-input',
    inputBorder: 'border-border',
    inputText: 'text-foreground',
    inputPlaceholder: 'placeholder-muted',

    // Card background - use design tokens
    cardBg: 'bg-card',
    cardBorder: 'border-border',
    cardShadow: 'shadow-card',
  };
}
