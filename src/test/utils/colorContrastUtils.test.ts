import { describe, it, expect } from 'vitest';
import {
  rgbToLuminance,
  calculateContrastRatio,
  checkWCAGCompliance,
  meetsWCAGAA,
  meetsWCAGAAA,
  parseColor,
  getContrastRatio,
  checkColorContrast,
  parseSpaceSeparatedRGB,
  type RGB,
} from './colorContrastUtils';

describe('colorContrastUtils', () => {
  describe('rgbToLuminance', () => {
    it('should calculate luminance for white', () => {
      const luminance = rgbToLuminance(255, 255, 255);
      expect(luminance).toBeCloseTo(1, 2);
    });

    it('should calculate luminance for black', () => {
      const luminance = rgbToLuminance(0, 0, 0);
      expect(luminance).toBeCloseTo(0, 2);
    });

    it('should calculate luminance for gray', () => {
      const luminance = rgbToLuminance(128, 128, 128);
      expect(luminance).toBeGreaterThan(0);
      expect(luminance).toBeLessThan(1);
    });

    it('should calculate luminance for primary color', () => {
      const luminance = rgbToLuminance(74, 107, 42);
      expect(luminance).toBeGreaterThan(0);
      expect(luminance).toBeLessThan(0.5);
    });
  });

  describe('calculateContrastRatio', () => {
    it('should calculate maximum contrast (white on black)', () => {
      const white: RGB = { r: 255, g: 255, b: 255 };
      const black: RGB = { r: 0, g: 0, b: 0 };
      const ratio = calculateContrastRatio(white, black);
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('should calculate minimum contrast (same colors)', () => {
      const color: RGB = { r: 128, g: 128, b: 128 };
      const ratio = calculateContrastRatio(color, color);
      expect(ratio).toBeCloseTo(1, 2);
    });

    it('should calculate contrast for primary on white', () => {
      const primary: RGB = { r: 74, g: 107, b: 42 };
      const white: RGB = { r: 255, g: 255, b: 255 };
      const ratio = calculateContrastRatio(primary, white);
      expect(ratio).toBeGreaterThan(4.5); // Should meet WCAG AA
    });

    it('should be symmetric (order should not matter)', () => {
      const color1: RGB = { r: 74, g: 107, b: 42 };
      const color2: RGB = { r: 255, g: 255, b: 255 };
      const ratio1 = calculateContrastRatio(color1, color2);
      const ratio2 = calculateContrastRatio(color2, color1);
      expect(ratio1).toBeCloseTo(ratio2, 2);
    });
  });

  describe('checkWCAGCompliance', () => {
    it('should identify AA compliance for normal text', () => {
      const result = checkWCAGCompliance(4.5, false);
      expect(result.meetsAA).toBe(true);
      expect(result.meetsAALarge).toBe(true);
    });

    it('should identify AA compliance for large text', () => {
      const result = checkWCAGCompliance(3.0, true);
      expect(result.meetsAA).toBe(false);
      expect(result.meetsAALarge).toBe(true);
    });

    it('should identify AAA compliance', () => {
      const result = checkWCAGCompliance(7.0, false);
      expect(result.meetsAAA).toBe(true);
      expect(result.meetsAAALarge).toBe(true);
    });

    it('should identify non-compliance', () => {
      const result = checkWCAGCompliance(2.0, false);
      expect(result.meetsAA).toBe(false);
      expect(result.meetsAAA).toBe(false);
    });
  });

  describe('meetsWCAGAA', () => {
    it('should return true for normal text with 4.5:1 ratio', () => {
      expect(meetsWCAGAA(4.5, false)).toBe(true);
    });

    it('should return false for normal text with 4.4:1 ratio', () => {
      expect(meetsWCAGAA(4.4, false)).toBe(false);
    });

    it('should return true for large text with 3.0:1 ratio', () => {
      expect(meetsWCAGAA(3.0, true)).toBe(true);
    });

    it('should return false for large text with 2.9:1 ratio', () => {
      expect(meetsWCAGAA(2.9, true)).toBe(false);
    });
  });

  describe('meetsWCAGAAA', () => {
    it('should return true for normal text with 7.0:1 ratio', () => {
      expect(meetsWCAGAAA(7.0, false)).toBe(true);
    });

    it('should return false for normal text with 6.9:1 ratio', () => {
      expect(meetsWCAGAAA(6.9, false)).toBe(false);
    });

    it('should return true for large text with 4.5:1 ratio', () => {
      expect(meetsWCAGAAA(4.5, true)).toBe(true);
    });
  });

  describe('parseColor', () => {
    it('should parse 3-digit hex colors', () => {
      const result = parseColor('#fff');
      expect(result).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('should parse 6-digit hex colors', () => {
      const result = parseColor('#4a6b2a');
      expect(result).toEqual({ r: 74, g: 107, b: 42 });
    });

    it('should parse uppercase hex colors', () => {
      const result = parseColor('#FFFFFF');
      expect(result).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('should parse rgb colors', () => {
      const result = parseColor('rgb(74, 107, 42)');
      expect(result).toEqual({ r: 74, g: 107, b: 42 });
    });

    it('should parse rgba colors', () => {
      const result = parseColor('rgba(74, 107, 42, 0.5)');
      expect(result).toEqual({ r: 74, g: 107, b: 42 });
    });

    it('should parse named colors', () => {
      expect(parseColor('white')).toEqual({ r: 255, g: 255, b: 255 });
      expect(parseColor('black')).toEqual({ r: 0, g: 0, b: 0 });
      expect(parseColor('red')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should return null for invalid colors', () => {
      expect(parseColor('invalid')).toBeNull();
      expect(parseColor('')).toBeNull();
      expect(parseColor('#ggg')).toBeNull();
    });
  });

  describe('parseSpaceSeparatedRGB', () => {
    it('should parse space-separated RGB values', () => {
      const result = parseSpaceSeparatedRGB('74 107 42');
      expect(result).toEqual({ r: 74, g: 107, b: 42 });
    });

    it('should handle multiple spaces', () => {
      const result = parseSpaceSeparatedRGB('74   107    42');
      expect(result).toEqual({ r: 74, g: 107, b: 42 });
    });

    it('should return null for invalid format', () => {
      expect(parseSpaceSeparatedRGB('74,107,42')).toBeNull();
      expect(parseSpaceSeparatedRGB('74 107')).toBeNull();
      expect(parseSpaceSeparatedRGB('74 107 42 255')).toBeNull();
    });

    it('should return null for out of range values', () => {
      expect(parseSpaceSeparatedRGB('300 107 42')).toBeNull();
      expect(parseSpaceSeparatedRGB('74 -10 42')).toBeNull();
    });
  });

  describe('getContrastRatio', () => {
    it('should calculate contrast for hex colors', () => {
      const ratio = getContrastRatio('#000000', '#ffffff');
      expect(ratio).toBeGreaterThan(20);
    });

    it('should calculate contrast for rgb colors', () => {
      const ratio = getContrastRatio('rgb(0, 0, 0)', 'rgb(255, 255, 255)');
      expect(ratio).toBeGreaterThan(20);
    });

    it('should return null for invalid colors', () => {
      expect(getContrastRatio('invalid', '#ffffff')).toBeNull();
      expect(getContrastRatio('#ffffff', 'invalid')).toBeNull();
    });
  });

  describe('checkColorContrast', () => {
    it('should check contrast and return compliance info', () => {
      const result = checkColorContrast('#000000', '#ffffff', false);
      expect(result).not.toBeNull();
      expect(result?.meetsAA).toBe(true);
      expect(result?.meetsAAA).toBe(true);
    });

    it('should handle large text requirements', () => {
      const result = checkColorContrast('#4a6b2a', '#ffffff', true);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.meetsAALarge).toBe(true);
      }
    });

    it('should return null for invalid colors', () => {
      expect(checkColorContrast('invalid', '#ffffff', false)).toBeNull();
    });
  });
});
