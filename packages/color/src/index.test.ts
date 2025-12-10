/* eslint-disable @typescript-eslint/no-floating-promises */
import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import {
  computeColors,
  generateColor,
  parseColorPart,
  parseGameColor,
  parseHexColor,
  PALETTE_PREFIX,
  palette,
} from '@boluo/color';

describe('parseHexColor', () => {
  test('parses valid hex colors', () => {
    assert.strictEqual(parseHexColor('#000000'), '#000000');
    assert.strictEqual(parseHexColor('#FFFFFF'), '#FFFFFF');
    assert.strictEqual(parseHexColor('#ff0000'), '#ff0000');
    assert.strictEqual(parseHexColor('#AbCdEf'), '#AbCdEf');
  });

  test('rejects invalid hex colors', () => {
    assert.strictEqual(parseHexColor('#000'), null);
    assert.strictEqual(parseHexColor('#0000000'), null);
    assert.strictEqual(parseHexColor('000000'), null);
    assert.strictEqual(parseHexColor('#gggggg'), null);
    assert.strictEqual(parseHexColor(''), null);
  });
});

describe('generateColor', () => {
  test('is deterministic per seed', () => {
    const color1 = generateColor('test-seed');
    const color2 = generateColor('test-seed');
    assert.strictEqual(color1, color2);
  });

  test('differs for different seeds', () => {
    const color1 = generateColor('seed1');
    const color2 = generateColor('seed2');
    assert.notStrictEqual(color1, color2);
  });

  test('generates valid hex colors', () => {
    const color = generateColor('test');
    assert.match(color, /^#[0-9A-F]{6}$/);
  });

  test('respects lightness delta', () => {
    const colorNormal = generateColor('test', 0);
    const colorBrighter = generateColor('test', 0.1);
    assert.notStrictEqual(colorNormal, colorBrighter);
  });
});

describe('parseColorPart', () => {
  test('parses palette colors', () => {
    const result = parseColorPart('palette:blue');
    assert.deepStrictEqual(result, { type: 'palette', key: 'blue' });
  });

  test('parses random colors', () => {
    const result = parseColorPart('seed:test-seed');
    assert.deepStrictEqual(result, { type: 'random', seed: 'test-seed' });
  });

  test('parses hex colors', () => {
    const result = parseColorPart('#FF0000');
    assert.deepStrictEqual(result, { type: 'hex', color: '#FF0000' });
  });

  test('defaults to random with empty seed for invalid input', () => {
    const result = parseColorPart('invalid');
    assert.deepStrictEqual(result, { type: 'random', seed: '' });
  });
});

describe('parseGameColor', () => {
  test('parses single color for both themes', () => {
    const result = parseGameColor('#FF0000');
    assert.deepStrictEqual(result, {
      light: { type: 'hex', color: '#FF0000' },
      dark: { type: 'hex', color: '#FF0000' },
    });
  });

  test('parses separate light and dark colors', () => {
    const result = parseGameColor('palette:blue;palette:red');
    assert.deepStrictEqual(result, {
      light: { type: 'palette', key: 'blue' },
      dark: { type: 'palette', key: 'red' },
    });
  });

  test('handles empty string', () => {
    const result = parseGameColor('');
    assert.deepStrictEqual(result, {
      light: { type: 'random', seed: '' },
      dark: { type: 'random', seed: '' },
    });
  });

  test('handles mixed color types', () => {
    const result = parseGameColor('#FF0000;seed:test');
    assert.deepStrictEqual(result, {
      light: { type: 'hex', color: '#FF0000' },
      dark: { type: 'random', seed: 'test' },
    });
  });
});

describe('computeColors', () => {
  test('returns palette values per theme', () => {
    const colors = computeColors('uid', {
      light: { type: 'palette', key: 'blue' },
      dark: { type: 'palette', key: 'red' },
    });

    assert.deepStrictEqual(colors, {
      light: palette.blue.light,
      dark: palette.red.dark,
    });
  });

  test('generates uppercase hex for hex input', () => {
    const colors = computeColors('uid', {
      light: { type: 'hex', color: '#ff00aa' },
      dark: { type: 'hex', color: '#00ffbb' },
    });

    assert.deepStrictEqual(colors, {
      light: '#FF00AA',
      dark: '#00FFBB',
    });
  });
});

describe('constants', () => {
  test('palette prefix', () => {
    assert.strictEqual(PALETTE_PREFIX, 'palette:');
  });
});
