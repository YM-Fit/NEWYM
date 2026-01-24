import { createContext, useContext, useEffect, ReactNode } from 'react';

// Theme is always 'light' - elegant sage green palette
export type Theme = 'light';

interface ThemeContextType {
  theme: Theme;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme: Theme = 'light';

  useEffect(() => {
    // Set light theme class on document
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#F8FAF6');
    }

    // Clear any stored theme preference (always light now)
    try {
      localStorage.removeItem('ym-coach-theme');
    } catch {
      // localStorage not available
    }
  }, []);

  const value: ThemeContextType = {
    theme,
    isLight: true,
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
