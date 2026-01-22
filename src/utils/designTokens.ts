/**
 * Design Tokens Utilities
 * 
 * Centralized design system tokens for consistent spacing, colors, typography, and more.
 * Use these utilities instead of hardcoded values throughout the application.
 */

/**
 * Spacing Scale
 * Standard spacing values for consistent padding, margins, and gaps
 */
export const spacing = {
  xs: '0.5rem',    // 8px
  sm: '0.75rem',   // 12px
  md: '1rem',      // 16px
  lg: '1.25rem',   // 20px
  xl: '1.5rem',    // 24px
  '2xl': '2rem',   // 32px
  '3xl': '2.5rem', // 40px
  '4xl': '3rem',   // 48px
} as const;

/**
 * Border Radius Scale
 * Standard border radius values for consistent rounded corners
 */
export const borderRadius = {
  xs: '0.5rem',    // 8px
  sm: '0.75rem',   // 12px
  md: '1rem',      // 16px
  lg: '1.25rem',   // 20px
  xl: '1.5rem',    // 24px
  '2xl': '1.75rem', // 28px
  '3xl': '2rem',   // 32px
} as const;

/**
 * Typography Scale
 * Standard font sizes, line heights, and font weights
 */
export const typography = {
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
    loose: '2',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

/**
 * Color Helpers
 * Use CSS variables for theme-aware colors
 */
export const colors = {
  // Background colors
  bgBase: 'rgb(var(--color-bg-base))',
  bgElevated: 'rgb(var(--color-bg-elevated))',
  bgSurface: 'rgb(var(--color-bg-surface))',
  bgCard: 'rgb(var(--color-bg-card))',
  bgInput: 'rgb(var(--color-bg-input))',
  bgOverlay: 'rgb(var(--color-bg-overlay))',
  
  // Text colors
  textPrimary: 'rgb(var(--color-text-primary))',
  textSecondary: 'rgb(var(--color-text-secondary))',
  textMuted: 'rgb(var(--color-text-muted))',
  textInverse: 'rgb(var(--color-text-inverse))',
  
  // Border colors
  border: 'rgb(var(--color-border))',
  borderHover: 'rgb(var(--color-border-hover))',
  borderStrong: 'rgb(var(--color-border-strong))',
  
  // Brand colors
  primary: 'rgb(var(--color-primary))',
  primaryLight: 'rgb(var(--color-primary-light))',
  primaryDark: 'rgb(var(--color-primary-dark))',
  success: 'rgb(var(--color-success))',
  warning: 'rgb(var(--color-warning))',
  danger: 'rgb(var(--color-danger))',
  info: 'rgb(var(--color-info))',
} as const;

/**
 * Tailwind Class Helpers
 * Pre-composed Tailwind classes for common patterns
 */
export const designClasses = {
  // Spacing classes
  spacing: {
    xs: 'p-2',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
    xl: 'p-6',
    '2xl': 'p-8',
    '3xl': 'p-10',
    '4xl': 'p-12',
  },
  
  // Border radius classes
  radius: {
    xs: 'rounded-lg',      // 8px
    sm: 'rounded-xl',      // 12px
    md: 'rounded-2xl',     // 16px
    lg: 'rounded-2xl',     // 20px (using 2xl as closest)
    xl: 'rounded-3xl',     // 24px
    '2xl': 'rounded-3xl',  // 28px (using 3xl as closest)
    '3xl': 'rounded-3xl',  // 32px
  },
  
  // Typography classes
  text: {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    '4xl': 'text-4xl',
    '5xl': 'text-5xl',
  },
  
  // Font weight classes
  weight: {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  },
} as const;

/**
 * Component Size Presets
 * Standard sizes for buttons, inputs, cards, etc.
 */
export const componentSizes = {
  button: {
    sm: 'px-3 py-1.5 text-sm rounded-xl min-h-[36px]',
    md: 'px-4 py-2.5 text-base rounded-xl min-h-[44px]',
    lg: 'px-6 py-3.5 text-lg rounded-xl min-h-[52px]',
  },
  input: {
    sm: 'px-3 py-2 text-sm rounded-xl min-h-[36px]',
    md: 'px-4 py-2.5 text-base rounded-xl min-h-[44px]',
    lg: 'px-6 py-3 text-lg rounded-xl min-h-[52px]',
  },
  card: {
    sm: 'p-4 rounded-2xl',
    md: 'p-5 rounded-2xl',
    lg: 'p-6 rounded-2xl',
    xl: 'p-8 rounded-2xl',
  },
} as const;

/**
 * Transition Presets
 * Standard transition durations and timing functions
 */
export const transitions = {
  duration: {
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
  },
  timing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

/**
 * Shadow Presets
 * Standard shadow values for depth and elevation
 */
export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
  card: 'shadow-card',
  'card-hover': 'shadow-card-hover',
  glow: 'shadow-glow',
  'glow-sm': 'shadow-glow-sm',
  'glow-lg': 'shadow-glow-lg',
  'glow-xl': 'shadow-glow-xl',
} as const;

/**
 * Helper function to get spacing value
 */
export function getSpacing(size: keyof typeof spacing): string {
  return spacing[size];
}

/**
 * Helper function to get border radius value
 */
export function getBorderRadius(size: keyof typeof borderRadius): string {
  return borderRadius[size];
}

/**
 * Helper function to get typography size
 */
export function getFontSize(size: keyof typeof typography.fontSize): string {
  return typography.fontSize[size];
}
