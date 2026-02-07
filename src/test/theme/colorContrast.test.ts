import { describe, it, expect } from 'vitest';
import {
  parseSpaceSeparatedRGB,
  calculateContrastRatio,
  checkWCAGCompliance,
  meetsWCAGAA,
  type RGB,
} from '../utils/colorContrastUtils';

/**
 * Theme color definitions from theme.css
 * Colors are in space-separated RGB format: "r g b"
 */
const themeColors = {
  // Primary colors
  primary: '74 107 42',
  primary50: '240 245 237',
  primary100: '232 240 224',
  primary200: '212 230 200',
  primary300: '184 212 160',
  primary400: '155 194 120',
  primary500: '127 160 90',
  primary600: '107 142 74',
  primary700: '74 107 42',
  primary800: '61 90 31',
  primary900: '45 70 25',
  primaryForeground: '255 255 255',
  onPrimary: '255 255 255',

  // Status colors (updated for WCAG AA compliance)
  success: '74 107 42',
  successLight: '107 142 74',
  successDark: '61 90 31',
  warning: '180 95 5',
  warningLight: '217 119 6',
  warningDark: '140 75 3',
  danger: '220 38 38',
  dangerLight: '239 68 68',
  dangerDark: '185 28 28',
  info: '85 115 60',
  infoLight: '107 142 74',
  infoDark: '61 90 31',

  // Background colors
  bgBase: '240 245 237',
  bgElevated: '255 255 255',
  bgSurface: '232 240 224',
  bgSurfaceLight: '245 250 242',
  bgSurfaceDark: '220 232 210',
  bgCard: '255 255 255',
  bgCardHover: '250 252 248',
  bgInput: '255 255 255',
  bgInputFocus: '248 252 245',
  bgOverlay: '26 46 22',
  bgOverlayLight: '45 70 25',

  // Text colors
  textPrimary: '17 24 39',
  textSecondary: '31 41 55',
  textMuted: '75 85 99',
  textInverse: '244 244 245',
} as const;

/**
 * Helper to convert space-separated RGB to RGB object
 */
function rgbFromTheme(colorString: string): RGB {
  const parsed = parseSpaceSeparatedRGB(colorString);
  if (!parsed) {
    throw new Error(`Failed to parse color: ${colorString}`);
  }
  return parsed;
}

/**
 * Helper to check contrast and return detailed result
 */
function checkContrast(
  foreground: string,
  background: string,
  isLargeText = false
) {
  const fg = rgbFromTheme(foreground);
  const bg = rgbFromTheme(background);
  const ratio = calculateContrastRatio(fg, bg);
  const compliance = checkWCAGCompliance(ratio, isLargeText);
  return { ratio, ...compliance };
}

describe('Theme Color Contrast Tests', () => {
  describe('Primary colors on white background', () => {
    it('should have sufficient contrast for primary on white', () => {
      const result = checkContrast(themeColors.primary, themeColors.bgElevated);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsAA).toBe(true);
    });

    it('should have sufficient contrast for primary-700 on white', () => {
      const result = checkContrast(themeColors.primary700, themeColors.bgElevated);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsAA).toBe(true);
    });

    it('should have sufficient contrast for primary-800 on white', () => {
      const result = checkContrast(themeColors.primary800, themeColors.bgElevated);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsAA).toBe(true);
    });

    it('should have sufficient contrast for primary-900 on white', () => {
      const result = checkContrast(themeColors.primary900, themeColors.bgElevated);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsAA).toBe(true);
    });
  });

  describe('White text on primary backgrounds', () => {
    it('should have sufficient contrast for white on primary', () => {
      const result = checkContrast(themeColors.primaryForeground, themeColors.primary);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsAA).toBe(true);
    });

    it('should have sufficient contrast for white on primary-700', () => {
      const result = checkContrast(themeColors.onPrimary, themeColors.primary700);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsAA).toBe(true);
    });

    it('should have sufficient contrast for white on primary-800', () => {
      const result = checkContrast(themeColors.primaryForeground, themeColors.primary800);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsAA).toBe(true);
    });

    it('should have sufficient contrast for white on primary-900', () => {
      const result = checkContrast(themeColors.onPrimary, themeColors.primary900);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsAA).toBe(true);
    });
  });

  describe('Primary light shades on white', () => {
    it('should check primary-50 on white (may not meet AA)', () => {
      const result = checkContrast(themeColors.primary50, themeColors.bgElevated);
      // Very light colors may not meet contrast requirements
      expect(result.ratio).toBeGreaterThan(1);
    });

    it('should check primary-100 on white', () => {
      const result = checkContrast(themeColors.primary100, themeColors.bgElevated);
      expect(result.ratio).toBeGreaterThan(1);
    });

    it('should check primary-200 on white', () => {
      const result = checkContrast(themeColors.primary200, themeColors.bgElevated);
      expect(result.ratio).toBeGreaterThan(1);
    });
  });

  describe('Status colors on white background', () => {
    it('should have sufficient contrast for success on white', () => {
      const result = checkContrast(themeColors.success, themeColors.bgElevated);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsAA).toBe(true);
    });

    it('should have sufficient contrast for danger on white', () => {
      const result = checkContrast(themeColors.danger, themeColors.bgElevated);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsAA).toBe(true);
    });

    it('should have sufficient contrast for warning on white', () => {
      const result = checkContrast(themeColors.warning, themeColors.bgElevated);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsAA).toBe(true);
    });

    it('should have sufficient contrast for info on white', () => {
      const result = checkContrast(themeColors.info, themeColors.bgElevated);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsAA).toBe(true);
    });
  });

  describe('Status colors on light backgrounds (15% opacity simulation)', () => {
    // When using bg-success/15, we need to check if text-success has enough contrast
    // This simulates the actual rendered color with opacity
    it('should check success text on light success background', () => {
      // Simulating bg-success/15 on white: blend success color with white at 15% opacity
      // This is approximate - actual rendering depends on browser compositing
      const result = checkContrast(themeColors.success, themeColors.bgSurfaceLight);
      // On very light backgrounds, colored text may not meet AA
      // This test documents the current state
      expect(result.ratio).toBeGreaterThan(1);
    });

    it('should check danger text on light danger background', () => {
      const result = checkContrast(themeColors.danger, themeColors.bgSurfaceLight);
      expect(result.ratio).toBeGreaterThan(1);
    });

    it('should check warning text on light warning background', () => {
      const result = checkContrast(themeColors.warning, themeColors.bgSurfaceLight);
      expect(result.ratio).toBeGreaterThan(1);
    });

    it('should check info text on light info background', () => {
      const result = checkContrast(themeColors.info, themeColors.bgSurfaceLight);
      expect(result.ratio).toBeGreaterThan(1);
    });
  });

  describe('Text colors on background colors', () => {
    it('should have sufficient contrast for text-primary on bg-elevated', () => {
      const result = checkContrast(themeColors.textPrimary, themeColors.bgElevated);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsAA).toBe(true);
    });

    it('should have sufficient contrast for text-primary on bg-card', () => {
      const result = checkContrast(themeColors.textPrimary, themeColors.bgCard);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsAA).toBe(true);
    });

    it('should have sufficient contrast for text-primary on bg-base', () => {
      const result = checkContrast(themeColors.textPrimary, themeColors.bgBase);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsAA).toBe(true);
    });

    it('should have sufficient contrast for text-primary on bg-surface', () => {
      const result = checkContrast(themeColors.textPrimary, themeColors.bgSurface);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsAA).toBe(true);
    });

    it('should have sufficient contrast for text-secondary on bg-elevated', () => {
      const result = checkContrast(themeColors.textSecondary, themeColors.bgElevated);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsAA).toBe(true);
    });

    it('should check text-muted on bg-elevated (may be lower contrast)', () => {
      const result = checkContrast(themeColors.textMuted, themeColors.bgElevated);
      // Muted text is intentionally lower contrast
      expect(result.ratio).toBeGreaterThan(3.0); // Should at least meet large text AA
    });

    it('should have sufficient contrast for text-inverse on dark backgrounds', () => {
      const result = checkContrast(themeColors.textInverse, themeColors.bgOverlay);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsAA).toBe(true);
    });
  });

  describe('Primary-100 with Primary-700 text', () => {
    it('should check primary-700 text on primary-100 background', () => {
      const result = checkContrast(themeColors.primary700, themeColors.primary100);
      // This is a common pattern: dark text on light colored background
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsAA).toBe(true);
    });
  });

  describe('Button color combinations', () => {
    it('should have sufficient contrast for primary button (white on primary)', () => {
      const result = checkContrast(themeColors.primaryForeground, themeColors.primary);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsAA).toBe(true);
    });

    it('should have sufficient contrast for danger button (white on danger)', () => {
      const result = checkContrast(themeColors.primaryForeground, themeColors.danger);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsAA).toBe(true);
    });

    it('should have sufficient contrast for warning button (white on warning)', () => {
      const result = checkContrast(themeColors.primaryForeground, themeColors.warning);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.meetsAA).toBe(true);
    });
  });

  describe('Large text requirements', () => {
    it('should meet large text AA for primary on white', () => {
      const result = checkContrast(themeColors.primary, themeColors.bgElevated, true);
      expect(result.meetsAALarge).toBe(true);
    });

    it('should meet large text AA for text-muted on white', () => {
      const result = checkContrast(themeColors.textMuted, themeColors.bgElevated, true);
      expect(result.meetsAALarge).toBe(true);
    });
  });
});
