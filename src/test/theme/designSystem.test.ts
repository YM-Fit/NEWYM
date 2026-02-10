/**
 * Design System Tests
 * Ensures color system consistency across theme.css, themeColors.ts, and Tailwind
 */

import { describe, it, expect } from 'vitest';
import { themeColors } from '@/utils/themeColors';
import { colors, spacing, borderRadius, designClasses } from '../../utils/designTokens';

describe('Design System - Theme Colors', () => {
  it('themeColors exports all required keys', () => {
    const requiredKeys = [
      'primary', 'primaryLight', 'primaryDark', 'chartPrimary', 'chartSecondary',
      'success', 'warning', 'danger', 'info',
      'bgBase', 'bgElevated', 'bgSurface', 'bgCard',
      'textPrimary', 'textSecondary', 'textMuted', 'textInverse',
      'zinc400', 'zinc500', 'zinc600', 'zinc700', 'zinc800', 'zinc900', 'zinc950',
      'chartBlue', 'chartAmber', 'chartRose', 'chartPink', 'chartOrange', 'chartTeal',
    ];
    requiredKeys.forEach((key) => {
      expect(themeColors).toHaveProperty(key);
      expect(themeColors[key as keyof typeof themeColors]).toBeDefined();
    });
  });

  it('all themeColors are valid hex format', () => {
    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    Object.entries(themeColors).forEach(([key, value]) => {
      expect(hexRegex.test(value), `themeColors.${key} must be valid hex`).toBe(true);
    });
  });

  it('primary colors match theme (olive green)', () => {
    expect(themeColors.primary).toBe('#4a6b2a');
    expect(themeColors.primaryLight).toBe('#6b8e4a');
    expect(themeColors.primaryDark).toBe('#3d5a1f');
  });

  it('chart colors use theme-consistent palette', () => {
    expect(themeColors.chartPrimary).toBe(themeColors.primary);
    expect(themeColors.chartSecondary).toBe(themeColors.primaryLight);
  });

  it('background colors are light', () => {
    expect(themeColors.bgBase).toBe('#f0f5ed');
    expect(themeColors.bgElevated).toBe('#ffffff');
    expect(themeColors.bgCard).toBe('#ffffff');
  });

  it('text colors have sufficient contrast', () => {
    // textPrimary on bgBase should be dark
    const textPrimary = themeColors.textPrimary;
    expect(textPrimary).toMatch(/^#[0-9a-fA-F]{6}$/);
    // Basic sanity - primary text should be dark (low hex values)
    const r = parseInt(textPrimary.slice(1, 3), 16);
    const g = parseInt(textPrimary.slice(3, 5), 16);
    const b = parseInt(textPrimary.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    expect(luminance).toBeLessThan(0.4); // Dark text
  });
});

describe('Design System - designTokens', () => {
  it('colors export references CSS variables', () => {
    expect(colors).toHaveProperty('bgBase');
    expect(colors).toHaveProperty('textPrimary');
    expect(colors).toHaveProperty('primary');
  });

  it('colors reference CSS variables', () => {
    expect(colors.bgBase).toContain('var(--color-bg-base)');
    expect(colors.textPrimary).toContain('var(--color-text-primary)');
    expect(colors.primary).toContain('var(--color-primary)');
  });

  it('spacing is defined', () => {
    expect(spacing.xs).toBe('0.5rem');
    expect(spacing.md).toBe('1rem');
  });

  it('borderRadius is defined', () => {
    expect(borderRadius.xs).toBe('0.5rem');
    expect(borderRadius.md).toBe('1rem');
  });

  it('designClasses has Tailwind classes', () => {
    expect(designClasses.text.xs).toBe('text-xs');
    expect(designClasses.text.base).toBe('text-base');
  });
});

describe('Design System - themeColors vs theme.css alignment', () => {
  it('themeColors.primary matches theme.css --color-primary (74 107 42)', () => {
    // 74, 107, 42 in hex = #4a6b2a
    expect(themeColors.primary).toBe('#4a6b2a');
  });

  it('themeColors.danger matches theme.css --color-danger (220 38 38)', () => {
    // 220, 38, 38 = #dc2626
    expect(themeColors.danger).toBe('#dc2626');
  });

  it('themeColors.textPrimary matches theme.css --color-text-primary (17 24 39)', () => {
    // 17, 24, 39 = #111827
    expect(themeColors.textPrimary).toBe('#111827');
  });

  it('themeColors.bgBase matches theme.css --color-bg-base (240 245 237)', () => {
    // 240, 245, 237 = #f0f5ed
    expect(themeColors.bgBase).toBe('#f0f5ed');
  });
});

describe('Design System - Tailwind Aliases', () => {
  it('themeColors includes all tailwind alias colors', () => {
    // These are used as border-border200, bg-surface100 etc.
    expect(themeColors.border).toBeDefined();
    expect(themeColors.muted).toBeDefined();
    expect(themeColors.zinc500).toBeDefined();
  });
});
