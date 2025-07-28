import { hsla, toHex } from 'color2k';
import Prando from 'prando';

// References:
// - https://pico-8.fandom.com/wiki/Palette
export const palette = {
  basic: {
    light: '#000000',
    dark: '#ffffff',
  },
  blue: {
    light: '#1D2B53',
    dark: '#29ADFF',
  },
  red: {
    light: '#FF3366',
    dark: '#ff999d',
  },
  green: {
    light: '#008751',
    dark: '#00E436',
  },
  yellow: {
    light: '#969600',
    dark: '#fcffa9',
  },
  grey: {
    light: '#5F574F',
    dark: '#C2C3C7',
  },
};

export type PaletteKey = keyof typeof palette;

export const paletteKeys = Object.keys(palette) as Array<PaletteKey>;

export const parseHexColor = (color: string): string | null => {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return color;
  }
  return null;
};

export function generateColor(seed: string, lightnessDelta = 0.0): string {
  const rng = new Prando(seed);
  const h = rng.next(0, 365);
  const s = rng.next();
  const l = rng.next(0.5, 0.8) + lightnessDelta;
  return toHex(hsla(h, s, l, 1)).toUpperCase();
}

export const PALETTE_PREFIX = 'palette:';
export const RANDOM_PREFIX = 'seed:';

export type RandomColor = { type: 'random'; seed: string };
export type PaletteColor = { type: 'palette'; key: PaletteKey };
export type HexColor = { type: 'hex'; color: string };
export type GameColor = RandomColor | PaletteColor | HexColor;
export type ByTheme<T> = { light: T; dark: T };

export const parseColorPart = (color: string): GameColor => {
  if (color.startsWith(PALETTE_PREFIX)) {
    return { type: 'palette', key: color.slice(PALETTE_PREFIX.length) as PaletteKey };
  } else if (color.startsWith(RANDOM_PREFIX)) {
    return { type: 'random', seed: color.slice(RANDOM_PREFIX.length) };
  }
  const hexColor = parseHexColor(color);
  if (hexColor != null) {
    return { type: 'hex', color: hexColor };
  }
  return { type: 'random', seed: '' };
};

export const parseGameColor = (color: string): ByTheme<GameColor> => {
  const colors = color.split(';');
  switch (colors.length) {
    case 0:
      return { dark: { type: 'random', seed: '' }, light: { type: 'random', seed: '' } };
    case 1: {
      const color = parseColorPart(colors[0]!);
      return { dark: color, light: color };
    }
    default:
      return { light: parseColorPart(colors[0]!), dark: parseColorPart(colors[1]!) };
  }
};

const computeColor = (userId: string, color: GameColor, theme: 'light' | 'dark'): string => {
  switch (color.type) {
    case 'hex':
      return color.color.toUpperCase();
    case 'palette':
      return palette[color.key][theme];
    case 'random':
      return generateColor(userId + color.seed, theme === 'light' ? 0.0 : 0.1);
    default:
      return generateColor(userId, theme === 'light' ? 0.0 : 0.1);
  }
};

export const computeColors = (userId: string, colors: ByTheme<GameColor>): ByTheme<string> => {
  return {
    light: computeColor(userId, colors.light, 'light'),
    dark: computeColor(userId, colors.dark, 'dark'),
  };
};
