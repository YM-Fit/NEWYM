/**
 * Theme Colors - Hex values for JS/React usage
 * Use for: Recharts, inline styles, Toast, export utilities
 * Mirrors theme.css CSS variables - single source of truth for branding
 */

export const themeColors = {
  // Primary (olive green - matches --color-primary)
  primary: '#4a6b2a',
  primaryLight: '#6b8e4a',
  primaryDark: '#3d5a1f',
  primary50: '#f0f5ed',
  primary100: '#e8f0e0',
  primary500: '#7fa05a',
  primary600: '#6b8e4a',
  primary700: '#4a6b2a',

  // Status colors (matches theme.css)
  success: '#4a6b2a',
  successLight: '#6b8e4a',
  warning: '#b45f05',
  warningLight: '#d97706',
  danger: '#dc2626',
  dangerLight: '#ef4444',
  info: '#55733c',
  infoLight: '#6b8e4a',

  // Backgrounds
  bgBase: '#f0f5ed',
  bgElevated: '#ffffff',
  bgSurface: '#e8f0e0',
  bgCard: '#ffffff',
  bgOverlay: '#1a2e16',

  // Text
  textPrimary: '#111827',
  textSecondary: '#1f2937',
  textMuted: '#4b5563',
  textInverse: '#f4f4f5',

  // Borders & neutrals for charts
  border: '#94a3b8',
  borderLight: '#e2e8f0',
  muted: '#64748b',
  mutedLight: '#94a3b8',
  zinc400: '#a1a1aa',
  zinc500: '#71717a',
  zinc600: '#52525b',
  zinc700: '#3f3f46',
  zinc800: '#27272a',
  zinc900: '#18181b',
  zinc950: '#09090b',

  // Chart palette (theme-consistent)
  chartPrimary: '#4a6b2a',
  chartSecondary: '#6b8e4a',
  chartBlue: '#3b82f6',
  chartAmber: '#f59e0b',
  chartRose: '#ef4444',
  chartPink: '#ec4899',
  chartOrange: '#f97316',
  chartTeal: '#6b8e4a', /* primaryLight - was emerald */
} as const;

export type ThemeColorKey = keyof typeof themeColors;
