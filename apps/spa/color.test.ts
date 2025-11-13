import { describe, expect, test } from '@jest/globals';
import { generateColor, parseColorPart, parseGameColor, parseHexColor } from './color';

describe('Color utilities', () => {
  describe('parseHexColor', () => {
    test('should parse valid hex colors', () => {
      expect(parseHexColor('#000000')).toBe('#000000');
      expect(parseHexColor('#FFFFFF')).toBe('#FFFFFF');
      expect(parseHexColor('#ff0000')).toBe('#ff0000');
      expect(parseHexColor('#AbCdEf')).toBe('#AbCdEf');
    });

    test('should reject invalid hex colors', () => {
      expect(parseHexColor('#000')).toBeNull();
      expect(parseHexColor('#0000000')).toBeNull();
      expect(parseHexColor('000000')).toBeNull();
      expect(parseHexColor('#gggggg')).toBeNull();
      expect(parseHexColor('')).toBeNull();
    });
  });

  describe('generateColor', () => {
    test('should generate consistent colors for the same seed', () => {
      const color1 = generateColor('test-seed');
      const color2 = generateColor('test-seed');
      expect(color1).toBe(color2);
    });

    test('should generate different colors for different seeds', () => {
      const color1 = generateColor('seed1');
      const color2 = generateColor('seed2');
      expect(color1).not.toBe(color2);
    });

    test('should generate valid hex colors', () => {
      const color = generateColor('test');
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    });

    test('should respect lightness delta', () => {
      const colorNormal = generateColor('test', 0);
      const colorBrighter = generateColor('test', 0.1);
      expect(colorNormal).not.toBe(colorBrighter);
    });
  });

  describe('parseColorPart', () => {
    test('should parse palette colors', () => {
      const result = parseColorPart('palette:blue');
      expect(result).toEqual({ type: 'palette', key: 'blue' });
    });

    test('should parse random colors', () => {
      const result = parseColorPart('seed:test-seed');
      expect(result).toEqual({ type: 'random', seed: 'test-seed' });
    });

    test('should parse hex colors', () => {
      const result = parseColorPart('#FF0000');
      expect(result).toEqual({ type: 'hex', color: '#FF0000' });
    });

    test('should default to random with empty seed for invalid input', () => {
      const result = parseColorPart('invalid');
      expect(result).toEqual({ type: 'random', seed: '' });
    });
  });

  describe('parseGameColor', () => {
    test('should parse single color for both themes', () => {
      const result = parseGameColor('#FF0000');
      expect(result).toEqual({
        light: { type: 'hex', color: '#FF0000' },
        dark: { type: 'hex', color: '#FF0000' },
      });
    });

    test('should parse separate light and dark colors', () => {
      const result = parseGameColor('palette:blue;palette:red');
      expect(result).toEqual({
        light: { type: 'palette', key: 'blue' },
        dark: { type: 'palette', key: 'red' },
      });
    });

    test('should handle empty string', () => {
      const result = parseGameColor('');
      expect(result).toEqual({
        light: { type: 'random', seed: '' },
        dark: { type: 'random', seed: '' },
      });
    });

    test('should handle mixed color types', () => {
      const result = parseGameColor('#FF0000;seed:test');
      expect(result).toEqual({
        light: { type: 'hex', color: '#FF0000' },
        dark: { type: 'random', seed: 'test' },
      });
    });
  });
});
