import { createContext, useContext, useMemo, ReactNode } from 'react';

export type Theme = 'light';

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

export function ThemeProvider({ children }: ThemeProviderProps) {
  const value: ThemeContextType = useMemo(() => ({
    theme: 'light' as Theme,
    toggleTheme: () => {},
    setTheme: () => {},
    isDark: false,
    isLight: true,
  }), []);

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

export function useThemeClasses() {
  return {
    bgBase: 'bg-base',
    bgElevated: 'bg-elevated',
    bgSurface: 'bg-surface',
    bgCard: 'bg-card',
    textPrimary: 'text-foreground',
    textSecondary: 'text-secondary',
    textMuted: 'text-muted',
    border: 'border-border',
    borderHover: 'border-border-hover',
    inputBg: 'bg-input',
    inputBorder: 'border-border',
    inputText: 'text-foreground',
    inputPlaceholder: 'placeholder-muted',
    cardBg: 'bg-card',
    cardBorder: 'border-border',
    cardShadow: 'shadow-card',
  };
}
