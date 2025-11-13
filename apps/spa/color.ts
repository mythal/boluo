import Prando from 'prando';

// Convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  // Normalize h to 0-360 range
  h = h % 360;
  if (h < 0) h += 360;
  h = h / 360;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  if (s === 0) {
    return [l, l, l];
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = hue2rgb(p, q, h + 1 / 3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1 / 3);

  return [r, g, b];
}

// Create HSLA color and convert to hex
function hsla(
  h: number,
  s: number,
  l: number,
  a: number,
): { r: number; g: number; b: number; a: number } {
  const [r, g, b] = hslToRgb(h, s, l);
  return { r, g, b, a };
}

// Convert RGB to hexadecimal string
function toHex(color: { r: number; g: number; b: number; a?: number }): string {
  const toHexByte = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.padStart(2, '0');
  };

  return `#${toHexByte(color.r)}${toHexByte(color.g)}${toHexByte(color.b)}`;
}

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
  const color = hsla(h, s, l, 1);
  return toHex(color).toUpperCase();
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
