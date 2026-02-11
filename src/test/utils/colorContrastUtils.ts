/**
 * Color Contrast Utilities
 * 
 * Utilities for calculating color contrast ratios and checking WCAG compliance.
 * Based on WCAG 2.1 guidelines for accessibility.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ContrastResult {
  ratio: number;
  meetsAA: boolean;
  meetsAALarge: boolean;
  meetsAAA: boolean;
  meetsAAALarge: boolean;
}

/**
 * Converts RGB values to relative luminance according to WCAG 2.1
 * @param r Red component (0-255)
 * @param g Green component (0-255)
 * @param b Blue component (0-255)
 * @returns Relative luminance (0-1)
 */
export function rgbToLuminance(r: number, g: number, b: number): number {
  // Normalize RGB values to 0-1
  const [rs, gs, bs] = [r, g, b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates contrast ratio between two colors
 * @param color1 First color (RGB)
 * @param color2 Second color (RGB)
 * @returns Contrast ratio (1-21)
 */
export function calculateContrastRatio(color1: RGB, color2: RGB): number {
  const lum1 = rgbToLuminance(color1.r, color1.g, color1.b);
  const lum2 = rgbToLuminance(color2.r, color2.g, color2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Checks if contrast ratio meets WCAG AA standards
 * @param contrastRatio Calculated contrast ratio
 * @param isLargeText Whether the text is large (18px+ or 14px+ bold)
 * @returns Object with compliance information
 */
export function checkWCAGCompliance(contrastRatio: number, isLargeText = false): ContrastResult {
  return {
    ratio: contrastRatio,
    meetsAA: contrastRatio >= 4.5,
    meetsAALarge: contrastRatio >= 3.0,
    meetsAAA: contrastRatio >= 7.0,
    meetsAAALarge: contrastRatio >= 4.5,
  };
}

/**
 * Checks if contrast meets WCAG AA for normal text
 */
export function meetsWCAGAA(contrastRatio: number, isLargeText = false): boolean {
  return isLargeText ? contrastRatio >= 3.0 : contrastRatio >= 4.5;
}

/**
 * Checks if contrast meets WCAG AAA for normal text
 */
export function meetsWCAGAAA(contrastRatio: number, isLargeText = false): boolean {
  return isLargeText ? contrastRatio >= 4.5 : contrastRatio >= 7.0;
}

/**
 * Parses color string to RGB
 * Supports: hex (#fff, #ffffff), rgb/rgba, and CSS variable format
 * @param colorString Color string to parse
 * @returns RGB object or null if parsing fails
 */
export function parseColor(colorString: string): RGB | null {
  if (!colorString) return null;

  const trimmed = colorString.trim();

  // Hex color (#fff or #ffffff)
  const hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    const r = hex.length === 3
      ? parseInt(hex[0] + hex[0], 16)
      : parseInt(hex.substring(0, 2), 16);
    const g = hex.length === 3
      ? parseInt(hex[1] + hex[1], 16)
      : parseInt(hex.substring(2, 4), 16);
    const b = hex.length === 3
      ? parseInt(hex[2] + hex[2], 16)
      : parseInt(hex.substring(4, 6), 16);
    return { r, g, b };
  }

  // RGB/RGBA format: rgb(255, 255, 255) or rgba(255, 255, 255, 0.5)
  const rgbMatch = trimmed.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/i);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }

  // CSS variable format: rgb(var(--color-primary) / 1) or rgb(var(--color-primary))
  const cssVarMatch = trimmed.match(/^rgb\(var\(--[^)]+\)(?:\s*\/\s*[\d.]+)?\)$/i);
  if (cssVarMatch) {
    // For CSS variables, we'd need to resolve them from the DOM
    // This is a placeholder - actual resolution should be done via getComputedColor
    return null;
  }

  // Named colors (basic set)
  const namedColors: Record<string, RGB> = {
    white: { r: 255, g: 255, b: 255 },
    black: { r: 0, g: 0, b: 0 },
    red: { r: 255, g: 0, b: 0 },
    green: { r: 0, g: 128, b: 0 },
    blue: { r: 0, g: 0, b: 255 },
    yellow: { r: 255, g: 255, b: 0 },
    cyan: { r: 0, g: 255, b: 255 },
    magenta: { r: 255, g: 0, b: 255 },
  };

  const lower = trimmed.toLowerCase();
  if (namedColors[lower]) {
    return namedColors[lower];
  }

  return null;
}

/**
 * Gets computed color from a DOM element
 * @param element DOM element
 * @param property CSS property (e.g., 'color', 'background-color')
 * @returns RGB object or null
 */
export function getComputedColor(element: HTMLElement, property: string): RGB | null {
  if (typeof window === 'undefined' || !element) return null;

  const computed = window.getComputedStyle(element);
  const colorValue = computed.getPropertyValue(property) || computed[property as keyof CSSStyleDeclaration];

  if (!colorValue || typeof colorValue !== 'string') return null;

  // Handle rgb/rgba format from computed styles
  const rgbMatch = colorValue.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }

  // Try parsing as other formats
  return parseColor(colorValue);
}

/**
 * Calculates contrast between two color strings
 * @param foreground Foreground color string
 * @param background Background color string
 * @returns Contrast ratio or null if colors can't be parsed
 */
export function getContrastRatio(foreground: string, background: string): number | null {
  const fg = parseColor(foreground);
  const bg = parseColor(background);

  if (!fg || !bg) return null;

  return calculateContrastRatio(fg, bg);
}

/**
 * Checks if a color combination meets WCAG AA standards
 * @param foreground Foreground color string
 * @param background Background color string
 * @param isLargeText Whether text is large
 * @returns Compliance result or null if colors can't be parsed
 */
export function checkColorContrast(
  foreground: string,
  background: string,
  isLargeText = false
): ContrastResult | null {
  const ratio = getContrastRatio(foreground, background);
  if (ratio === null) return null;

  return checkWCAGCompliance(ratio, isLargeText);
}

/**
 * Parses RGB values from space-separated format (used in CSS variables)
 * Example: "74 107 42" -> { r: 74, g: 107, b: 42 }
 */
export function parseSpaceSeparatedRGB(rgbString: string): RGB | null {
  const parts = rgbString.trim().split(/\s+/);
  if (parts.length !== 3) return null;

  const r = parseInt(parts[0], 10);
  const g = parseInt(parts[1], 10);
  const b = parseInt(parts[2], 10);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) return null;

  return { r, g, b };
}
